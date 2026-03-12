// import { auth } from "@unitime/auth";
import { AppEnv } from "@/types/app-env";
import { cache } from "@unitime/cache";
import { Ratelimit } from "@upstash/ratelimit";
import { Context, Next } from "hono";

// ---------------------------------------------------------------------------
// Header helpers
// ---------------------------------------------------------------------------

const getClientIp = (c: Context): string | undefined =>
  c.req.header("cf-connecting-ip") ||
  c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
  c.req.header("x-real-ip") ||
  c.req.raw.headers.get("cf-connecting-ip") ||
  c.req.raw.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  c.req.raw.headers.get("x-real-ip") ||
  undefined;

const getUserAgent = (c: Context): string | undefined =>
  c.req.header("user-agent") ||
  c.req.raw.headers.get("user-agent") ||
  undefined;

/**
 * Stable per-device identifier sent by the mobile client.
 * See apps/mobile/lib/device.id.ts for how it is generated.
 * Falls back to undefined when absent (e.g. non-mobile callers).
 */
const getDeviceId = (c: Context): string | undefined =>
  c.req.header("x-device-id") ||
  c.req.raw.headers.get("x-device-id") ||
  undefined;

// ---------------------------------------------------------------------------
// Rate limit windows / thresholds
// ---------------------------------------------------------------------------

const IS_PROD = process.env.NODE_ENV === "production";

/**
 * Helper to read positive integers from env with sane defaults.
 */
const envInt = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/**
 * Global catch-all limiter — applied to every route that isn't a polling
 * or check-in route.
 */
const globalLimit = envInt("RATE_LIMIT_GLOBAL", IS_PROD ? 100 : 200);

/**
 * Polling limiter — applied to read-heavy data routes that the app polls
 * on every foreground-restore (timetable, attendance, users, …).
 */
const pollingLimit = envInt("RATE_LIMIT_POLLING", IS_PROD ? 300 : 500);

/**
 * Check-in limiter — very tight; prevents attendance check-in abuse.
 */
const checkinLimit = envInt("RATE_LIMIT_CHECKIN", 5);

/**
 * Auth-flow limiter — generous dedicated bucket for the login / signup /
 * user-lookup calls that happen BEFORE the client has a JWT.  These requests
 * are keyed by device ID (or IP as last resort), so they must not share a
 * bucket with the regular per-user global limiter.
 *
 * 30 attempts per device per 5 min is more than enough for any legitimate
 * login flow while still blocking credential-stuffing.
 */
const authFlowLimit = envInt("RATE_LIMIT_AUTH_FLOW", IS_PROD ? 30 : 100);

// ---------------------------------------------------------------------------
// Limiter instances
// ---------------------------------------------------------------------------

const ratelimit = {
  global: new Ratelimit({
    redis: cache,
    analytics: true,
    enableProtection: true,
    prefix: "@unitime/ratelimit:global",
    limiter: Ratelimit.slidingWindow(globalLimit, "5m"),
  }),
  polling: new Ratelimit({
    redis: cache,
    analytics: true,
    enableProtection: true,
    prefix: "@unitime/ratelimit:polling",
    limiter: Ratelimit.slidingWindow(pollingLimit, "5m"),
  }),
  checkin: new Ratelimit({
    redis: cache,
    analytics: true,
    enableProtection: true,
    prefix: "@unitime/ratelimit:checkin",
    limiter: Ratelimit.slidingWindow(checkinLimit, "1m"),
  }),
  authFlow: new Ratelimit({
    redis: cache,
    analytics: true,
    enableProtection: true,
    prefix: "@unitime/ratelimit:auth-flow",
    limiter: Ratelimit.slidingWindow(authFlowLimit, "5m"),
  }),
};

// ---------------------------------------------------------------------------
// Route classification helpers
// ---------------------------------------------------------------------------

/**
 * Routes that are part of the login / signup flow.
 *
 * These fire BEFORE the client has a JWT, so they will never have a userId
 * and must be handled with the dedicated authFlow limiter (keyed by device ID
 * or IP) rather than the global limiter.
 *
 * Exact paths only — we don't want to accidentally exempt entire subtrees.
 */
const AUTH_FLOW_ROUTES: string[] = ["/v1/users/create"];

const isAuthFlowRoute = (path: string): boolean => {
  // Exact match
  if (AUTH_FLOW_ROUTES.includes(path)) return true;
  // GET /v1/users?email=... — user lookup during login / session restore
  if (path === "/v1/users" || path.startsWith("/v1/users?")) return true;
  return false;
};

const POLLING_ROUTE_PREFIXES: string[] = [
  "/v1/timetable",
  "/v1/attendance",
  "/v1/users",
  "/v1/courses",
  "/v1/orgs",
  "/v1/profiles",
  "/v1/dashboard",
  "/v1/notifications",
  "/v1/history",
];

const isPollingRoute = (path: string): boolean =>
  POLLING_ROUTE_PREFIXES.some((prefix) => path.startsWith(prefix));

const isCheckinRoute = (path: string): boolean =>
  path.endsWith("/attendance/checkin");

// ---------------------------------------------------------------------------
// Key resolution
// ---------------------------------------------------------------------------

/**
 * Build the best available rate-limit key for a request.
 *
 * Priority (most → least stable / unique):
 *  1. Authenticated user ID  — 1:1 with an account, ideal key.
 *  2. Device ID header       — stable per installation even before login.
 *  3. IP address             — last resort; shared on campus NAT but still
 *                              better than a global "anonymous" bucket.
 *
 * We intentionally never fall back to a bare "anonymous" string because that
 * would put EVERY user without an IP into the same bucket and instantly
 * exhaust the limit for all of them simultaneously.
 *
 * Returns `null` when we genuinely cannot produce any identifier. The caller
 * should let those requests through rather than block everyone.
 */
const resolveKey = (
  userId: string | undefined,
  deviceId: string | undefined,
  ip: string | undefined,
  forceDeviceKey: boolean = false,
): string | null => {
  // Auth-flow routes bypass userId so they use their own bucket even when
  // the user happens to already be authenticated (e.g. re-login after expiry).
  if (!forceDeviceKey && userId) {
    return `user:${userId}`;
  }

  // Device ID is the most reliable anonymous identifier — it is a UUID
  // generated once per device install and sent on every request.
  if (deviceId) {
    return `device:${deviceId}`;
  }

  // IP is the last resort.  On campus NAT this is shared, but it is still
  // significantly better than a single global bucket.
  if (ip) {
    return `ip:${ip}`;
  }

  // We have nothing useful.  Return null so the caller can decide.
  return null;
};

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export const rateLimitHandler = async (c: Context<AppEnv>, next: Next) => {
  const user = c.get("user");
  const requesterId = c.get("requesterId");
  const userId = requesterId || user?.$id;

  const ip = getClientIp(c);
  const userAgent = getUserAgent(c);
  const deviceId = getDeviceId(c);
  const path = c.req.path;

  // ------------------------------------------------------------------
  // 1. Determine which limiter and key to use.
  // ------------------------------------------------------------------

  let limiter: Ratelimit;
  let key: string | null;

  if (isCheckinRoute(path)) {
    // Check-in: always per-user, fall back to device, then IP.
    limiter = ratelimit.checkin;
    key = resolveKey(userId, deviceId, ip);
  } else if (isAuthFlowRoute(path)) {
    // Auth-flow routes get their own generous bucket keyed by device / IP.
    // We intentionally do NOT use userId here even when present so that
    // auth-related traffic never depletes the user's global quota.
    limiter = ratelimit.authFlow;
    key = resolveKey(undefined, deviceId, ip, true);
  } else if (isPollingRoute(path)) {
    limiter = ratelimit.polling;
    key = resolveKey(userId, deviceId, ip);
  } else {
    limiter = ratelimit.global;
    key = resolveKey(userId, deviceId, ip);
  }

  // ------------------------------------------------------------------
  // 2. If we could not build any key, let the request through.
  //    It is better to allow an unidentifiable request than to silently
  //    block all users who happen to share a degenerate identifier.
  // ------------------------------------------------------------------
  if (!key) {
    console.warn(
      `[RateLimit] No identifier available for ${c.req.method} ${path} — allowing through.`,
    );
    return await next();
  }

  console.log(
    `[RateLimit] key="${key}" limiter=${isCheckinRoute(path) ? "checkin" : isAuthFlowRoute(path) ? "authFlow" : isPollingRoute(path) ? "polling" : "global"} path=${path}`,
  );

  // ------------------------------------------------------------------
  // 3. Apply the limit.
  // ------------------------------------------------------------------
  const result = await limiter.limit(key, {
    ip,
    userAgent,
  });
  await result.pending;

  // Upstash Ratelimit commonly returns limit/remaining/reset; use them when present.
  type LimitResultLike = {
    success: boolean;
    pending: Promise<void>;
    limit?: number;
    remaining?: number;
    reset?: number; // epoch seconds or ms, depending on provider
    reason?: string;
    deniedValue?: unknown;
  };
  const lr = result as unknown as LimitResultLike;
  const success = lr.success;
  const reason = lr.reason;
  const deniedValue = lr.deniedValue;
  const limitVal = lr.limit;
  const remainingVal = lr.remaining;
  const resetVal = lr.reset; // epoch (s/ms) or delta

  console.log(
    `[RateLimit] success=${success} reason=${reason ?? "-"} deniedValue=${deniedValue ?? "-"}`,
  );

  if (!success) {
    // Best‑effort standard headers for clients to back off gracefully.
    // RateLimit-Reset expects delta-seconds. Compute when we have a numeric reset.
    let retryAfterSec: number | undefined;
    if (typeof resetVal === "number") {
      // Heuristic: treat values < 1e12 as epoch seconds; else milliseconds.
      const resetMs = resetVal < 1e12 ? resetVal * 1000 : resetVal;
      const delta = Math.ceil((resetMs - Date.now()) / 1000);
      if (Number.isFinite(delta) && delta > 0) retryAfterSec = delta;
    }

    if (typeof limitVal === "number")
      c.header("RateLimit-Limit", String(limitVal));
    if (typeof remainingVal === "number")
      c.header("RateLimit-Remaining", String(Math.max(0, remainingVal)));
    if (typeof retryAfterSec === "number") {
      c.header("RateLimit-Reset", String(retryAfterSec));
      c.header("Retry-After", String(retryAfterSec));
    }

    return c.json(
      {
        message: "Too many requests. Please slow down and try again shortly.",
        status_code: 429,
      },
      429,
    );
  }

  return await next();
};

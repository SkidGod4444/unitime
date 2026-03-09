// import { auth } from "@unitime/auth";
import { cache } from "@unitime/cache";
import { Ratelimit } from "@upstash/ratelimit";
import { Context, Next } from "hono";

const getClientIp = (c: Context) =>
  c.req.header("x-forwarded-for") ||
  c.req.header("x-real-ip") ||
  c.req.raw.headers.get("x-forwarded-for") ||
  c.req.raw.headers.get("x-real-ip") ||
  c.req.raw.headers.get("cf-connecting-ip") ||
  undefined;

const getUserAgent = (c: Context) =>
  c.req.header("user-agent") ||
  c.req.raw.headers.get("user-agent") ||
  undefined;

const globalLimit = process.env.NODE_ENV === "production" ? 60 : 100;
const pollingLimit = process.env.NODE_ENV === "production" ? 300 : 500;
const checkinLimit = 5; // Very strict limit for attendance check-ins

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
};

export const rateLimitHandler = async (c: Context, next: Next) => {
  // Try to get user from context (set by auth middleware if enabled)
  const me = c.get("user") as { $id?: string } | null | undefined;
  console.log(`Ratelimiting user: ${me?.$id || "anonymous"}`);
  const ip = getClientIp(c);
  const userAgent = getUserAgent(c);

  // Determine rate limit context
  const path = c.req.path;
  const isPollingRoute = [
    "/v1/timetable",
    "/v1/attendance",
    "/v1/users",
    "/v1/courses",
    "/v1/orgs",
    "/v1/profiles",
  ].some((r) => path.startsWith(r));

  const isCheckinRoute = path.endsWith("/attendance/checkin");

  let key: string | undefined;
  let limiter: Ratelimit;

  if (me && me.$id) {
    key = me.$id || ip || userAgent || "anonymous";
  } else {
    // fallback for completely anonymous users
    key = ip || userAgent || "anonymous";
  }

  if (isCheckinRoute) {
    limiter = ratelimit.checkin;
  } else if (isPollingRoute) {
    limiter = ratelimit.polling;
  } else {
    limiter = ratelimit.global;
  }

  // Apply rate limit
  const { success, pending, reason, deniedValue } = await limiter.limit(key!, {
    ip,
    userAgent,
  });
  await pending; // Await analytics if enabled

  // Optionally log for debugging
  console.log("RATELIMIT HANDLER: ", success, reason, deniedValue);

  if (!success) {
    return c.json({ message: "You hit the rate limit", status_code: 429 }, 429);
  }
  return await next();
};

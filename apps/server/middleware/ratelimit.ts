import { auth } from "@unitime/auth";
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

const getRatelimitInstance = (limit: number) => ({
  free: new Ratelimit({
    redis: cache,
    analytics: true,
    enableProtection: true,
    prefix: "@unitime/ratelimit:free",
    limiter: Ratelimit.slidingWindow(limit, "5m"),
  }),
//   pro: new Ratelimit({
//     redis: cache,
//     analytics: true,
//     enableProtection: true,
//     prefix: "@unitime/ratelimit:pro",
//     limiter: Ratelimit.slidingWindow(limit, "10s"),
//   }),
});

export const rateLimitHandler = async (c: Context, next: Next) => {
  // let auth = getAuth(c);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  console.log(`Ratelimiting user: ${session?.user?.id || "anonymous"}`);
  const ip = getClientIp(c);
  const userAgent = getUserAgent(c);

  const limit = Bun.env.NODE_ENV === "production" ? 60 : 100;
  const ratelimit = getRatelimitInstance(limit);

  // Determine rate limit context
  let key: string | undefined;
  let limiter: Ratelimit | undefined;

  if (session?.user && session.user.id) {
    key = session.user.id || ip || userAgent || "anonymous";
    limiter = ratelimit.free;
  } else {
    // fallback for completely anonymous users
    key = ip || userAgent || "anonymous";
    limiter = ratelimit.free;
  }

  // Apply rate limit
  const { success, pending, reason, deniedValue } = await limiter.limit(key, {
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
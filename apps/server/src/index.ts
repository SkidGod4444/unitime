import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { handle } from "hono/vercel";
import attendance from "./routes/attendance";
import courses from "./routes/courses";
import history from "./routes/history";
import notifications from "./routes/notifications";
import timetable from "./routes/timetable";
import users from "./routes/users";
// import { auth } from "@unitime/auth";
import { rateLimitHandler } from "../middleware/ratelimit";
// import { authMiddleware } from "../middleware/check.auth";

export const runtime = "edge";
const app = new Hono().basePath("/v1");

app.use(logger());
// app.use(authMiddleware);
app.use(rateLimitHandler);

// Allow localhost and local network IPs for mobile development
const isAllowedOrigin = (origin: string): boolean => {
  const allowedPatterns = [
    "http://localhost:3000",
    /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d+$/,
    /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/,
  ];
  return allowedPatterns.some((pattern) =>
    typeof pattern === "string" ? pattern === origin : pattern.test(origin),
  );
};

app.use(
  "*",
  cors({
    origin: (origin) => (isAllowedOrigin(origin) ? origin : ""),
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS", "PUT"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  }),
);

app.route("/users", users);
app.route("/attendance", attendance);
app.route("/history", history);
app.route("/notifications", notifications);
app.route("/timetable", timetable);
app.route("/courses", courses);

// For Vercel deployment - this MUST be the default export
// Vercel reads the default export as the handler function
const handler = handle(app);
export default handler;

// Named method exports for Vercel edge (belt-and-suspenders)
export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const DELETE = handler;
export const PUT = handler;

// For local development with Bun - only runs when executed directly via Bun
// This does NOT affect the Vercel deployment
if (typeof Bun !== "undefined" && import.meta.main) {
  const port = process.env.PORT || 3001;
  Bun.serve({
    port,
    fetch: app.fetch,
  });
  console.log(`Server running on http://localhost:${port}`);
}

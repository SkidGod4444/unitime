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
import { auth } from "@unitime/auth";
import { rateLimitHandler } from "../middleware/ratelimit";

export const runtime = "edge";
const app = new Hono().basePath("/v1");

app.use(logger());
app.use(rateLimitHandler);

// Allow localhost and local network IPs for mobile development
const isAllowedOrigin = (origin: string): boolean => {
  const allowedPatterns = [
    "http://localhost:3000",
    /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d+$/,
    /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/,
  ];
  return allowedPatterns.some((pattern) =>
    typeof pattern === "string" ? pattern === origin : pattern.test(origin)
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

app.all("/auth/**", async (c) => {
  return await auth.handler(c.req.raw);
});

app.route("/users", users);
app.route("/attendance", attendance);
app.route("/history", history);
app.route("/notifications", notifications);
app.route("/timetable", timetable);
app.route("/courses", courses);

// For local development with Bun
const port = process.env.PORT || 3001;

// Bun-specific server export
export default {
  port,
  fetch: app.fetch,
};

// For Vercel deployment - named export
export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
export const PUT = handle(app);

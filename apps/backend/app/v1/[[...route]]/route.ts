import { rateLimitHandler } from "@/middleware/ratelimit";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { handle } from "hono/vercel";
import admin from "./routes/admin";
import alarms from "./routes/alarms";
import attendance from "./routes/attendance";
import chats from "./routes/chats";
import courses from "./routes/courses";
import dashboard from "./routes/dashboard";
import history from "./routes/history";
import notifications from "./routes/notifications";
import orgs from "./routes/org";
import profile from "./routes/profile";
import timetable from "./routes/timetable";
import users from "./routes/users";

export const runtime = "nodejs";

const app = new Hono().basePath("/v1");

// app.use(logger());
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

app.route("/dashboard", dashboard);
app.route("/users", users);
app.route("/attendance", attendance);
app.route("/history", history);
app.route("/notifications", notifications);
app.route("/timetable", timetable);
app.route("/courses", courses);
app.route("/chats", chats);
app.route("/profiles", profile);
app.route("/orgs", orgs);
app.route("/admin", admin);
app.route("/alarms", alarms);

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
export const OPTIONS = handle(app);

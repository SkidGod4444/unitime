import { rateLimitHandler } from "@/middleware/ratelimit";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { authMiddleware } from "@/middleware/check.auth";
import { handle } from "hono/vercel";
import type { AppEnv } from "@/types/app-env";
import admin from "./routes/admin";
import alarms from "./routes/alarms";
import attendance from "./routes/attendance";
import chats from "./routes/chats";
import courses from "./routes/courses";
import dashboard from "./routes/dashboard";
import download from "./routes/download";
import history from "./routes/history";
import notifications from "./routes/notifications";
import orgs from "./routes/org";
import profile from "./routes/profile";
import timetable from "./routes/timetable";
import users from "./routes/users";
import labGroups from "./routes/lab-groups";
import feedbacks from "./routes/feedbacks";
import tickets from "./routes/tickets";

export const runtime = "nodejs";

const app = new Hono<AppEnv>().basePath("/v1");

// app.use(logger());
app.use(authMiddleware);
app.use(rateLimitHandler);

// Configurable CORS allowlist (comma-separated origins or regex patterns starting with ^)
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin: string | null): boolean => {
  if (!origin) return false;
  return ALLOWED_ORIGINS.some((pattern) =>
    pattern.startsWith("^")
      ? new RegExp(pattern).test(origin)
      : pattern === origin,
  );
};

app.use(
  "*",
  cors({
    origin: (origin) => (isAllowedOrigin(origin ?? null) ? origin : undefined),
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
app.route("/download", download);
app.route("/lab-groups", labGroups);
app.route("/feedbacks", feedbacks);
app.route("/tickets", tickets);

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
export const OPTIONS = handle(app);

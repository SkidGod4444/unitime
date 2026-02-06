import { Hono } from "hono";
import { cors } from "hono/cors";
import { handle } from "hono/vercel";
import { logger } from "hono/logger";
import attendance from "../src/routes/attendance";
import courses from "../src/routes/courses";
import history from "../src/routes/history";
import notifications from "../src/routes/notifications";
import timetable from "../src/routes/timetable";
import users from "../src/routes/users";

export const runtime = "edge";
const app = new Hono().basePath("/v1");
app.use(logger());
const allowedOrigins = ["http://localhost:3000"];

app.use(
  "*",
  cors({
    origin: allowedOrigins,
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

import { Hono } from "hono";

const attendance = new Hono();

attendance.get("/", (c) => {
  return c.json({
    message: "Attendance route",
  });
});

export default attendance;

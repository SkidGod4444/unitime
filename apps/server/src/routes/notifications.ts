import { Hono } from "hono";

const notifications = new Hono();

notifications.get("/", (c) => {
  return c.json({
    message: "Notifications route",
  });
});

export default notifications;

import { Hono } from "hono";

const chats = new Hono();

chats.get("/", (c) => {
  return c.json({
    message: "Chats route",
  });
});

export default chats;

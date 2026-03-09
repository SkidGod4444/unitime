import { requireAuth } from "@/middleware/check.auth";
import type { AppEnv } from "@/types/app-env";
import { Hono } from "hono";

const chats = new Hono<AppEnv>();
chats.use("*", requireAuth);

chats.get("/", (c) => {
  return c.json({
    message: "Chats route",
  });
});

export default chats;

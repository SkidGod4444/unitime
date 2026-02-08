import { auth } from "@unitime/auth";
import { Hono } from "hono";

const authRoutes = new Hono();

// Handle all auth-related requests
authRoutes.all("*", async (c) => {
  return await auth.handler(c.req.raw);
});

export default authRoutes;

import { Hono } from "hono";
import { auth } from "@unitime/auth";

const authRoutes = new Hono();

authRoutes.on(["POST", "GET"], "/auth/*", (c) => {
	return auth.handler(c.req.raw);
});

export default authRoutes;

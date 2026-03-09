// Account access should be request-scoped via auth middleware; use context user instead
import { createHonoErrorResponse, ERROR_CODES } from "@/lib/error.codes";
import type { AppEnv } from "@/types/app-env";
import { getOrSetCache, invalidateCache } from "@unitime/cache";
import { prisma } from "@unitime/db";
import { Hono } from "hono";
import { z } from "zod";

const users = new Hono<AppEnv>();

users.get("/me", async (c) => {
  try {
    const me = c.get("user");
    if (!me?.email) {
      return createHonoErrorResponse(c, ERROR_CODES.TOKEN_MISSING);
    }
    const user = await getOrSetCache(
      `user:${me.email}`,
      () => prisma.user.findUnique({ where: { email: me.email! } }),
      120,
    );

    if (!user) {
      return createHonoErrorResponse(c, ERROR_CODES.RECORD_NOT_FOUND);
    }

    return c.json(
      {
        success: true,
        status_code: 200,
        user,
      },
      200,
    );
  } catch (error) {
    console.error("Error fetching user details:", error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

users.get("/all", async (c) => {
  try {
    const users = await getOrSetCache(
      "users:all",
      () => prisma.user.findMany(),
      120,
    );

    if (users.length === 0) {
      return createHonoErrorResponse(c, ERROR_CODES.RECORD_NOT_FOUND);
    }

    return c.json(
      {
        success: true,
        status_code: 200,
        users,
      },
      200,
    );
  } catch (error) {
    console.error("Error fetching users:", error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

users.get("/", async (c) => {
  const email = c.req.query("email");
  if (!email) {
    return createHonoErrorResponse(c, ERROR_CODES.RECORD_NOT_FOUND);
  }
  const user = await getOrSetCache(
    `user:${email}`,
    () => prisma.user.findUnique({ where: { email } }),
    120,
  );
  if (!user) {
    return createHonoErrorResponse(c, ERROR_CODES.RECORD_NOT_FOUND);
  }
  return c.json(
    {
      success: true,
      status_code: 200,
      user,
    },
    200,
  );
});

users.get("/:id", async (c) => {
  const id = c.req.param("id");
  const user = await getOrSetCache(
    `user:${id}`,
    () => prisma.user.findUnique({ where: { id } }),
    120,
  );
  if (!user) {
    return createHonoErrorResponse(c, ERROR_CODES.RECORD_NOT_FOUND);
  }
  return c.json(
    {
      success: true,
      status_code: 200,
      user,
    },
    200,
  );
});

users.put("/:id/update", async (c) => {
  const id = c.req.param("id");
  const schema = z.object({
    name: z.string().min(1).optional(),
    image: z.string().url().optional(),
    expoPushToken: z.string().optional(),
    coordinates: z.string().optional(),
  });

  let parsed: z.infer<typeof schema>;
  try {
    parsed = schema.parse(await c.req.json());
  } catch {
    return createHonoErrorResponse(c, ERROR_CODES.INVALID_INPUT);
  }

  const user = await prisma.user.update({
    where: { id },
    data: parsed,
  });
  if (!user) {
    return createHonoErrorResponse(c, ERROR_CODES.RECORD_NOT_FOUND);
  }
  await invalidateCache("users:all", `user:${id}`, `user:${user.email}`);
  return c.json(
    {
      success: true,
      status_code: 200,
      user,
    },
    200,
  );
});

users.patch("/:id/onboard", async (c) => {
  const id = c.req.param("id");
  const user = await prisma.user.update({
    where: { id },
    data: { isOnboarded: true },
  });
  if (!user) {
    return createHonoErrorResponse(c, ERROR_CODES.RECORD_NOT_FOUND);
  }
  await invalidateCache("users:all", `user:${id}`, `user:${user.email}`);
  return c.json(
    {
      success: true,
      status_code: 200,
      user,
    },
    200,
  );
});

users.post("/create", async (c) => {
  try {
    const body = await c.req.json<{
      id: string;
      name: string;
      email: string;
    }>();
    const { id, name, email } = body;

    if (!id || !name || !email) {
      return createHonoErrorResponse(c, ERROR_CODES.RECORD_NOT_FOUND);
    }

    // Upsert: create only if not already present (idempotent)
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { id, name, email },
    });

    await invalidateCache("users:all", `user:${id}`, `user:${email}`);

    return c.json(
      {
        success: true,
        status_code: 201,
        user,
      },
      201,
    );
  } catch (error) {
    console.error("Error creating user:", error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

export default users;

import { account } from "@/lib/auth";
import { getDynamicCacheTag } from "@/lib/cache";
import { createHonoErrorResponse, ERROR_CODES } from "@/lib/error.codes";
import { prisma } from "@unitime/db";
import { Hono } from "hono";

const users = new Hono();

users.get("/me", async (c) => {
  try {
    const me = await account.get();
    const user = await prisma.user.findUnique({
      where: { email: me.email },
      cacheStrategy: {
        ttl: 60,
        tags: [getDynamicCacheTag("findUnique_user", me.email)],
      },
    });

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
    const users = await prisma.user.findMany({
      cacheStrategy: {
        ttl: 60,
        tags: ["findMany_users"], 
      },
    });

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
  const user = await prisma.user.findUnique({
    where: { email },
    cacheStrategy: {
      ttl: 60,
      tags: [getDynamicCacheTag("findUnique_user", email)],
    },
  });
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
  const user = prisma.user.findUnique({
    where: { id },
    cacheStrategy: {
      ttl: 60,
      tags: [getDynamicCacheTag("findUnique_user", id)],
    },
  });
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
  const body = await c.req.json();
  const user = await prisma.user.update({
    where: { id },
    data: body,
  });
  if (!user) {
    return createHonoErrorResponse(c, ERROR_CODES.RECORD_NOT_FOUND);
  }
  await prisma.$accelerate.invalidate({
    tags: ["findMany_users", getDynamicCacheTag("findUnique_user", id)], 
  }); 
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
  await prisma.$accelerate.invalidate({
    tags: ["findMany_users", getDynamicCacheTag("findUnique_user", id)],
  });
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

    await prisma.$accelerate.invalidate({
      tags: ["findMany_users", getDynamicCacheTag("findUnique_user", id), getDynamicCacheTag("findUnique_user", email)],
    });

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

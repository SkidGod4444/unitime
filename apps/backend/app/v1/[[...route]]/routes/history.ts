import { ERROR_CODES, createHonoErrorResponse } from "@/lib/error.codes";
import { requireAuth } from "@/middleware/check.auth";
import type { AppEnv } from "@/types/app-env";
import { getOrSetCache, invalidateCache } from "@unitime/cache";
import { prisma } from "@unitime/db";
import { Hono } from "hono";

const history = new Hono<AppEnv>();
history.use("*", requireAuth);

// Get history logs for a user (personal + organizational)
history.get("/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");

    // Fetch user's organizationId
    const studentProfile = await getOrSetCache(
      `profile:student:${userId}`,
      async () => {
        return await prisma.studentProfile.findUnique({
          where: { userId },
          select: { organizationId: true },
        });
      },
      3600,
    );

    const organizationId = studentProfile?.organizationId;

    const query = {
      where: {
        OR: [{ userId }, ...(organizationId ? [{ organizationId }] : [])],
      },
      // Cast to satisfy Prisma orderBy explicit literal structure when using objects inline without Prisma.Query helper
      orderBy: { createdAt: "desc" as const },
    };

    const logs = await getOrSetCache(
      `history:${userId}`,
      async () => {
        return await prisma.historyLog.findMany(query);
      },
      300, // 5 minutes cache
    );

    return c.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error("Error fetching history:", error);
    return c.json(
      { success: false, error: "Failed to fetch history" },
      { status: 500 },
    );
  }
});

history.post("/", async (c) => {
  const { userId, organizationId, title, description, type } = await c.req.json();

  if (!userId || !title || !description || !type) {
    return createHonoErrorResponse(c, ERROR_CODES.MISSING_REQUIRED_FIELD);
  }

  try {
    const log = await prisma.historyLog.create({
      data: {
        userId,
        organizationId: organizationId || null,
        title,
        description,
        type, // "SYSTEM" or "ATTENDANCE"
      },
    });

    if (!log.id) {
      return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
    }

    await invalidateCache(`history:${userId}`);

    return c.json(
      {
        success: true,
        status_code: 201,
        log,
      },
      201
    );
  } catch (error) {
    console.error("Error creating history log:", error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

export default history;

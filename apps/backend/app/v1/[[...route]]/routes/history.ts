import { requireAuth } from "@/middleware/check.auth";
import type { AppEnv } from "@/types/app-env";
import { getOrSetCache } from "@unitime/cache";
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

export default history;

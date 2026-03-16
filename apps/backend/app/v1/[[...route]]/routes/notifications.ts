import { ERROR_CODES, createHonoErrorResponse } from "@/lib/error.codes";
import { requireAuth } from "@/middleware/check.auth";
import type { AppEnv } from "@/types/app-env";
import { getOrSetCache, invalidateCache } from "@unitime/cache";
import { prisma } from "@unitime/db";
import { Hono } from "hono";
import { sendPushNotification } from "@/lib/expo.notifications";

const notifications = new Hono<AppEnv>();

notifications.use("*", requireAuth);

notifications.post("/", async (c) => {
  const { userId, organizationId, title, body, type, actionUrl } =
    await c.req.json();

  if ((!userId && !organizationId) || !title || !body || !type) {
    return createHonoErrorResponse(c, ERROR_CODES.MISSING_REQUIRED_FIELD);
  }

  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        organizationId: organizationId || null,
        title,
        body,
        type, // "SYSTEM" or "ATTENDANCE"
        actionUrl: actionUrl || null,
      },
    });

    if (!notification.id) {
      return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
    }

    if (userId) {
      await invalidateCache(`notifications:${userId}`);

      // Fetch user to get push token
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { expoPushToken: true },
      });

      if (user?.expoPushToken) {
        await sendPushNotification([user.expoPushToken], title, body);
      }
    }

    return c.json(
      {
        success: true,
        status_code: 201,
        notification,
      },
      201,
    );
  } catch (error) {
    console.error("Error creating notification:", error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

notifications.get("/:userId", async (c) => {
  const userId = c.req.param("userId");

  try {
    const notificationsList = await getOrSetCache(
      `notifications:${userId}`,
      () =>
        prisma.notification.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
      120,
    );

    return c.json(
      {
        success: true,
        status_code: 200,
        notifications: notificationsList,
      },
      200,
    );
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

export default notifications;

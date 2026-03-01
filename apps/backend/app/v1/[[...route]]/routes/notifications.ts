import { getOrSetCache, invalidateCache } from "@unitime/cache";
import { prisma } from "@unitime/db";
import { Hono } from "hono";

const notifications = new Hono();

// Get notifications for a user (personal + organizational)
notifications.get("/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");

    // We must find the user's organizationId first to fetch org-wide notifications as well
    const studentProfile = await getOrSetCache(
      `profile:student:${userId}`,
      async () => {
        return await prisma.studentProfile.findUnique({
          where: { userId },
          select: { organizationId: true },
        });
      },
      3600
    );

    const organizationId = studentProfile?.organizationId;

    const query = {
      where: {
        OR: [
          { userId },
          ...(organizationId ? [{ organizationId }] : []),
        ],
      },
      orderBy: { createdAt: "desc" as const },
    };

    const notifs = await getOrSetCache(
        `notifications:${userId}`,
        async () => {
             return await prisma.notification.findMany(query);
        },
        300 // 5 minutes cache
    );

    return c.json({
      success: true,
      data: notifs,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return c.json(
      { success: false, error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
});

// Mark single notification as read
notifications.put("/:id/read", async (c) => {
  try {
    const id = c.req.param("id");
    const { userId } = await c.req.json(); // Require userId in body to add to readBy

    if (!userId) {
       return c.json({ success: false, error: "User ID is required" }, { status: 400 });
    }

    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) {
       return c.json({ success: false, error: "Notification not found" }, { status: 404 });
    }

    if (!notification.readBy.includes(userId)) {
        await prisma.notification.update({
          where: { id },
          data: {
            readBy: {
              push: userId,
            },
          },
        });
        
        // Invalidate the cache for this user
        await invalidateCache(`notifications:${userId}`);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating notification status:", error);
    return c.json(
      { success: false, error: "Failed to update notification" },
      { status: 500 }
    );
  }
});

// Mark all unread notifications as read for a user
notifications.put("/user/:userId/read-all", async (c) => {
  try {
    const userId = c.req.param("userId");

    const studentProfile = await getOrSetCache(
      `profile:student:${userId}`,
      async () => {
        return await prisma.studentProfile.findUnique({
          where: { userId },
          select: { organizationId: true },
        });
      },
      3600
    );

    const organizationId = studentProfile?.organizationId;

    // We fetch all unread notifications for this user (both personal AND org-wide)
    // where 'readBy' array does not contain the userId
    // Note: Prisma does not have a native 'NOT IN ARRAY' string filter in where clause,
    // so we must fetch and filter, then do a manual bulk update or loop
    const allNotifications = await prisma.notification.findMany({
      where: {
        OR: [
          { userId },
          ...(organizationId ? [{ organizationId }] : []),
        ],
      },
    });

    const unreadIds = allNotifications
        .filter((n: { id: string; readBy: string[] }) => !n.readBy.includes(userId))
        .map((n: { id: string; readBy: string[] }) => n.id);

    if (unreadIds.length > 0) {
        // Update them one by one to push userId into readBy (due to Prisma limitations with bulk array append)
        await Promise.all(
            unreadIds.map((id: string) => 
                prisma.notification.update({
                    where: { id },
                    data: { readBy: { push: userId } }
                })
            )
        );
        
        await invalidateCache(`notifications:${userId}`);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return c.json(
      { success: false, error: "Failed to update notifications" },
      { status: 500 }
    );
  }
});

// Create a new notification
notifications.post("/", async (c) => {
  try {
    const { title, body, type, userId, organizationId, actionUrl } = await c.req.json();

    if (!title || !body || !type) {
      return c.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const notification = await prisma.notification.create({
      data: {
        title,
        body,
        type,
        userId: userId || null,
        organizationId: organizationId || null,
        actionUrl: actionUrl || null,
      },
    });

    return c.json({ success: true, notification }, { status: 201 });
  } catch (error) {
    console.error("Error creating notification:", error);
    return c.json(
      { success: false, error: "Failed to create notification" },
      { status: 500 }
    );
  }
});

export default notifications;

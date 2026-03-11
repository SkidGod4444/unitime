import { createHonoErrorResponse, ERROR_CODES } from "@/lib/error.codes";
import { requireAuth } from "@/middleware/check.auth";
import type { AppEnv } from "@/types/app-env";
import { getOrSetCache } from "@unitime/cache";
import { prisma } from "@unitime/db";
import { Hono } from "hono";

const dashboard = new Hono<AppEnv>();
dashboard.use("*", requireAuth);

dashboard.get("/:userId", async (c) => {
  const userId = c.req.param("userId");

  try {
    const userProfile = await prisma.user.findUnique({
      where: { id: userId },
      select: { studentProfile: { select: { organizationId: true, labGroupId: true } } },
    });
    
    if (!userProfile) return createHonoErrorResponse(c, ERROR_CODES.RECORD_NOT_FOUND);
    const orgId = userProfile.studentProfile?.organizationId || "global";
    const myLabGroupId = userProfile.studentProfile?.labGroupId;

    const dashboardData = await getOrSetCache(
      `dashboard:${userId}:${orgId}`,
      async () => {
        const user = (await prisma.user.findUnique({
          where: { id: userId },
          include: {
            courses: {
              where: { status: "APPROVED" },
              include: { course: true },
            },
          },
        })) as unknown as { 
          id: string; 
          name: string; 
          role: "STUDENT" | "PROFESSOR" | "ADMIN"; 
          courses: Array<{ course: unknown }>;
        };

        if (!user) return null;

        const now = new Date();
        const todayStr = now.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
        
        const timetable = await prisma.timetable.findMany({
          where: {
            day: todayStr as "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY",
            course: {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              users: { some: { userId: user.id, status: "APPROVED" as any } },
            },
            OR: [
              { labGroupId: null },
              { labGroupId: myLabGroupId || undefined },
            ],
          },
          include: { course: true },
          orderBy: { startTime: "asc" },
        });

        const logsCount = await prisma.attendanceLogs.count({ where: { userId: user.id } });
        const lastLog = await prisma.attendanceLogs.findFirst({
          where: { userId: user.id },
          orderBy: { markedAt: "desc" },
        });

        const activeSessions = await prisma.attendanceQRSession.findMany({
          where: {
            status: "ACTIVE",
            endTime: { gte: now },
            course: {
              users: { some: { userId: user.id, status: "APPROVED" as any } },
            },
            OR: [
              { labGroupId: null },
              { labGroupId: myLabGroupId || undefined },
            ],
          },
          include: { course: true },
        });

        // Background: expire stale sessions
        const staleThreshold = new Date(now.getTime() - 5 * 60_000);
        prisma.attendanceQRSession.updateMany({
          where: { status: "ACTIVE", endTime: { lt: staleThreshold } },
          data: { status: "INACTIVE" },
        }).catch(() => {});

        return {
          user: { id: user.id, name: user.name, role: user.role },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          courses: (user.courses || []).map((uc: { course: any }) => uc.course),
          timetable,
          summary: {
            totalMarked: logsCount,
            lastMarkedAt: lastLog?.markedAt || null,
          },
          activeSessions: activeSessions.filter((s) => !s.markedUsers.includes(user.id)),
        };
      },
      300
    );

    return c.json({ success: true, data: dashboardData });
  } catch (error) {
    console.error(error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

dashboard.get("/:userId/bundle", async (c) => {
  const userId = c.req.param("userId");

  try {
    const payload = await getOrSetCache(
      `dashboard:bundle:${userId}`,
      async () => {
        const userRaw = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            studentProfile: true,
            courses: {
              where: { status: "APPROVED" },
              include: { course: true },
            },
          },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const user = userRaw as any;

        if (!user) return null;
        const myLabGroupId = user.studentProfile?.labGroupId;
        const orgId = user.studentProfile?.organizationId;

        const now = new Date();
        const todayStr = now.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();

        const timetable = await prisma.timetable.findMany({
          where: {
            day: todayStr as "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY",
            course: { users: { some: { userId: user.id, status: "APPROVED" as any } } },
            OR: [{ labGroupId: null }, { labGroupId: myLabGroupId || undefined }],
          },
          include: { course: true },
          orderBy: { startTime: "asc" },
        });

        const activeSessionsRaw = await prisma.attendanceQRSession.findMany({
          where: {
            status: "ACTIVE",
            endTime: { gte: new Date(now.getTime() - 120_000) },
            course: { users: { some: { userId: user.id, status: "APPROVED" as any } } },
            OR: [{ labGroupId: null }, { labGroupId: myLabGroupId || undefined }],
          },
          include: { course: true },
          orderBy: { createdAt: "desc" },
        });

        const activeSessions = activeSessionsRaw.filter((s) => !s.markedUsers.includes(user.id));

        const notifications = await prisma.notification.findMany({
          where: {
            OR: [{ userId }, ...(orgId ? [{ organizationId: orgId }] : [])],
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        });

        const history = await prisma.historyLog.findMany({
          where: {
            OR: [{ userId }, ...(orgId ? [{ organizationId: orgId }] : [])],
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        });

        return {
          user: { id: user.id, name: user.name, role: user.role },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          courses: (user.courses || []).map((uc: { course: any }) => uc.course),
          timetable,
          activeSessions,
          notifications: { items: notifications, unreadCount: notifications.filter((n) => !n.readBy.includes(userId)).length },
          history,
        };
      },
      120
    );

    return c.json({ success: true, data: payload });
  } catch (error) {
    console.error(error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

export default dashboard;

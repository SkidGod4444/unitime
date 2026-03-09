import { createHonoErrorResponse, ERROR_CODES } from "@/lib/error.codes";
import { requireAuth } from "@/middleware/check.auth";
import type { AppEnv } from "@/types/app-env";
import { getOrSetCache } from "@unitime/cache";
import type { UserRole } from "@unitime/db";
import { prisma } from "@unitime/db";
import { Hono } from "hono";

const dashboard = new Hono<AppEnv>();
dashboard.use("*", requireAuth);

interface UserWithProfile {
  id: string;
  name: string;
  role: UserRole; 
  studentProfile: {
    labGroupId: string | null;
    organizationId: string | null;
  } | null;
}

dashboard.get("/:userId", async (c) => {
  const userId = c.req.param("userId");

  try {
    const dashboardData = await getOrSetCache(
      `dashboard:${userId}`,
      async () => {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            studentProfile: true, // often needed
            courses: {
              where: { status: "APPROVED" },
              include: { course: true },
            },
          },
        });

        if (!user) return null;

        // Fetch Timetable active for today roughly
        const todayStr = new Date()
          .toLocaleDateString("en-US", { weekday: "long" })
          .toUpperCase();
        const timetable = await prisma.timetable.findMany({
          where: {
            day: todayStr as
              | "MONDAY"
              | "TUESDAY"
              | "WEDNESDAY"
              | "THURSDAY"
              | "FRIDAY"
              | "SATURDAY"
              | "SUNDAY",
            course: {
              users: { some: { userId: user.id, status: "APPROVED" } },
            },
          },
          include: { course: true },
          orderBy: { startTime: "asc" },
        });

        // Compute attendance summary fast approximation for dashboard
        const logs = await prisma.attendanceLogs.findMany({
          where: { userId: user.id },
        });
        const summary = {
          totalMarked: logs.length,
          lastMarkedAt: logs.length > 0 ? logs[logs.length - 1].markedAt : null,
        };

        // Get currently active sessions for enrolled courses where endTime hasn't passed yet
        // Exclude ones where the user has ALREADY marked attendance
        const now = new Date();
        const rawActiveSessions = await prisma.attendanceQRSession.findMany({
          where: {
            status: "ACTIVE",
            endTime: { gte: new Date(now.getTime() - 120_000) }, // allow 2 min grace
            course: {
              users: { some: { userId: user.id, status: "APPROVED" } },
            },
            OR: [
              { labGroupId: null },
              { labGroupId: (user as unknown as UserWithProfile).studentProfile?.labGroupId || undefined },
            ],
          },
          include: {
            course: true,
          },
        });

        // Only return sessions that the user hasn't checked into yet
        const activeSessions = rawActiveSessions.filter(
          (session) => !session.markedUsers.includes(user.id),
        );

        // Background: auto-expire sessions whose endTime has long passed (> 5 min ago)
        // so future cache misses don't keep seeing stale ACTIVE sessions
        const staleThreshold = new Date(now.getTime() - 5 * 60_000);
        prisma.attendanceQRSession
          .updateMany({
            where: { status: "ACTIVE", endTime: { lt: staleThreshold } },
            data: { status: "INACTIVE" },
          })
          .catch(() => {});

        return {
          user: { id: user.id, name: user.name, role: user.role },
          courses:
            (
              user as unknown as { courses?: { course: unknown }[] }
            ).courses?.map((uc) => uc.course) || [],
          timetable,
          summary,
          activeSessions,
        };
      },
      300, // TTL of 300 seconds (5 minutes) Cache-First pattern
    );

    if (!dashboardData) {
      return createHonoErrorResponse(c, ERROR_CODES.RECORD_NOT_FOUND);
    }

    return c.json(
      {
        success: true,
        status_code: 200,
        data: dashboardData,
      },
      200,
    );
  } catch (error) {
    console.error("Dashboard fetch error:", error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

// Bundle endpoint to reduce round trips for the mobile home/landing flows
dashboard.get("/:userId/bundle", async (c) => {
  const userId = c.req.param("userId");

  try {
    const payload = await getOrSetCache(
      `dashboard:bundle:${userId}`,
      async () => {
        // 1) User + enrolled courses (approved only)
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            studentProfile: true,
            courses: {
              where: { status: "APPROVED" },
              include: { course: true },
            },
          },
        });

        if (!user) return null;

        const userWithCourses = user as unknown as {
          courses: {
            course: {
              id: string;
              code: string;
              name: string;
              credit: number;
              classType: unknown;
              organizationId: string | null;
            };
          }[];
        };

        const minimalCourses = (userWithCourses.courses || []).map((uc) => ({
          id: uc.course.id,
          code: uc.course.code,
          name: uc.course.name,
          credit: uc.course.credit,
          classType: uc.course.classType,
          organizationId: uc.course.organizationId,
        }));

        const myLabGroupId =
          (user as unknown as UserWithProfile).studentProfile?.labGroupId || undefined;

        // 2) Today timetable entries for the user
        const todayStr = new Date()
          .toLocaleDateString("en-US", { weekday: "long" })
          .toUpperCase();
        const timetable = await prisma.timetable.findMany({
          where: {
            day: todayStr as
              | "MONDAY"
              | "TUESDAY"
              | "WEDNESDAY"
              | "THURSDAY"
              | "FRIDAY"
              | "SATURDAY"
              | "SUNDAY",
            course: {
              users: { some: { userId: user.id, status: "APPROVED" } },
            },
          },
          include: { course: true },
          orderBy: { startTime: "asc" },
        });

        // 3) Attendance summary (reuse logic from attendance summary route)
        const enrollments = await prisma.userCourse.findMany({
          where: { userId },
          include: { course: true },
        });

        const attendanceSummary = await Promise.all(
          enrollments.map(async (enrollment) => {
            const courseId = enrollment.courseId;

            const totalSessions = await prisma.attendanceQRSession.count({
              where: { courseId },
            });

            const sessionIds = (
              await prisma.attendanceQRSession.findMany({
                where: { courseId },
                select: { id: true },
              })
            ).map((s) => s.id);

            const attendedSessions = await prisma.attendanceLogs.count({
              where: { userId, sessionId: { in: sessionIds } },
            });

            const percentage =
              totalSessions === 0
                ? 100
                : Math.round((attendedSessions / totalSessions) * 100);

            return {
              courseId,
              courseName: enrollment.course.name,
              courseCode: enrollment.course.code,
              classType: enrollment.course.classType,
              attended: attendedSessions,
              total: totalSessions,
              percentage,
            };
          }),
        );

        // 4) Active sessions the user hasn't checked into yet, and that haven't expired
        const now2 = new Date();
        const rawActiveSessions = await prisma.attendanceQRSession.findMany({
          where: {
            status: "ACTIVE",
            endTime: { gte: new Date(now2.getTime() - 120_000) }, // 2 min grace
            course: {
              users: { some: { userId: user.id, status: "APPROVED" } },
            },
            OR: [
              { labGroupId: null },
              { labGroupId: myLabGroupId },
            ],
          },
          include: { course: true },
          orderBy: { createdAt: "desc" },
        });
        const activeSessions = rawActiveSessions.filter(
          (s) => !s.markedUsers.includes(user.id),
        );

        // Background: auto-expire stale ACTIVE sessions (> 5 min past endTime)
        const staleThreshold2 = new Date(now2.getTime() - 5 * 60_000);
        prisma.attendanceQRSession
          .updateMany({
            where: { status: "ACTIVE", endTime: { lt: staleThreshold2 } },
            data: { status: "INACTIVE" },
          })
          .catch(() => {});

        // 5) Notifications (personal + org), last 10 + unreadCount
        const studentProfile = await prisma.studentProfile.findUnique({
          where: { userId },
          select: { organizationId: true },
        });
        const organizationId = studentProfile?.organizationId || undefined;

        const notifications = await prisma.notification.findMany({
          where: {
            OR: [{ userId }, ...(organizationId ? [{ organizationId }] : [])],
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        });

        // compute unread across all in taken window (consistent with current approach)
        const unreadCount = notifications.filter(
          (n) => !n.readBy.includes(userId),
        ).length;

        // 6) History: last 10 personal + org
        const history = await prisma.historyLog.findMany({
          where: {
            OR: [{ userId }, ...(organizationId ? [{ organizationId }] : [])],
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        });

        return {
          user: { id: user.id, name: user.name, role: user.role },
          courses: minimalCourses,
          timetable,
          attendanceSummary,
          activeSessions,
          notifications: { items: notifications, unreadCount },
          history,
        } as const;
      },
      120,
    );

    if (!payload) {
      return createHonoErrorResponse(c, ERROR_CODES.RECORD_NOT_FOUND);
    }

    return c.json({ success: true, status_code: 200, data: payload }, 200);
  } catch (error) {
    console.error("Dashboard bundle error:", error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

export default dashboard;

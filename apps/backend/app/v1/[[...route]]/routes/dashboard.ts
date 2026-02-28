import { createHonoErrorResponse, ERROR_CODES } from "@/lib/error.codes";
import { getOrSetCache } from "@unitime/cache";
import { prisma } from "@unitime/db";
import { Hono } from "hono";

const dashboard = new Hono();

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
              include: { course: true }
            }
          }
        });

        if (!user) return null;

        // Fetch Timetable active for today roughly
        const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
        const timetable = await prisma.timetable.findMany({
          where: {
            day: todayStr as "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY",
            course: {
              users: { some: { userId: user.id, status: "APPROVED" } }
            }
          },
          include: { course: true },
          orderBy: { startTime: 'asc' }
        });

        // Compute attendance summary fast approximation for dashboard
        const logs = await prisma.attendanceLogs.findMany({
          where: { userId: user.id }
        });
        const summary = {
          totalMarked: logs.length,
          lastMarkedAt: logs.length > 0 ? logs[logs.length - 1].markedAt : null
        };

        // Get currently active sessions for enrolled courses
        // Exclude ones where the user has ALREADY marked attendance
        const rawActiveSessions = await prisma.attendanceQRSession.findMany({
          where: {
            status: "ACTIVE",
            course: {
              users: { some: { userId: user.id, status: "APPROVED" } }
            }
          },
          include: { 
            course: true
          }
        });

        // Only return sessions that the user hasn't checked into yet
        const activeSessions = rawActiveSessions.filter(session => !session.markedUsers.includes(user.id));

        return {
          user: { id: user.id, name: user.name, role: user.role },
          courses: (user as any).courses?.map((uc: any) => uc.course) || [],
          timetable,
          summary,
          activeSessions
        };
      },
      300 // TTL of 300 seconds (5 minutes) Cache-First pattern
    );

    if (!dashboardData) {
      return createHonoErrorResponse(c, ERROR_CODES.RECORD_NOT_FOUND);
    }

    return c.json({
      success: true,
      status_code: 200,
      data: dashboardData
    }, 200);

  } catch (error) {
    console.error("Dashboard fetch error:", error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

export default dashboard;

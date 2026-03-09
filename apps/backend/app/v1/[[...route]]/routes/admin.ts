import { createHonoErrorResponse, ERROR_CODES } from "@/lib/error.codes";
import { requireRole } from "@/middleware/check.auth";
import type { AppEnv } from "@/types/app-env";
import { getCacheMetrics, getOrSetCache, invalidateCache } from "@unitime/cache";
import { prisma } from "@unitime/db";
import { Hono } from "hono";

const admin = new Hono<AppEnv>();
// Only ADMINs can access anything under /admin
admin.use("*", requireRole("ADMIN"));

admin.patch("/users/:id/role", async (c) => {
  const id = c.req.param("id");
  let body: { role: "ADMIN" | "PROFESSOR" | "REPRESENTATIVE" | "STUDENT" };

  try {
    body = await c.req.json();
    if (!body.role) {
      return createHonoErrorResponse(c, ERROR_CODES.INVALID_INPUT);
    }
  } catch {
    return createHonoErrorResponse(c, ERROR_CODES.INVALID_INPUT);
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { role: body.role },
    });

    await invalidateCache("users:all", `user:${id}`);

    return c.json({
      success: true,
      status_code: 200,
      user,
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

admin.patch("/users/:id/status", async (c) => {
  const id = c.req.param("id");
  let body: { status: "ACTIVE" | "INACTIVE" };

  try {
    body = await c.req.json();
    if (!body.status) {
      return createHonoErrorResponse(c, ERROR_CODES.INVALID_INPUT);
    }
  } catch {
    return createHonoErrorResponse(c, ERROR_CODES.INVALID_INPUT);
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { status: body.status },
    });

    await invalidateCache("users:all", `user:${id}`);

    return c.json({
      success: true,
      status_code: 200,
      user,
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

admin.patch("/users/:id/ban", async (c) => {
  const id = c.req.param("id");
  let body: { banned: boolean; banReason?: string };

  try {
    body = await c.req.json();
    if (typeof body.banned !== "boolean") {
      return createHonoErrorResponse(c, ERROR_CODES.INVALID_INPUT);
    }
  } catch {
    return createHonoErrorResponse(c, ERROR_CODES.INVALID_INPUT);
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        banned: body.banned,
        banReason: body.banned ? body.banReason : null,
      },
    });

    await invalidateCache("users:all", `user:${id}`, `user:${user.email}`);

    return c.json({
      success: true,
      status_code: 200,
      user,
    });
  } catch (error) {
    console.error("Error updating user ban status:", error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

admin.get("/enrollments/pending", async (c) => {
  const organizationId = c.req.query("organizationId");

  try {
    const enrollments = await prisma.userCourse.findMany({
      where: {
        status: "PENDING",
        ...(organizationId ? { course: { organizationId } } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            studentProfile: {
              select: {
                admissionNumber: true,
              },
            },
          },
        },
        course: {
          select: {
            id: true,
            name: true,
            code: true,
            organization: {
              select: {
                departmentName: true,
                courseName: true,
                section: true,
              },
            },
          },
        },
      },
      orderBy: {
        enrolledAt: "desc",
      },
    });

    return c.json({
      success: true,
      status_code: 200,
      enrollments,
    });
  } catch (error) {
    console.error("Error fetching pending enrollments:", error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

admin.patch("/enrollments/:id/status", async (c) => {
  const enrollmentId = c.req.param("id");
  let body: { status: "APPROVED" | "REJECTED" };

  try {
    body = await c.req.json();
    if (!body.status || !["APPROVED", "REJECTED"].includes(body.status)) {
      return createHonoErrorResponse(c, ERROR_CODES.INVALID_INPUT);
    }
  } catch {
    return createHonoErrorResponse(c, ERROR_CODES.INVALID_INPUT);
  }

  try {
    const enrollment = await prisma.userCourse.update({
      where: { id: enrollmentId },
      data: { status: body.status },
    });

    await invalidateCache(
      `course:${enrollment.courseId}`,
      "courses:all",
      "enrollments:pending",
    );

    return c.json({
      success: true,
      status_code: 200,
      enrollment,
    });
  } catch (error) {
    console.error("Error updating enrollment status:", error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

admin.get("/stats", async (c) => {
  try {
    const statsPayload = await getOrSetCache(
      "system:admin:stats",
      async () => {
        const [
          users,
          studentProfiles,
          organizations,
          courses,
          labGroups,
          attendanceSessions,
          feedbacks,
          tickets,
          cacheMetrics,
          dbSizeRes,
          connectionStates,
        ] = await Promise.all([
          prisma.user.count(),
          prisma.studentProfile.count(),
          prisma.organization.count(),
          prisma.courses.count(),
          prisma.labGroup.count(),
          prisma.attendanceQRSession.count(),
          prisma.feedback.count(),
          prisma.supportTicket.count(),
          getCacheMetrics(),
          // Getting raw db metrics
          prisma.$queryRaw<{pg_size_pretty: string}[]>`SELECT pg_size_pretty(pg_database_size(current_database()));`.catch(() => [{ pg_size_pretty: "0 KB" }]),
          prisma.$queryRaw<{state: string, count: number}[]>`SELECT state, count(*)::int FROM pg_stat_activity GROUP BY state;`.catch(() => []),
        ]);

        // Parse the connection states
        let activeConnections = 0;
        let idleConnections = 0;
        
        connectionStates.forEach((row) => {
          if (row.state === "active") activeConnections += row.count;
          else if (row.state === "idle") idleConnections += row.count;
        });

        return {
          users,
          studentProfiles,
          organizations,
          courses,
          labGroups,
          attendanceSessions,
          feedbacks,
          tickets,
          cacheMetrics,
          dbMetrics: { 
            size: dbSizeRes[0]?.pg_size_pretty || "0 KB",
            activeConnections,
            idleConnections,
          },
        };
      },
      120 // 2 minutes TTL
    );

    return c.json({
      success: true,
      status_code: 200,
      stats: statsPayload,
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

export default admin;

import { createHonoErrorResponse, ERROR_CODES } from "@/lib/error.codes";
import { requireRole } from "@/middleware/check.auth";
import type { AppEnv } from "@/types/app-env";
import { invalidateCache } from "@unitime/cache";
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

    await invalidateCache("users:all", `user:${id}`);

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
              }
            }
          }
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
                section: true
              }
            }
          }
        }
      },
      orderBy: {
        enrolledAt: "desc"
      }
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

    await invalidateCache(`course:${enrollment.courseId}`, "courses:all", "enrollments:pending");

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

export default admin;

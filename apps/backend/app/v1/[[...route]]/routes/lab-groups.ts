import { createHonoErrorResponse, ERROR_CODES, RESOURCE_ERRORS } from "@/lib/error.codes";
import { requireRole } from "@/middleware/check.auth";
import type { AppEnv } from "@/types/app-env";
import { getOrSetCache, invalidateCache } from "@unitime/cache";
import { prisma } from "@unitime/db";
import { Hono } from "hono";
import { joinLabGroupSchema } from "@/lib/validation";

const labGroups = new Hono<AppEnv>();

// Delete a lab group if it has no members — ADMIN/REPRESENTATIVE
labGroups.delete("/:id", requireRole("ADMIN", "REPRESENTATIVE"), async (c) => {
  const groupId = c.req.param("id");

  try {
    const group = await prisma.labGroup.findUnique({ where: { id: groupId } });
    if (!group) return createHonoErrorResponse(c, ERROR_CODES.RECORD_NOT_FOUND);

    const membersCount = await prisma.studentLabGroup.count({ where: { labGroupId: groupId } });
    if (membersCount > 0) {
      return createHonoErrorResponse(c, RESOURCE_ERRORS.CONFLICT, "Cannot delete a group with active members");
    }

    await prisma.labGroup.delete({ where: { id: groupId } });

    await invalidateCache(`labGroups:course:${group.courseId}`, `labGroupMembers:${groupId}`);

    return c.json({ success: true, status_code: 200, message: "Lab group deleted" });
  } catch (error) {
    console.error("Error deleting lab group:", error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

// Student joins (or switches to) a lab group for a course — STUDENT
labGroups.post("/:groupId/join", requireRole("STUDENT"), async (c) => {
  const groupId = c.req.param("groupId");
  const requesterId = c.get("requesterId");
  if (!requesterId) return createHonoErrorResponse(c, ERROR_CODES.TOKEN_MISSING);

  const parsed = joinLabGroupSchema.safeParse(await c.req.json());
  if (!parsed.success) return createHonoErrorResponse(c, ERROR_CODES.INVALID_INPUT);
  const { courseId } = parsed.data;

  try {
    const [course, group] = await Promise.all([
      prisma.courses.findUnique({ where: { id: courseId } }),
      prisma.labGroup.findUnique({ where: { id: groupId } }),
    ]);

    if (!course || !group) return createHonoErrorResponse(c, ERROR_CODES.RECORD_NOT_FOUND);
    if (course.classType !== "LAB") {
      return createHonoErrorResponse(c, ERROR_CODES.INVALID_INPUT, "Only LAB courses support lab groups");
    }
    if (group.courseId !== courseId) {
      return createHonoErrorResponse(c, ERROR_CODES.INVALID_INPUT, "Group does not belong to the specified course");
    }

    // Student must belong to course (at least PENDING)
    const enrollment = await prisma.userCourse.findUnique({
      where: { userId_courseId: { userId: requesterId, courseId } },
    });
    if (!enrollment) {
      return createHonoErrorResponse(c, ERROR_CODES.UNAUTHORIZED, "You are not enrolled in this course");
    }

    // Upsert mapping (allow switching groups)
    const mapping = await prisma.studentLabGroup.upsert({
      where: { studentId_courseId: { studentId: requesterId, courseId } },
      update: { labGroupId: groupId },
      create: { studentId: requesterId, courseId, labGroupId: groupId },
    });

    await invalidateCache(`studentGroup:${requesterId}:${courseId}`, `labGroupMembers:${groupId}`);
    return c.json({ success: true, status_code: 200, mapping });
  } catch (error) {
    console.error("Error joining lab group:", error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

// View members — ADMIN/REPRESENTATIVE/PROFESSOR
labGroups.get("/:groupId/members", requireRole("ADMIN", "REPRESENTATIVE", "PROFESSOR"), async (c) => {
  const groupId = c.req.param("groupId");
  try {
    const members = await getOrSetCache(
      `labGroupMembers:${groupId}`,
      () =>
        prisma.studentLabGroup.findMany({
          where: { labGroupId: groupId },
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true,
                studentProfile: true,
              },
            },
          },
        }),
      120,
    );

    return c.json({
      success: true,
      status_code: 200,
      members: members.map((m) => ({
        id: m.studentId,
        name: m.student.name,
        email: m.student.email,
        studentProfile: m.student.studentProfile,
        joinedAt: m.joinedAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching lab group members:", error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

export default labGroups;


import { createHonoErrorResponse, ERROR_CODES, RESOURCE_ERRORS } from "@/lib/error.codes";
import { requireRole } from "@/middleware/check.auth";
import type { AppEnv } from "@/types/app-env";
import { getOrSetCache, invalidateCache } from "@unitime/cache";
import { prisma } from "@unitime/db";
import { Hono } from "hono";

const labGroups = new Hono<AppEnv>();

// ---------------------------------------------------------------------------
// GET /lab-groups?courseId=xxx — list all groups for a course
// ---------------------------------------------------------------------------
labGroups.get("/", async (c) => {
  const courseId = c.req.query("courseId");
  if (!courseId) return createHonoErrorResponse(c, ERROR_CODES.INVALID_INPUT, "courseId is required");

  try {
    const groups = await getOrSetCache(
      `labGroups:course:${courseId}`,
      () =>
        prisma.labGroup.findMany({
          where: { courseId },
          select: { id: true, name: true, courseId: true, createdAt: true },
          orderBy: { name: "asc" },
        }),
      120,
    );

    return c.json({ success: true, status_code: 200, groups });
  } catch (error) {
    console.error("Error fetching lab groups:", error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

// ---------------------------------------------------------------------------
// POST /lab-groups — create a lab group for a course (ADMIN/REPRESENTATIVE)
// ---------------------------------------------------------------------------
labGroups.post("/", requireRole("ADMIN", "REPRESENTATIVE"), async (c) => {
  const requesterId = c.get("requesterId");
  if (!requesterId) return createHonoErrorResponse(c, ERROR_CODES.TOKEN_MISSING);

  const body = await c.req.json();
  const { name, courseId } = body;

  if (!name || !courseId) {
    return createHonoErrorResponse(c, ERROR_CODES.INVALID_INPUT, "name and courseId are required");
  }

  try {
    const course = await prisma.courses.findUnique({ where: { id: courseId } });
    if (!course) return createHonoErrorResponse(c, ERROR_CODES.RECORD_NOT_FOUND, "Course not found");

    const group = await prisma.labGroup.create({
      data: { name, courseId, createdBy: requesterId },
    });

    await invalidateCache(`labGroups:course:${courseId}`);

    return c.json({ success: true, status_code: 201, group }, 201);
  } catch (error) {
    console.error("Error creating lab group:", error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

// ---------------------------------------------------------------------------
// DELETE /lab-groups/:id — delete an empty group (ADMIN/REPRESENTATIVE)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// POST /lab-groups/:groupId/join — student joins (or switches) their global lab group
// ---------------------------------------------------------------------------
labGroups.post("/:groupId/join", requireRole("STUDENT"), async (c) => {
  const groupId = c.req.param("groupId");
  const requesterId = c.get("requesterId");
  if (!requesterId) return createHonoErrorResponse(c, ERROR_CODES.TOKEN_MISSING);

  try {
    const group = await prisma.labGroup.findUnique({ where: { id: groupId } });
    if (!group) return createHonoErrorResponse(c, ERROR_CODES.RECORD_NOT_FOUND, "Lab group not found");

    // Upsert: student has one lab group per course — allow switching
    const mapping = await prisma.studentLabGroup.upsert({
      where: { 
        studentId_courseId: {
          studentId: requesterId,
          courseId: group.courseId
        }
      },
      update: { labGroupId: groupId },
      create: { 
        studentId: requesterId, 
        courseId: group.courseId,
        labGroupId: groupId 
      },
    });

    await invalidateCache(`studentGroup:${requesterId}`, `labGroupMembers:${groupId}`);
    return c.json({ success: true, status_code: 200, mapping });
  } catch (error) {
    console.error("Error joining lab group:", error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

// ---------------------------------------------------------------------------
// GET /lab-groups/:groupId/members — view members (ADMIN/REPRESENTATIVE/PROFESSOR)
// ---------------------------------------------------------------------------
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
              select: { id: true, name: true, email: true, studentProfile: true },
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

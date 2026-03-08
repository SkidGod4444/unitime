import { createHonoErrorResponse, ERROR_CODES, RESOURCE_ERRORS } from "@/lib/error.codes";
import { requireRole } from "@/middleware/check.auth";
import type { AppEnv } from "@/types/app-env";
import { getOrSetCache, invalidateCache } from "@unitime/cache";
import { prisma } from "@unitime/db";
import { Hono } from "hono";

const labGroups = new Hono<AppEnv>();

// ---------------------------------------------------------------------------
// GET /lab-groups?organizationId=xxx — list all groups for an org (public within auth)
// ---------------------------------------------------------------------------
labGroups.get("/", async (c) => {
  const organizationId = c.req.query("organizationId");
  if (!organizationId) return createHonoErrorResponse(c, ERROR_CODES.INVALID_INPUT, "organizationId is required");

  try {
    const groups = await getOrSetCache(
      `labGroups:org:${organizationId}`,
      () =>
        prisma.labGroup.findMany({
          where: { organizationId },
          select: { id: true, name: true, organizationId: true, createdAt: true },
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
// POST /lab-groups — create a lab group for an org (ADMIN/REPRESENTATIVE)
// ---------------------------------------------------------------------------
labGroups.post("/", requireRole("ADMIN", "REPRESENTATIVE"), async (c) => {
  const requesterId = c.get("requesterId");
  if (!requesterId) return createHonoErrorResponse(c, ERROR_CODES.TOKEN_MISSING);

  const body = await c.req.json();
  const { name, organizationId } = body;

  if (!name || !organizationId) {
    return createHonoErrorResponse(c, ERROR_CODES.INVALID_INPUT, "name and organizationId are required");
  }

  try {
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) return createHonoErrorResponse(c, ERROR_CODES.RECORD_NOT_FOUND, "Organization not found");

    const group = await prisma.labGroup.create({
      data: { name, organizationId, createdBy: requesterId },
    });

    await invalidateCache(`labGroups:org:${organizationId}`);

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
    await invalidateCache(`labGroups:org:${group.organizationId}`, `labGroupMembers:${groupId}`);

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

    // Upsert: student has one global lab group — allow switching
    const mapping = await prisma.studentLabGroup.upsert({
      where: { studentId: requesterId },
      update: { labGroupId: groupId },
      create: { studentId: requesterId, labGroupId: groupId },
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

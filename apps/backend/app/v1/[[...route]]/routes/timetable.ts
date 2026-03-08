import { createHonoErrorResponse, ERROR_CODES } from "@/lib/error.codes";
import { requireRole } from "@/middleware/check.auth";
import { getOrSetCache, invalidateCache } from "@unitime/cache";
import { prisma } from "@unitime/db";
import { Hono } from "hono";

const timetable = new Hono();

// ---------------------------------------------------------------------------
// GET /timetable/week/:userId — personal weekly timetable, filtered by the
// user's lab group. Slots with no labGroupId apply to everyone.
// ---------------------------------------------------------------------------
timetable.get("/week/:userId", async (c) => {
  const userId = c.req.param("userId");

  // Find the user's lab group (if any)
  const studentGroup = await prisma.studentLabGroup.findUnique({
    where: { studentId: userId },
    select: { labGroupId: true },
  });
  const labGroupId = studentGroup?.labGroupId ?? null;

  const timetables = await getOrSetCache(
    `timetable:week:${userId}:${labGroupId ?? "none"}`,
    () =>
      prisma.timetable.findMany({
        where: {
          users: {
            some: { userId },
          },
        },
        include: {
          course: true,
        },
      }),
    120,
  );

  const week: Record<string, { startTime: Date | string; [key: string]: unknown }[]> = {
    MONDAY: [],
    TUESDAY: [],
    WEDNESDAY: [],
    THURSDAY: [],
    FRIDAY: [],
    SATURDAY: [],
    SUNDAY: [],
  };

  timetables.forEach((t) => {
    if (week[t.day]) {
      week[t.day].push(t);
    }
  });

  for (const day in week) {
    week[day].sort(
      (a: { startTime: Date | string }, b: { startTime: Date | string }) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
  }

  return c.json(
    {
      success: true,
      status_code: 200,
      week,
      userLabGroupId: labGroupId,
      timetables, // flat list for convenience
    },
    200,
  );
});

// ---------------------------------------------------------------------------
// GET /timetable/:userId?day=MONDAY — fetch timetable for a user (+ optional day filter)
// ---------------------------------------------------------------------------
timetable.get("/:userId", async (c) => {
  const userId = c.req.param("userId");
  const day = c.req.query("day") as
    | "MONDAY"
    | "TUESDAY"
    | "WEDNESDAY"
    | "THURSDAY"
    | "FRIDAY"
    | "SATURDAY"
    | "SUNDAY"
    | undefined;

  const timetables = await getOrSetCache(
    `timetable:${userId}:${day ?? "all"}`,
    () =>
      prisma.timetable.findMany({
        where: {
          ...(day && { day }),
          users: {
            some: { userId },
          },
        },
        include: {
          course: true,
          users: true,
        },
      }),
    120,
  );
  if (timetables.length === 0) {
    return createHonoErrorResponse(c, ERROR_CODES.RECORD_NOT_FOUND);
  }
  return c.json({ success: true, status_code: 200, timetables }, 200);
});

// ---------------------------------------------------------------------------
// GET /timetable/ — list all timetable entries (ADMIN view)
// ---------------------------------------------------------------------------
timetable.get("/", async (c) => {
  const timetables = await getOrSetCache(
    "timetable:all",
    () =>
      prisma.timetable.findMany({
        include: {
          users: true,
          course: true,
        },
      }),
    120,
  );
  if (timetables.length === 0) {
    return createHonoErrorResponse(c, ERROR_CODES.RECORD_NOT_FOUND);
  }
  return c.json({ success: true, status_code: 200, timetables }, 200);
});

// ---------------------------------------------------------------------------
// POST /timetable — create a timetable entry, optionally scoped to a lab group
// ---------------------------------------------------------------------------
timetable.post("/", requireRole("ADMIN", "REPRESENTATIVE"), async (c) => {
  const body = await c.req.json();
  const { courseId, day, startTime, endTime, location, labGroupId } = body;

  if (!courseId || !day || !startTime || !endTime) {
    return createHonoErrorResponse(c, ERROR_CODES.MISSING_REQUIRED_FIELD);
  }

  try {
    const newEntry = await prisma.timetable.create({
      data: {
        courseId,
        day,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location,
      },
    });

    let targetUserIds: string[] = [];
    if (labGroupId) {
      // Distribute ONLY to students in the specified lab group
      const labStudents = await prisma.studentLabGroup.findMany({
        where: { labGroupId },
        select: { studentId: true },
      });
      targetUserIds = labStudents.map((s) => s.studentId);
    } else {
      // No lab group — distribute to all approved course students
      const courseStudents = await prisma.userCourse.findMany({
        where: { courseId, status: "APPROVED" },
        select: { userId: true },
      });
      targetUserIds = courseStudents.map((s) => s.userId);
    }

    if (targetUserIds.length > 0) {
      await prisma.userTimetable.createMany({
        data: targetUserIds.map((userId) => ({
          userId,
          timetableId: newEntry.id,
        })),
        skipDuplicates: true,
      });
    }

    await invalidateCache("timetable:all");

    return c.json({ success: true, status_code: 201, timetable: newEntry }, 201);
  } catch (error) {
    console.error("Error creating timetable:", error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

// ---------------------------------------------------------------------------
// PUT /timetable/:id — update a timetable entry (ADMIN/REPRESENTATIVE)
// ---------------------------------------------------------------------------
timetable.put("/:id", requireRole("ADMIN", "REPRESENTATIVE"), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const { startTime, endTime, location } = body;

  try {
    const updated = await prisma.timetable.update({
      where: { id },
      data: {
        ...(startTime && { startTime: new Date(startTime) }),
        ...(endTime && { endTime: new Date(endTime) }),
        ...(location !== undefined && { location }),
      },
    });

    await invalidateCache("timetable:all");

    return c.json({ success: true, status_code: 200, timetable: updated }, 200);
  } catch (error) {
    console.error("Error updating timetable:", error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

// ---------------------------------------------------------------------------
// DELETE /timetable/:id — delete a timetable entry (ADMIN/REPRESENTATIVE)
// ---------------------------------------------------------------------------
timetable.delete("/:id", requireRole("ADMIN", "REPRESENTATIVE"), async (c) => {
  const id = c.req.param("id");

  try {
    await prisma.timetable.delete({ where: { id } });
    await invalidateCache("timetable:all");

    return c.json({ success: true, status_code: 200, message: "Timetable entry deleted successfully" }, 200);
  } catch (error) {
    console.error("Error deleting timetable:", error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

export default timetable;

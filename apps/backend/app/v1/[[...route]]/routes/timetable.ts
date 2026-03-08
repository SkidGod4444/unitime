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

  // 1. Get user's approved courses
  const userCourses = await prisma.userCourse.findMany({
    where: { userId, status: "APPROVED" },
    select: { courseId: true },
  });
  const courseIds = userCourses.map((uc) => uc.courseId);

  // 2. Get user's lab groups
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { labGroupId: true },
  });
  const labGroupIds = profile?.labGroupId ? [profile.labGroupId] : [];

  const cacheKey = `timetable:week:${userId}:${labGroupIds.join(",") || "none"}`;
  const timetables = await getOrSetCache(
    cacheKey,
    () =>
      prisma.timetable.findMany({
        where: {
          courseId: { in: courseIds },
          OR: [
            { labGroupId: null },
            { labGroupId: { in: labGroupIds } }
          ]
        },
        include: {
          course: true,
        },
      }),
    120,
  );

  const week: Record<string, { startTime: string; [key: string]: unknown }[]> = {
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
      // We assume startTime is a string like "09:00" and can be sorted alphabetically,
      // which corresponds to chronological sorting for 24-hr time strings.
      (a: { startTime: string }, b: { startTime: string }) =>
        a.startTime.localeCompare(b.startTime)
    );
  }

  return c.json(
    {
      success: true,
      status_code: 200,
      week,
      userLabGroupIds: labGroupIds,
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

  // 1. Get user's approved courses
  const userCourses = await prisma.userCourse.findMany({
    where: { userId, status: "APPROVED" },
    select: { courseId: true },
  });
  const courseIds = userCourses.map((uc) => uc.courseId);

  // 2. Get user's lab groups
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { labGroupId: true },
  });
  const labGroupIds = profile?.labGroupId ? [profile.labGroupId] : [];

  const timetables = await getOrSetCache(
    `timetable:${userId}:${day ?? "all"}`,
    () =>
      prisma.timetable.findMany({
        where: {
          courseId: { in: courseIds },
          OR: [
            { labGroupId: null },
            { labGroupId: { in: labGroupIds } }
          ],
          ...(day && { day }),
        },
        include: {
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
// GET /timetable/ — list all timetable entries (ADMIN view)
// ---------------------------------------------------------------------------
timetable.get("/", async (c) => {
  const timetables = await getOrSetCache(
    "timetable:all",
    () =>
      prisma.timetable.findMany({
        include: {
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
        startTime,
        endTime,
        location,
        labGroupId,
      },
    });

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
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
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

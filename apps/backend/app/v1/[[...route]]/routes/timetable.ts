import { getDynamicCacheTag } from "@/lib/cache";
import { createHonoErrorResponse, ERROR_CODES } from "@/lib/error.codes";
import { prisma } from "@unitime/db";
import { Hono } from "hono";

const timetable = new Hono();

timetable.get("/:userId", async (c) => {
  const userId = c.req.param("userId");
  const day = c.req.query("day") as "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY" | undefined;
  const timetables = await prisma.timetable.findMany({
    where: {
      ...(day && { day }),
      users: {
        some: {
          userId,
        },
      },
    },
    include: {
      course: true,
      users: true,
    },
    cacheStrategy: {
      ttl: 60,
      tags: [getDynamicCacheTag("findMany_timetable", userId)],
    },
  });
  if (timetables.length === 0) {
    return createHonoErrorResponse(c, ERROR_CODES.RECORD_NOT_FOUND);
  }
  return c.json(
    {
      success: true,
      status_code: 200,
      timetables,
    },
    200,
  );
});

timetable.get("/", async (c) => {
  const timetables = await prisma.timetable.findMany({
    include: {
      users: true,
    },
    cacheStrategy: {
      ttl: 60,
      tags: ["findMany_timetable"],
    },
  });
  if (timetables.length === 0) {
    return createHonoErrorResponse(c, ERROR_CODES.RECORD_NOT_FOUND);
  }
  return c.json(
    {
      success: true,
      status_code: 200,
      timetables,
    },
    200,
  );
});

export default timetable;

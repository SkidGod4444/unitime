import { createHonoErrorResponse, ERROR_CODES } from "@/lib/error.codes";
import { getOrSetCache } from "@unitime/cache";
import { prisma } from "@unitime/db";
import { Hono } from "hono";

const timetable = new Hono();

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
    `timetable:${userId}`,
    () =>
      prisma.timetable.findMany({
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
      }),
    120,
  );
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
  const timetables = await getOrSetCache(
    "timetable:all",
    () =>
      prisma.timetable.findMany({
        include: {
          users: true,
        },
      }),
    120,
  );
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

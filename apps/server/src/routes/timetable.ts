import { Hono } from "hono";
import { createHonoErrorResponse, ERROR_CODES } from "../../lib/error.codes";
import { prisma } from "@unitime/db";

const timetable = new Hono();

timetable.get("/:userId", async (c) => {
  const userId = c.req.param("userId");
  const timetables = await prisma.timetable.findMany({
    where: {
      users: {
        some: {
          userId,
        },
      },
    },
    include: {
      users: true,
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

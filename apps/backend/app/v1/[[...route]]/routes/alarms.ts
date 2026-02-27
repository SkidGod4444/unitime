import { createHonoErrorResponse, ERROR_CODES } from "@/lib/error.codes";
import { getOrSetCache, invalidateCache } from "@unitime/cache";
import { prisma } from "@unitime/db";
import { Hono } from "hono";

const alarms = new Hono();

// GET /alarms/:userId — fetch all alarms for a user
alarms.get("/:userId", async (c) => {
  const userId = c.req.param("userId");

  try {
    const userAlarms = await getOrSetCache(
      `alarms:${userId}`,
      () =>
        prisma.alarm.findMany({
          where: { userId },
          orderBy: { createdAt: "asc" },
        }),
      120,
    );

    return c.json(
      {
        success: true,
        status_code: 200,
        alarms: userAlarms,
      },
      200,
    );
  } catch (error) {
    console.error("Error fetching alarms:", error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

// POST /alarms — create a new alarm
alarms.post("/", async (c) => {
  let body: {
    userId: string;
    label: string;
    courseCode: string;
    color?: string;
    time: string;
    days: number[];
    leadMinutes?: number;
    enabled?: boolean;
  };

  try {
    body = await c.req.json();
    if (
      !body.userId ||
      !body.label ||
      !body.courseCode ||
      !body.time ||
      !body.days
    ) {
      return createHonoErrorResponse(c, ERROR_CODES.INVALID_INPUT);
    }
  } catch {
    return createHonoErrorResponse(c, ERROR_CODES.INVALID_INPUT);
  }

  try {
    const alarm = await prisma.alarm.create({
      data: {
        userId: body.userId,
        label: body.label,
        courseCode: body.courseCode,
        color: body.color ?? "#6366f1",
        time: body.time,
        days: body.days,
        leadMinutes: body.leadMinutes ?? 15,
        enabled: body.enabled ?? true,
      },
    });

    await invalidateCache(`alarms:${alarm.userId}`);

    return c.json(
      {
        success: true,
        status_code: 201,
        alarm,
      },
      201,
    );
  } catch (error: unknown) {
    const e = error as { code?: string; meta?: unknown; message?: string };
    console.error(
      "Error creating alarm — code:",
      e?.code,
      "meta:",
      JSON.stringify(e?.meta),
      "msg:",
      e?.message,
    );
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

// PATCH /alarms/:id — update an alarm (toggle, edit fields)
alarms.patch("/:id", async (c) => {
  const id = c.req.param("id");

  let body: Partial<{
    label: string;
    courseCode: string;
    color: string;
    time: string;
    days: number[];
    leadMinutes: number;
    enabled: boolean;
  }>;

  try {
    body = await c.req.json();
  } catch {
    return createHonoErrorResponse(c, ERROR_CODES.INVALID_INPUT);
  }

  try {
    const alarm = await prisma.alarm.update({
      where: { id },
      data: body,
    });

    await invalidateCache(`alarms:${alarm.userId}`);

    return c.json(
      {
        success: true,
        status_code: 200,
        alarm,
      },
      200,
    );
  } catch (error) {
    console.error("Error updating alarm:", error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

// DELETE /alarms/:id — delete an alarm
alarms.delete("/:id", async (c) => {
  const id = c.req.param("id");

  try {
    const alarm = await prisma.alarm.delete({ where: { id } });

    await invalidateCache(`alarms:${alarm.userId}`);

    return c.json(
      {
        success: true,
        status_code: 200,
        message: "Alarm deleted",
      },
      200,
    );
  } catch (error) {
    console.error("Error deleting alarm:", error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

export default alarms;

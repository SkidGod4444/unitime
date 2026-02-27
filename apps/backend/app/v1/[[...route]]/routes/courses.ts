import { ERROR_CODES, createHonoErrorResponse } from "@/lib/error.codes";
import { getOrSetCache, invalidateCache } from "@unitime/cache";
import { prisma } from "@unitime/db";
import { Hono } from "hono";

const courses = new Hono();

courses.get("/:id", async (c) => {
  const id = c.req.param("id");
  const course = await getOrSetCache(
    `course:${id}`,
    () =>
      prisma.courses.findUnique({
        where: { id },
        include: { users: true },
      }),
    120,
  );
  if (!course) {
    return createHonoErrorResponse(c, ERROR_CODES.RECORD_NOT_FOUND);
  }
  return c.json(
    {
      success: true,
      status_code: 200,
      course,
    },
    200,
  );
});

courses.get("/", async (c) => {
  const courses = await getOrSetCache(
    "courses:all",
    () => prisma.courses.findMany({ include: { users: true } }),
    120,
  );
  if (courses.length === 0) {
    return createHonoErrorResponse(c, ERROR_CODES.RECORD_NOT_FOUND);
  }
  return c.json(
    {
      success: true,
      status_code: 200,
      courses,
    },
    200,
  );
});

courses.post("/", async (c) => {
  const {
    name,
    code,
    description,
    credit,
    classType,
    professorId,
    organizationId,
    userId,
  } = await c.req.json();
  if (
    !name ||
    !code ||
    !credit ||
    !classType ||
    !professorId ||
    !organizationId ||
    !userId
  ) {
    return createHonoErrorResponse(c, ERROR_CODES.MISSING_REQUIRED_FIELD);
  }
  const course = await prisma.courses.create({
    data: {
      name,
      code,
      description,
      credit,
      classType,
      professorId,
      organizationId,
    },
  });
  if (!course.id) {
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }

  await invalidateCache("courses:all");

  return c.json(
    {
      success: true,
      status_code: 201,
      course,
    },
    201,
  );
});

courses.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const course = await prisma.courses.update({
    where: {
      id,
    },
    data: {
      name: body.name,
      code: body.code,
      description: body.description,
      credit: body.credit,
      classType: body.classType,
      professorId: body.professorId,
      organizationId: body.organizationId,
    },
  });
  if (!course.id) {
    return createHonoErrorResponse(c, ERROR_CODES.INVALID_INPUT);
  }

  await invalidateCache("courses:all", `course:${id}`);

  return c.json(
    {
      success: true,
      status_code: 200,
      course,
    },
    200,
  );
});

courses.delete("/:id", async (c) => {
  const id = c.req.param("id");
  try {
    await prisma.courses.delete({
      where: { id },
    });

    await invalidateCache("courses:all", `course:${id}`);

    return c.json(
      {
        success: true,
        status_code: 200,
        message: "Course deleted successfully",
      },
      200,
    );
  } catch {
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

export default courses;

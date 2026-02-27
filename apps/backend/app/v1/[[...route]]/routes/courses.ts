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
    enrollmentEnabled,
  } = await c.req.json();
  if (
    !name ||
    !code ||
    credit === undefined ||
    credit === null ||
    !classType ||
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
      professorId: professorId || null,
      organizationId,
      enrollmentEnabled: enrollmentEnabled !== undefined ? enrollmentEnabled : true,
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
      professorId: body.professorId || null,
      organizationId: body.organizationId,
      enrollmentEnabled: body.enrollmentEnabled,
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

courses.post("/:id/enroll", async (c) => {
  const courseId = c.req.param("id");
  const { userId } = await c.req.json();
  
  if (!userId) {
    return createHonoErrorResponse(c, ERROR_CODES.MISSING_REQUIRED_FIELD);
  }

  try {
    const course = await prisma.courses.findUnique({ where: { id: courseId } });
    if (!course || !course.enrollmentEnabled) {
      return createHonoErrorResponse(c, ERROR_CODES.RECORD_NOT_FOUND); // Or a specific error for "enrollment disabled"
    }

    const enrollment = await prisma.userCourse.create({
      data: {
        userId,
        courseId,
        status: "PENDING",
      }
    });
    
    await invalidateCache(`course:${courseId}`, "courses:all", "enrollments:pending");
    
    return c.json({
      success: true,
      status_code: 201,
      enrollment
    }, 201);
  } catch (error) {
    console.error("Enrollment error", error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

courses.delete("/:id/enroll", async (c) => {
  const courseId = c.req.param("id");
  const { userId } = await c.req.json();
  
  if (!userId) {
    return createHonoErrorResponse(c, ERROR_CODES.MISSING_REQUIRED_FIELD);
  }

  try {
    await prisma.userCourse.delete({
      where: {
        userId_courseId: {
          userId,
          courseId,
        }
      }
    });
    
    await invalidateCache(`course:${courseId}`, "courses:all", "enrollments:pending");
    
    return c.json({
      success: true,
      status_code: 200,
      message: "Successfully de-enrolled"
    }, 200);
  } catch (error) {
    console.error("De-enrollment error", error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

export default courses;

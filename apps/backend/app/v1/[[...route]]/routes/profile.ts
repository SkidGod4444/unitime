import { createHonoErrorResponse, ERROR_CODES } from "@/lib/error.codes";
import { prisma } from "@unitime/db";
import { Hono } from "hono";

const profile = new Hono();

profile.get("/:userId", async (c) => {
  const userId = c.req.param("userId");
  const timetables = await prisma.studentProfile.findMany({
    where: {
      userId,
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

profile.get("/", async (c) => {
  const timetables = await prisma.studentProfile.findMany({});
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

profile.post("/create", async (c) => {
  const {
    admissionNumber,
    enrollmentNumber,
    studentEmail,
    contactNumber,
    userId,
    department,
    course,
    yearOfStudy,
    semester,
    organizationId,
  } = await c.req.json();
  const newProfile = await prisma.studentProfile.create({
    data: {
      admissionNumber,
      enrollmentNumber,
      studentEmail,
      contactNumber,
      userId,
      department,
      course,
      yearOfStudy,
      semester,
      organizationId,
    },
  });
  if (!newProfile) {
    return createHonoErrorResponse(c, ERROR_CODES.RECORD_NOT_FOUND);
  }
  return c.json(
    {
      success: true,
      status_code: 200,
      profile: newProfile,
    },
    200,
  );
});

export default profile;

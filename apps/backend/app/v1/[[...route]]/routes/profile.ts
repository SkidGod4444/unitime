import { getDynamicCacheTag } from "@/lib/cache";
import { createHonoErrorResponse, ERROR_CODES } from "@/lib/error.codes";
import { prisma } from "@unitime/db";
import { Hono } from "hono";

const profile = new Hono();

profile.post("/create", async (c) => {
  let body;
  try {
    body = await c.req.json();

    if (
      !body.admissionNumber ||
      !body.studentEmail ||
      !body.contactNumber ||
      !body.userId ||
      !body.department ||
      !body.course ||
      !body.yearOfStudy ||
      !body.semester ||
      !body.organizationId
    ) {
      return createHonoErrorResponse(c, ERROR_CODES.INVALID_INPUT);
    }
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return createHonoErrorResponse(c, ERROR_CODES.INVALID_INPUT);
  }

  try {
    const newProfile = await prisma.studentProfile.create({
      data: {
        admissionNumber: body.admissionNumber,
        enrollmentNumber: body.enrollmentNumber || null,
        studentEmail: body.studentEmail,
        contactNumber: body.contactNumber,
        userId: body.userId,
        department: body.department,
        course: body.course,
        yearOfStudy: body.yearOfStudy,
        semester: body.semester,
        organizationId: body.organizationId,
      },
    });
    console.log("Profile created successfully:", newProfile);

    await prisma.$accelerate.invalidate({
      tags: ["findMany_profiles", getDynamicCacheTag("findMany_profiles", body.userId)],
    });

    return c.json(
      {
        success: true,
        status_code: 200,
        profile: newProfile,
      },
      200,
    );
  } catch (error) {
    console.error("Error creating profile:", error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

profile.get("/all", async (c) => {
  const studentProfiles = await prisma.studentProfile.findMany({
    cacheStrategy: {
      ttl: 60,
      tags: ["findMany_profiles"],
    },
  });
  console.log("Fetched student profiles:", studentProfiles);
  if (studentProfiles.length === 0) {
    return createHonoErrorResponse(c, ERROR_CODES.RECORD_NOT_FOUND);
  }
  return c.json(
    {
      success: true,
      status_code: 200,
      profiles: studentProfiles,
    },
    200,
  );
});

profile.get("/:userId", async (c) => {
  const userId = c.req.param("userId");
  const timetables = await prisma.studentProfile.findMany({
    where: {
      userId,
    },
    cacheStrategy: {
      ttl: 60,
      tags: [getDynamicCacheTag("findMany_profiles", userId)],
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

export default profile;

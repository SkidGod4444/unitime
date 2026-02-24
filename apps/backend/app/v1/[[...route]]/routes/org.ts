import { createHonoErrorResponse, ERROR_CODES } from "@/lib/error.codes";
import { prisma } from "@unitime/db";
import { Hono } from "hono";

const orgs = new Hono();

orgs.get("/", async (c) => {
  const orgss = await prisma.organization.findMany();
  if (orgss.length === 0) {
    return createHonoErrorResponse(c, ERROR_CODES.RECORD_NOT_FOUND);
  }
  return c.json(
    {
      success: true,
      status_code: 200,
      orgs: orgss,
    },
    200,
  );
});

orgs.post("/create", async (c) => {
  const {
    departmentName,
    courseName,
    semester,
    section
  } = await c.req.json();
  const newOrg = await prisma.organization.create({
    data: {
      departmentName,
      courseName,
      section,
      semester,
    },
  });
  if (!newOrg) {
    return createHonoErrorResponse(c, ERROR_CODES.RECORD_NOT_FOUND);
  }
  return c.json(
    {
      success: true,
      status_code: 200,
      org: newOrg,
    },
    200,
  );
});

export default orgs;

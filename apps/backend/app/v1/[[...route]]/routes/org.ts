import { createHonoErrorResponse, ERROR_CODES } from "@/lib/error.codes";
import { prisma } from "@unitime/db";
import { Hono } from "hono";

const orgs = new Hono();

orgs.get("/all", async (c) => {
  const orgss = await prisma.organization.findMany({
    cacheStrategy: {
      ttl: 60,
      tags: ["findMany_orgs"],
    },
  });
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
  const { departmentName, courseName, semester, section } = await c.req.json();
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
  await prisma.$accelerate.invalidate({
    tags: ["findMany_orgs"],
  });
  return c.json(
    {
      success: true,
      status_code: 200,
      org: newOrg,
    },
    200,
  );
});

orgs.put("/:id/update", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const org = await prisma.organization.update({
    where: { id },
    data: body,
  });
  if (!org) {
    return createHonoErrorResponse(c, ERROR_CODES.RECORD_NOT_FOUND);
  }
  await prisma.$accelerate.invalidate({
    tags: ["findMany_orgs"], 
  }); 
  return c.json(
    {
      success: true,
      status_code: 200,
      org,
    },
    200,
  );
});

orgs.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const org = await prisma.organization.delete({
    where: { id },
  });
  if (!org) {
    return createHonoErrorResponse(c, ERROR_CODES.RECORD_NOT_FOUND);
  }
  await prisma.$accelerate.invalidate({
    tags: ["findMany_orgs"],
  });
  return c.json(
    {
      success: true,
      status_code: 200,
      org,
    },
    200,
  );
});

export default orgs;

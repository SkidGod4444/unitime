import { createHonoErrorResponse, ERROR_CODES } from "@/lib/error.codes";
import type { AppEnv } from "@/types/app-env";
import { getOrSetCache, invalidateCache } from "@unitime/cache";
import { prisma } from "@unitime/db";
import { Hono } from "hono";

const orgs = new Hono<AppEnv>();

orgs.get("/all", async (c) => {
  const orgss = await getOrSetCache(
    "orgs:all",
    () => prisma.organization.findMany(),
    120,
  );
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
  const requesterId = c.get("requesterId") as string | undefined;
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

  // Auto-seed default lab groups P-1 and P-2 for every new org
  if (requesterId) {
    await prisma.labGroup.createMany({
      data: [
        { name: "P-1", organizationId: newOrg.id, createdBy: requesterId },
        { name: "P-2", organizationId: newOrg.id, createdBy: requesterId },
      ],
      skipDuplicates: true,
    });
  }

  await invalidateCache("orgs:all", `labGroups:org:${newOrg.id}`);
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
  await invalidateCache("orgs:all");
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
  await invalidateCache("orgs:all");
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

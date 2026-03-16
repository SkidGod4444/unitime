import { createHonoErrorResponse, ERROR_CODES } from "@/lib/error.codes";
import { requireAuth } from "@/middleware/check.auth";
import type { AppEnv } from "@/types/app-env";
import { getOrSetCache, invalidateCache } from "@unitime/cache";
import { prisma } from "@unitime/db";
import { Hono } from "hono";

const orgs = new Hono<AppEnv>();
orgs.use("*", requireAuth);

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

orgs.get("/:id/members", async (c) => {
  const id = c.req.param("id");
  try {
    const members = await getOrSetCache(
      `org:${id}:members`,
      () =>
        prisma.user.findMany({
          where: {
            studentProfile: {
              organizationId: id,
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            expoPushToken: true,
          },
        }),
      120,
    );

    return c.json(
      {
        success: true,
        status_code: 200,
        members,
      },
      200,
    );
  } catch (error) {
    console.error("Error fetching org members:", error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

export default orgs;

import { prisma } from "@unitime/db";
import { Hono } from "hono";
import { createHonoErrorResponse, ERROR_CODES } from "../../lib/error.codes";

const users = new Hono();

users.get("/me", (c) => {
  return c.json({
    message: "Hello Hono!",
  });
});

users.get("/", async (c) => {
  const email = c.req.query("email");
  if (!email) {
    return createHonoErrorResponse(c, ERROR_CODES.RECORD_NOT_FOUND);
  }
  const user = await prisma.user.findUnique({
    where: { email },
  });
  if (!user) {
    return createHonoErrorResponse(c, ERROR_CODES.RECORD_NOT_FOUND);
  }
  return c.json(
    {
      success: true,
      status_code: 200,
      user,
    },
    200,
  );
});

users.get("/:id", async (c) => {
  const id = c.req.param("id");
  const user = prisma.user.findUnique({
    where: { id },
  });
  if (!user) {
    return createHonoErrorResponse(c, ERROR_CODES.RECORD_NOT_FOUND);
  }
  return c.json(
    {
      success: true,
      status_code: 200,
      user,
    },
    200,
  );
});

users.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const user = await prisma.user.update({
    where: { id },
    data: body,
  });
  if (!user) {
    return createHonoErrorResponse(c, ERROR_CODES.RECORD_NOT_FOUND);
  }
  return c.json(
    {
      success: true,
      status_code: 200,
      user,
    },
    200,
  );
});

export default users;

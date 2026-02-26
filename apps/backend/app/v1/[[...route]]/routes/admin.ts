import { createHonoErrorResponse, ERROR_CODES } from "@/lib/error.codes";
import { prisma } from "@unitime/db";
import { Hono } from "hono";

const admin = new Hono();

admin.patch("/users/:id/role", async (c) => {
  const id = c.req.param("id");
  let body: { role: "ADMIN" | "PROFESSOR" | "REPRESENTATIVE" | "STUDENT" };
  
  try {
    body = await c.req.json();
    if (!body.role) {
      return createHonoErrorResponse(c, ERROR_CODES.INVALID_INPUT);
    }
  } catch {
    return createHonoErrorResponse(c, ERROR_CODES.INVALID_INPUT);
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { role: body.role },
    });
    
    return c.json({
      success: true,
      status_code: 200,
      user,
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

admin.patch("/users/:id/status", async (c) => {
  const id = c.req.param("id");
  let body: { status: "ACTIVE" | "INACTIVE" };
  
  try {
    body = await c.req.json();
    if (!body.status) {
      return createHonoErrorResponse(c, ERROR_CODES.INVALID_INPUT);
    }
  } catch {
    return createHonoErrorResponse(c, ERROR_CODES.INVALID_INPUT);
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { status: body.status },
    });
    
    return c.json({
      success: true,
      status_code: 200,
      user,
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

export default admin;

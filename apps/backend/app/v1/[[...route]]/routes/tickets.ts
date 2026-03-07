import { createHonoErrorResponse, ERROR_CODES } from "@/lib/error.codes";
import { prisma } from "@unitime/db";
import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "@/types/app-env";
import { requireRole } from "@/middleware/check.auth";

const tickets = new Hono<AppEnv>();

// Create support ticket
tickets.post("/", async (c) => {
  const requesterId = c.get("requesterId");
  if (!requesterId) return createHonoErrorResponse(c, ERROR_CODES.TOKEN_MISSING);

  const schema = z
    .object({
      title: z.string().min(1),
      description: z.string().min(1),
    })
    .strict();

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await c.req.json());
  } catch {
    return createHonoErrorResponse(c, ERROR_CODES.INVALID_INPUT);
  }

  try {
    const sp = await prisma.studentProfile.findUnique({
      where: { userId: requesterId },
      select: { organizationId: true },
    });

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: requesterId,
        organizationId: sp?.organizationId ?? null,
        title: body.title,
        description: body.description,
      },
    });
    return c.json({ success: true, ticket }, 201);
  } catch (e) {
    console.error("Ticket create failed", e);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

// List current user's tickets
tickets.get("/my", async (c) => {
  const requesterId = c.get("requesterId");
  if (!requesterId) return createHonoErrorResponse(c, ERROR_CODES.TOKEN_MISSING);
  try {
    const list = await prisma.supportTicket.findMany({
      where: { userId: requesterId },
      orderBy: { createdAt: "desc" },
    });
    return c.json({ success: true, tickets: list }, 200);
  } catch (e) {
    console.error("Ticket list failed", e);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

// Admin: list tickets
tickets.get("/admin", requireRole("ADMIN"), async (c) => {
  const organizationId = c.req.query("organizationId");
  try {
    const list = await prisma.supportTicket.findMany({
      where: { ...(organizationId ? { organizationId } : {}) },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
    return c.json({ success: true, tickets: list }, 200);
  } catch (e) {
    console.error("Ticket admin list failed", e);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

// Admin: set ticket status
tickets.patch("/:id/status", requireRole("ADMIN"), async (c) => {
  const id = c.req.param("id");
  const schema = z
    .object({
      status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const),
      assigneeId: z.string().optional(),
    })
    .strict();
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await c.req.json());
  } catch {
    return createHonoErrorResponse(c, ERROR_CODES.INVALID_INPUT);
  }
  try {
    const update = await prisma.supportTicket.update({
      where: { id },
      data: {
        status: body.status,
        assigneeId: body.assigneeId ?? undefined,
        resolvedAt: body.status === "RESOLVED" ? new Date() : undefined,
      },
    });
    return c.json({ success: true, ticket: update }, 200);
  } catch (e) {
    console.error("Ticket status update failed", e);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

// Admin: resolve with note
tickets.patch("/:id/resolve", requireRole("ADMIN"), async (c) => {
  const id = c.req.param("id");
  const schema = z.object({ resolutionNote: z.string().min(1) }).strict();
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await c.req.json());
  } catch {
    return createHonoErrorResponse(c, ERROR_CODES.INVALID_INPUT);
  }
  try {
    const update = await prisma.supportTicket.update({
      where: { id },
      data: {
        status: "RESOLVED",
        resolutionNote: body.resolutionNote,
        resolvedAt: new Date(),
      },
    });
    return c.json({ success: true, ticket: update }, 200);
  } catch (e) {
    console.error("Ticket resolve failed", e);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

export default tickets;

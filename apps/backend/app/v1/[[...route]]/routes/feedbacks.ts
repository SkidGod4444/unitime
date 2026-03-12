import { createHonoErrorResponse, ERROR_CODES } from "@/lib/error.codes";
import { requireAuth, requireRole } from "@/middleware/check.auth";
import type { AppEnv } from "@/types/app-env";
import { prisma } from "@unitime/db";
import { Hono } from "hono";
import { z } from "zod";
import { sendPushNotification } from "@/lib/expo.notifications";

const feedbacks = new Hono<AppEnv>();
feedbacks.use("*", requireAuth);

// Create feedback (authenticated user)
feedbacks.post("/", async (c) => {
  const requesterId = c.get("requesterId");
  if (!requesterId)
    return createHonoErrorResponse(c, ERROR_CODES.TOKEN_MISSING);

  const schema = z
    .object({
      message: z.string().min(1),
      category: z.enum(["BUG", "UX", "FEATURE", "OTHER"]).optional(),
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

    const fb = await prisma.feedback.create({
      data: {
        userId: requesterId,
        organizationId: sp?.organizationId ?? null,
        message: body.message,
        category: body.category ?? "OTHER",
      },
    });

    return c.json({ success: true, feedback: fb }, 201);
  } catch (e) {
    console.error("Feedback create failed", e);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

// List current user's feedbacks
feedbacks.get("/my", async (c) => {
  const requesterId = c.get("requesterId");
  if (!requesterId)
    return createHonoErrorResponse(c, ERROR_CODES.TOKEN_MISSING);

  try {
    const list = await prisma.feedback.findMany({
      where: { userId: requesterId },
      orderBy: { createdAt: "desc" },
    });
    return c.json({ success: true, feedbacks: list }, 200);
  } catch (e) {
    console.error("Feedback list failed", e);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

// Admin: list feedbacks (optional by org)
feedbacks.get("/admin", requireRole("ADMIN"), async (c) => {
  const organizationId = c.req.query("organizationId");
  try {
    const list = await prisma.feedback.findMany({
      where: {
        ...(organizationId ? { organizationId } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return c.json({ success: true, feedbacks: list }, 200);
  } catch (e) {
    console.error("Feedback admin list failed", e);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

// Admin: update feedback status
feedbacks.patch("/:id/status", requireRole("ADMIN"), async (c) => {
  const id = c.req.param("id");
  const schema = z
    .object({ status: z.enum(["NEW", "ACKNOWLEDGED", "RESOLVED"]) })
    .strict();
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await c.req.json());
  } catch {
    return createHonoErrorResponse(c, ERROR_CODES.INVALID_INPUT);
  }
  try {
    const update = await prisma.feedback.update({
      where: { id },
      data: {
        status: body.status,
        resolvedAt: body.status === "RESOLVED" ? new Date() : undefined,
      },
      include: { user: { select: { expoPushToken: true } } },
    });

    if (update.user.expoPushToken) {
      await sendPushNotification(
        [update.user.expoPushToken],
        `Feedback Status Updated`,
        `Your feedback has been marked as ${body.status}.`
      );
    }

    return c.json({ success: true, feedback: update }, 200);
  } catch (e) {
    console.error("Feedback status update failed", e);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

export default feedbacks;

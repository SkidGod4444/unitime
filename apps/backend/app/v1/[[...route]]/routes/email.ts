import { createHonoErrorResponse, ERROR_CODES } from "@/lib/error.codes";
import { resend } from "@/lib/resend";
import type { CreateEmailOptions } from "resend";
import { requireAuth, requireRole } from "@/middleware/check.auth";
import type { AppEnv } from "@/types/app-env";
import { Hono } from "hono";
import { z } from "zod";

const email = new Hono<AppEnv>();
email.use("*", requireAuth);

// ---------------------------------------------------------------------------
// POST /email/send
// Sends a transactional email via Resend. Restricted to ADMIN role.
// ---------------------------------------------------------------------------
email.post("/send", requireRole("ADMIN"), async (c) => {
  const schema = z
    .object({
      to: z.union([z.email(), z.array(z.email()).min(1)]),
      subject: z.string().min(1),
      html: z.string().min(1).optional(),
      text: z.string().min(1).optional(),
      cc: z.union([z.email(), z.array(z.email())]).optional(),
      bcc: z.union([z.email(), z.array(z.email())]).optional(),
      replyTo: z.union([z.email(), z.array(z.email())]).optional(),
      tags: z
        .array(z.object({ name: z.string(), value: z.string() }))
        .optional(),
    })
    .refine((d) => d.html || d.text, {
      message: "At least one of 'html' or 'text' must be provided",
    });

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await c.req.json());
  } catch {
    return createHonoErrorResponse(c, ERROR_CODES.INVALID_INPUT);
  }

  const fromAddress = process.env.RESEND_FROM_ADDRESS;
  if (!fromAddress) {
    console.error("[Email] RESEND_FROM_ADDRESS env variable is not set");
    return createHonoErrorResponse(c, ERROR_CODES.CONFIGURATION_ERROR);
  }

  // Zod .refine() guarantees at least one of html/text is present at runtime.
  // The cast is safe — it resolves the SDK's discriminated union inference issue.
  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to: body.to,
    subject: body.subject,
    ...(body.html && { html: body.html }),
    ...(body.text && { text: body.text }),
    ...(body.cc && { cc: body.cc }),
    ...(body.bcc && { bcc: body.bcc }),
    ...(body.replyTo && { replyTo: body.replyTo }),
    ...(body.tags && { tags: body.tags }),
  } as CreateEmailOptions);

  if (error) {
    console.error("[Email] Resend delivery failed:", error);
    return createHonoErrorResponse(
      c,
      ERROR_CODES.EMAIL_DELIVERY_FAILED,
      error.message,
    );
  }

  return c.json({ success: true, emailId: data?.id }, 200);
});

// ---------------------------------------------------------------------------
// POST /email/welcome
// Sends a Welcome email via the hosted "welcome-email" Resend template.
// from and subject are defined in the template itself, so they are omitted here.
// Restricted to ADMIN role.
// ---------------------------------------------------------------------------
email.post("/welcome", async (c) => {
  const schema = z.object({
    to: z.union([z.email(), z.array(z.email()).min(1)]),
    variables: z
      .record(z.string(), z.union([z.string(), z.number()]))
      .optional(),
  });

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await c.req.json());
  } catch {
    return createHonoErrorResponse(c, ERROR_CODES.INVALID_INPUT);
  }

  const { data, error } = await resend.emails.send({
    to: body.to,
    template: {
      id: "welcome-email",
      ...(body.variables && { variables: body.variables }),
    },
  });

  if (error) {
    console.error("[Email] Welcome email delivery failed:", error);
    return createHonoErrorResponse(
      c,
      ERROR_CODES.EMAIL_DELIVERY_FAILED,
      error.message,
    );
  }

  return c.json({ success: true, emailId: data?.id }, 200);
});

export default email;

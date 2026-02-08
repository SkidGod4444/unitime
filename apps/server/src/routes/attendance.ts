import { prisma } from "@unitime/db";
import { Hono } from "hono";
import { createHonoErrorResponse, ERROR_CODES } from "../../lib/error.codes";
import { generateQRToken, verifyQRToken } from "../../lib/qr.algo";

const attendance = new Hono();

attendance.post("/qr/session/create", async (c) => {
  const { courseId, creatorId, startTime, endTime } = await c.req.json();
  if (!courseId || !creatorId || !startTime || !endTime) {
    return createHonoErrorResponse(c, ERROR_CODES.MISSING_REQUIRED_FIELD);
  }
  const qrSession = await prisma.attendanceQRSession.create({
    data: {
      courseId,
      createdBy: creatorId,
      startTime,
      endTime,
    },
  });
  if (!qrSession.id) {
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
  console.log("Created QR session:", qrSession.id, "for course:", courseId);
  return c.json(
    {
      success: true,
      status_code: 201,
      qrSession,
    },
    201,
  );
});

attendance.post("/qr/session/verify", async (c) => {
  const { qrString, userId } = await c.req.json();
  if (!qrString || !userId) {
    return createHonoErrorResponse(c, ERROR_CODES.MISSING_REQUIRED_FIELD);
  }
  const isValid = verifyQRToken(qrString);
  if (!isValid) {
    return c.json({ error: "Invalid or expired QR" }, 400);
  }
  const [sessionId] = qrString.split("|");
  console.log(
    "Verifying attendance for session:",
    sessionId,
    "student:",
    userId,
  );
  const session = await prisma.attendanceQRSession.findUnique({
    where: { id: sessionId },
  });
  if (!session) {
    return c.json({ error: "Invalid or expired QR" }, 400);
  }

  const existingRecord = await prisma.attendanceLogs.findFirst({
    where: {
      sessionId: sessionId,
      userId: userId,
    },
  });

  if (existingRecord) {
    return c.json({
      message: "Attendance already marked",
    });
  }

  const attendanceRecord = await prisma.attendanceLogs.create({
    data: {
      sessionId: sessionId,
      userId: userId,
      markedAt: new Date(),
    },
  });

  if (!attendanceRecord.id) {
    return c.json({ error: "Failed to mark attendance" }, 500);
  }
  return c.json({
    message: "Attendance marked successfully",
  });
});

attendance.get("/qr/session/:id", async (c) => {
  const sessionId = c.req.param("id");

  const session = await prisma.attendanceQRSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }

  const qr = generateQRToken(sessionId);
  console.log("Generated QR for session:", sessionId, "qrString:", qr.qrString);
  return c.json({
    qrString: qr.qrString,
  });
});

export default attendance;

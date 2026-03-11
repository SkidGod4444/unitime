import { createHonoErrorResponse, ERROR_CODES } from "@/lib/error.codes";
import { generateQRToken, verifyQRToken } from "@/lib/qr.algo";
import { checkinSchema, createQRSessionSchema } from "@/lib/validation";
import { requireAuth, requireRole } from "@/middleware/check.auth";
import type { AppEnv } from "@/types/app-env";
import { getOrSetCache, invalidateCache } from "@unitime/cache";
import { prisma } from "@unitime/db";
import { Hono } from "hono";

const attendance = new Hono<AppEnv>();

// Basic protection for all attendance routes
attendance.use("*", requireAuth);

// More strict protection for specific routes
attendance.use("/qr/session/create", requireRole("PROFESSOR", "ADMIN"));
attendance.use("/sessions/:id/students", requireRole("PROFESSOR", "ADMIN"));

/**
 * Helper to calculate haversine distance between two points.
 * Returns distance in meters.
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

attendance.post("/qr/session/create", async (c) => {
  const requesterId = c.get("requesterId") as string;
  if (!requesterId)
    return createHonoErrorResponse(c, ERROR_CODES.TOKEN_MISSING);

  const json = await c.req.json();
  const parsed = createQRSessionSchema.safeParse(json);
  if (!parsed.success) {
    return createHonoErrorResponse(c, ERROR_CODES.INVALID_INPUT);
  }
  const {
    courseId,
    startTime,
    endTime,
    manualPresentIds,
    manualAbsentIds,
    labGroupId,
    geofenceRadius,
    coordinates,
  } = parsed.data;
  const manualIds = Array.isArray(manualPresentIds) ? manualPresentIds : [];
  const absentIds = Array.isArray(manualAbsentIds) ? manualAbsentIds : [];

  const courseDetails = await prisma.courses.findUnique({
    where: { id: courseId },
    select: { name: true, organizationId: true },
  });

  if (labGroupId) {
    const group = await prisma.labGroup.findUnique({
      where: { id: labGroupId },
    });
    if (!group)
      return createHonoErrorResponse(
        c,
        ERROR_CODES.INVALID_INPUT,
        "Invalid lab group",
      );
  }

  const qrSession = await prisma.attendanceQRSession.create({
    data: {
      courseId,
      createdBy: requesterId,
      startTime,
      endTime,
      markedUsers: manualIds.length > 0 ? manualIds : [],
      labGroupId: labGroupId || null,
      geofenceRadius: geofenceRadius ?? 75,
      coordinates: coordinates || null,
    },
  });

  const allManualIds = [...manualIds, ...absentIds];

  if (allManualIds.length > 0) {
    try {
      await prisma.attendanceLogs.createMany({
        data: allManualIds.map((userId: string) => ({
          sessionId: qrSession.id,
          userId,
          sessionType: "MANUAL_SESSION",
          markedAt: new Date(),
        })),
        skipDuplicates: true,
      });

      await prisma.historyLog.createMany({
        data: allManualIds.map((userId: string) => ({
          title: manualIds.includes(userId)
            ? "Manual Attendance (Present)"
            : "Manual Attendance (Absent)",
          description: manualIds.includes(userId)
            ? `You were manually marked Present for ${courseDetails?.name || "your class"}.`
            : `You were manually marked Absent for ${courseDetails?.name || "your class"}.`,
          type: "ATTENDANCE",
          userId,
          organizationId: courseDetails?.organizationId || null,
        })),
      });

      await prisma.notification.createMany({
        data: allManualIds.map((userId: string) => ({
          title: "Attendance Updated",
          body: manualIds.includes(userId)
            ? `You were manually marked Present for ${courseDetails?.name || "your class"}.`
            : `You were manually marked Absent for ${courseDetails?.name || "your class"}.`,
          type: "ATTENDANCE",
          userId,
          organizationId: courseDetails?.organizationId || null,
        })),
      });
    } catch (err) {
      console.error("Failed to commit manual attendance logs", err);
    }
  }

  // Push Notifications & Cache Invalidation
  try {
    const enrolledStudentsRaw = (await prisma.userCourse.findMany({
      where: { courseId: courseId, status: "APPROVED" },
      include: { user: { select: { expoPushToken: true } } },
    })) as unknown as Array<{
      userId: string;
      user: { expoPushToken: string | null };
    }>;

    let enrolledStudents = enrolledStudentsRaw.map((e) => ({
      userId: e.userId,
      user: e.user,
    }));

    if (labGroupId) {
      const groupMembers = await prisma.studentProfile.findMany({
        where: { labGroupId },
        select: { userId: true },
      });
      const allowedIds = new Set(groupMembers.map((m) => m.userId));
      enrolledStudents = enrolledStudents.filter((e) =>
        allowedIds.has(e.userId),
      );
    }

    await Promise.all(
      enrolledStudents.map((e) =>
        Promise.all([
          invalidateCache(`dashboard:${e.userId}`),
          invalidateCache(`dashboard:bundle:${e.userId}`),
        ]),
      ),
    );

    const targetStudents = enrolledStudents.filter(
      (e) => !allManualIds.includes(e.userId) && e.userId !== requesterId,
    );

    const tokens = targetStudents
      .map((e) => e.user.expoPushToken)
      .filter(Boolean) as string[];

    if (tokens.length > 0) {
      const pushDetails = {
        title: "Attendance Started",
        body: `Attendance for ${courseDetails?.name || "your class"} is now open! Tap here to check in.`,
        data: { courseId, sessionId: qrSession.id },
      };

      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          tokens.map((token) => ({ to: token, ...pushDetails })),
        ),
      }).catch(console.error);
    }
  } catch (err) {
    console.error("Push/Cache error:", err);
  }

  return c.json({ success: true, qrSession }, 201);
});

attendance.post("/qr/session/verify", async (c) => {
  const requesterId = c.get("requesterId") as string;
  if (!requesterId)
    return createHonoErrorResponse(c, ERROR_CODES.TOKEN_MISSING);

  const { qrString } = await c.req.json();
  if (!qrString)
    return createHonoErrorResponse(c, ERROR_CODES.MISSING_REQUIRED_FIELD);

  const isValid = verifyQRToken(qrString);
  if (!isValid) return c.json({ error: "Invalid or expired QR" }, 400);

  const [sessionId] = qrString.split("|");
  try {
    const session = await prisma.attendanceQRSession.findUnique({
      where: { id: sessionId },
      include: { course: true },
    });

    if (!session || session.status !== "ACTIVE") {
      return c.json({ error: "Session is invalid or inactive" }, 400);
    }

    if (new Date() > session.endTime) {
      return c.json({ error: "Session has expired" }, 400);
    }

    const existing = await prisma.attendanceLogs.findUnique({
      where: { sessionId_userId: { sessionId, userId: requesterId } },
    });

    if (existing) {
      return c.json(
        { success: true, message: "Attendance already verified" },
        200,
      );
    }

    await prisma.attendanceLogs.create({
      data: {
        sessionId,
        userId: requesterId,
        sessionType: "QR_SESSION",
        markedAt: new Date(),
      },
    });

    await prisma.attendanceQRSession.update({
      where: { id: sessionId },
      data: { markedUsers: { push: requesterId } },
    });

    await prisma.historyLog.create({
      data: {
        title: "Attendance (Verified)",
        description: `Your QR attendance for ${session.course.name} was successfully verified.`,
        type: "ATTENDANCE",
        userId: requesterId,
        organizationId: session.course.organizationId,
      },
    });

    await invalidateCache(`dashboard:${requesterId}`);
    await invalidateCache(`dashboard:bundle:${requesterId}`);
    await invalidateCache(`attendance:summary:${requesterId}`);

    return c.json({
      success: true,
      message: "Attendance verified successfully",
    });
  } catch (err) {
    console.error("Verification error:", err);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

attendance.post("/checkin", async (c) => {
  const requesterId = c.get("requesterId") as string;
  if (!requesterId)
    return createHonoErrorResponse(c, ERROR_CODES.TOKEN_MISSING);

  const parsed = checkinSchema.safeParse(await c.req.json());
  if (!parsed.success)
    return createHonoErrorResponse(c, ERROR_CODES.INVALID_INPUT);
  const { sessionId, coordinates } = parsed.data;

  try {
    const session = await prisma.attendanceQRSession.findUnique({
      where: { id: sessionId },
      include: { user: true, course: true },
    });

    if (!session || session.status !== "ACTIVE") {
      return c.json(
        { success: false, message: "Session is invalid or inactive" },
        400,
      );
    }

    const now = new Date();
    const end = new Date(session.endTime);
    const allowanceSec = Number(process.env.CHECKIN_GRACE_SECONDS || "120");
    const endWithGrace = new Date(end.getTime() + allowanceSec * 1000);

    if (now > endWithGrace) {
      return c.json({ success: false, message: "Session has expired" }, 400);
    }

    const targetCoords = session.coordinates || session.user.coordinates;
    if (targetCoords) {
      const [pLat, pLng] = targetCoords.split(",").map(Number);
      const distance = haversineDistance(
        pLat,
        pLng,
        coordinates.lat,
        coordinates.lng,
      );

      if (distance > (session.geofenceRadius ?? 75)) {
        await prisma.historyLog.create({
          data: {
            title: "Check-in Failed (Location)",
            description: `Check-in for ${session.course.name} failed: Too far (${Math.round(distance)}m).`,
            type: "ATTENDANCE",
            userId: requesterId,
            organizationId: session.course.organizationId || null,
          },
        });
        return c.json(
          { success: false, message: "Too far from classroom", distance },
          403,
        );
      }
    }

    const enrollment = await prisma.userCourse.findUnique({
      where: {
        userId_courseId: { userId: requesterId, courseId: session.courseId },
      },
    });
    if (!enrollment || enrollment.status !== "APPROVED") {
      return c.json({ error: "Not enrolled in this course" }, 403);
    }

    if (session.labGroupId) {
      const mapping = await prisma.studentProfile.findUnique({
        where: { userId: requesterId },
      });
      if (!mapping || mapping.labGroupId !== session.labGroupId) {
        return c.json(
          { success: false, message: "Not in targeted lab group" },
          403,
        );
      }
    }

    const existing = await prisma.attendanceLogs.findUnique({
      where: { sessionId_userId: { sessionId, userId: requesterId } },
    });
    if (existing)
      return c.json(
        { success: true, message: "Attendance already marked" },
        200,
      );

    await prisma.attendanceLogs.create({
      data: {
        sessionId,
        userId: requesterId,
        sessionType: "TAP_SESSION",
        markedAt: new Date(),
      },
    });

    await prisma.attendanceQRSession.update({
      where: { id: sessionId },
      data: { markedUsers: { push: requesterId } },
    });

    // Background aggregation logic could be added here if needed, but keeping it consistent with verify
    await invalidateCache(`dashboard:${requesterId}`);
    await invalidateCache(`dashboard:bundle:${requesterId}`);
    await invalidateCache(`attendance:summary:${requesterId}`);

    return c.json({ success: true, message: "Attendance marked successfully" });
  } catch (err) {
    console.error("Checkin error:", err);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

attendance.get("/qr/session/:id", async (c) => {
  const sessionId = c.req.param("id");
  const session = await prisma.attendanceQRSession.findUnique({
    where: { id: sessionId },
  });
  if (!session) return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);

  const qr = generateQRToken(sessionId);
  return c.json({ qrString: qr.qrString });
});

attendance.get("/summary/:userId", async (c) => {
  const requesterId = c.get("requesterId") as string;
  const requesterRole = c.get("requesterRole") as string;
  const targetUserId = c.req.param("userId");

  if (
    requesterId !== targetUserId &&
    requesterRole !== "ADMIN" &&
    requesterRole !== "PROFESSOR"
  ) {
    return c.json({ error: "Forbidden" }, 403);
  }

  return await getOrSetCache(`attendance:summary:${targetUserId}`, async () => {
    const enrollments = await prisma.userCourse.findMany({
      where: { userId: targetUserId },
      include: { course: true },
    });

    const summary = await Promise.all(
      enrollments.map(async (enr) => {
        const studentProfile = await prisma.studentProfile.findUnique({
          where: { userId: targetUserId },
          select: { labGroupId: true },
        });

        const orClauses: Array<{ labGroupId: string | null }> = [
          { labGroupId: null },
        ];
        if (studentProfile?.labGroupId)
          orClauses.push({ labGroupId: studentProfile.labGroupId });

        const sessionIds = (
          await prisma.attendanceQRSession.findMany({
            where: { courseId: enr.courseId, OR: orClauses },
            select: { id: true },
          })
        ).map((s) => s.id);

        const attended = await prisma.attendanceLogs.count({
          where: { userId: targetUserId, sessionId: { in: sessionIds } },
        });

        const total = sessionIds.length;
        const percentage =
          total === 0 ? 100 : Math.round((attended / total) * 100);

        return {
          courseId: enr.courseId,
          courseName: enr.course.name,
          courseCode: enr.course.code,
          classType: enr.course.classType,
          attended,
          total,
          percentage,
        };
      }),
    );
    return c.json({ success: true, summary });
  });
});

attendance.get("/sessions/all", async (c) => {
  const organizationId = c.req.header("x-organization-id");
  const userId = c.get("requesterId");
  const role = c.get("requesterRole");

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {};
    if (organizationId) {
      whereClause.course = { organizationId };
    } else if (role !== "ADMIN" && userId) {
      // If no org ID provided and not admin, only show sessions for courses this user is approved in
      whereClause.course = {
        users: {
          some: { userId, status: "APPROVED" },
        },
      };
    }

    const sessionsRaw = (await prisma.attendanceQRSession.findMany({
      where: whereClause,
      include: { user: { select: { name: true } }, course: true },
      orderBy: { createdAt: "desc" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    })) as any[];

    const enhanced = await Promise.all(
      sessionsRaw.map(async (session) => {
        const logs = await prisma.attendanceLogs.findMany({
          where: { sessionId: session.id },
        });
        const enrolled = await prisma.userCourse.findMany({
          where: { courseId: session.courseId, status: "APPROVED" },
          include: { user: true },
        });

        let finalEnrolled = enrolled;
        if (session.labGroupId) {
          const members = await prisma.studentProfile.findMany({
            where: { labGroupId: session.labGroupId },
            select: { userId: true },
          });
          const memberIds = members.map((m) => m.userId);
          finalEnrolled = enrolled.filter((e) => memberIds.includes(e.userId));
        }

        const stats = {
          present: logs.length,
          absent: Math.max(0, finalEnrolled.length - logs.length),
        };

        return {
          ...session,
          creator: session.user?.name || "Unknown",
          stats,
        };
      }),
    );

    return c.json({ success: true, sessions: enhanced });
  } catch (err) {
    console.error(err);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

attendance.patch("/sessions/:id/students", async (c) => {
  const sessionId = c.req.param("id");
  const { students } = await c.req.json();

  try {
    await prisma.$transaction(async (tx) => {
      for (const student of students) {
        if (student.status === "present") {
          await tx.attendanceLogs.upsert({
            where: { sessionId_userId: { sessionId, userId: student.id } },
            update: {},
            create: {
              sessionId,
              userId: student.id,
              sessionType: "MANUAL_SESSION",
            },
          });
          const session = await tx.attendanceQRSession.findUnique({
            where: { id: sessionId },
          });
          if (session && !session.markedUsers.includes(student.id)) {
            await tx.attendanceQRSession.update({
              where: { id: sessionId },
              data: { markedUsers: { push: student.id } },
            });
          }
        } else {
          await tx.attendanceLogs.deleteMany({
            where: { sessionId, userId: student.id },
          });
          const session = await tx.attendanceQRSession.findUnique({
            where: { id: sessionId },
          });
          if (session && session.markedUsers.includes(student.id)) {
            await tx.attendanceQRSession.update({
              where: { id: sessionId },
              data: {
                markedUsers: session.markedUsers.filter(
                  (id) => id !== student.id,
                ),
              },
            });
          }
        }
      }
    });

    await invalidateCache(`attendanceLogs:session:${sessionId}`);
    return c.json({ success: true, message: "Updated" });
  } catch (err) {
    console.error(err);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

attendance.get("/sessions/:id/export", async (c) => {
  const sessionId = c.req.param("id");
  try {
    const session = await prisma.attendanceQRSession.findUnique({
      where: { id: sessionId },
      include: { course: true },
    });
    if (!session) return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);

    const logs = await prisma.attendanceLogs.findMany({ where: { sessionId } });

    const enrolledRaw = await prisma.userCourse.findMany({
      where: { courseId: session.courseId, status: "APPROVED" },
      include: { user: { include: { studentProfile: true } } },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let enrolled = (enrolledRaw as any[]).map((e: any) => ({
      userId: e.userId,
      user: e.user,
    }));

    if (session.labGroupId) {
      const members = await prisma.studentProfile.findMany({
        where: { labGroupId: session.labGroupId },
        select: { userId: true },
      });
      const allowed = new Set(members.map((m) => m.userId));
      enrolled = enrolled.filter((e) => allowed.has(e.userId));
    }

    const csvHeaders = ["Name", "Adm No", "Email", "Status", "Marked At"];
    const rows = enrolled.map((e) => {
      const log = logs.find((l) => l.userId === e.userId);
      return [
        e.user.name,
        e.user.studentProfile?.admissionNumber || "N/A",
        e.user.email,
        log ? "Present" : "Absent",
        log ? log.markedAt.toISOString() : "N/A",
      ].join(",");
    });

    const csv = [csvHeaders.join(","), ...rows].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="attendance_${session.course.code}.csv"`,
      },
    });
  } catch (err) {
    console.error(err);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

export default attendance;

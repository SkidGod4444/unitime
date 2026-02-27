import { createHonoErrorResponse, ERROR_CODES } from "@/lib/error.codes";
import { generateQRToken, verifyQRToken } from "@/lib/qr.algo";
import { getOrSetCache, invalidateCache } from "@unitime/cache";
import { prisma } from "@unitime/db";
import { Hono } from "hono";

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

  // No cache invalidation needed for userCourse or logs on session creation.

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

  await invalidateCache(`attendanceLogs:session:${sessionId}`);

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

attendance.get("/summary/:userId", async (c) => {
  const userId = c.req.param("userId");

  try {
    // 1. Get all courses the user is enrolled in
    const enrollments = await prisma.userCourse.findMany({
      where: { userId },
      include: { course: true },
    });

    if (enrollments.length === 0) {
      return c.json({ success: true, status_code: 200, summary: [] });
    }

    const summary = await Promise.all(
      enrollments.map(async (enrollment) => {
        const courseId = enrollment.courseId;

        // 2. Count total sessions created for this course
        const totalSessions = await prisma.attendanceQRSession.count({
          where: { courseId },
        });

        // 3. Count sessions this user attended
        const attendedSessions = await prisma.attendanceLogs.count({
          where: {
            userId,
            sessionId: {
              in: (
                await prisma.attendanceQRSession.findMany({
                  where: { courseId },
                })
              ).map((s) => s.id),
            },
          },
        });

        const percentage =
          totalSessions === 0
            ? 100 // default to 100% if no classes held yet
            : Math.round((attendedSessions / totalSessions) * 100);

        return {
          courseId: courseId,
          courseName: enrollment.course.name,
          courseCode: enrollment.course.code,
          attended: attendedSessions,
          total: totalSessions,
          percentage,
        };
      }),
    );

    return c.json({
      success: true,
      status_code: 200,
      summary,
    });
  } catch (error) {
    console.error("Error fetching attendance summary:", error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

attendance.get("/sessions", async (c) => {
  const creatorId = c.req.query("creatorId");
  if (!creatorId) {
    return createHonoErrorResponse(c, ERROR_CODES.INVALID_INPUT);
  }

  try {
    const sessions = await prisma.attendanceQRSession.findMany({
      where: { createdBy: creatorId },
      include: {
        course: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // We also need the attendance logs to know who was present
    const enhancedSessions = await Promise.all(
      sessions.map(async (session) => {
        const logs = await getOrSetCache(
          `attendanceLogs:session:${session.id}`,
          () =>
            prisma.attendanceLogs.findMany({
              where: { sessionId: session.id },
              include: {
                user: {
                  include: {
                    studentProfile: true,
                  },
                },
              },
            }),
          120,
        );

        // Ideally we would fetch ALL enrolled students and map their status,
        // but for now we'll just return the present ones, or mark the rest as absent if needed by the frontend.
        // To properly support the UI's 'editable list', we need all enrolled students.

        const enrolledStudents = await getOrSetCache(
          `userCourse:course:${session.courseId}`,
          () =>
            prisma.userCourse.findMany({
              where: { courseId: session.courseId },
              include: {
                user: {
                  include: {
                    studentProfile: true,
                  },
                },
              },
            }),
          120,
        );

        const students = enrolledStudents.map((enr) => {
          const isPresent = logs.some((log) => log.userId === enr.userId);
          return {
            id: enr.userId,
            name: enr.user.name,
            rollNo: enr.user.studentProfile?.admissionNumber || enr.userId,
            status: isPresent ? "present" : "absent",
          };
        });

        return {
          id: session.id,
          date: session.createdAt,
          courseCode:
            (session as unknown as { course?: { code: string; name: string } })
              .course?.code || "Unknown",
          courseName:
            (session as unknown as { course?: { code: string; name: string } })
              .course?.name || "Unknown Course",
          // Extract class/section from creator's first org or similar (mocking for now as per plan context)
          classId: "1",
          className: "Default Class",
          section: "A",
          durationMin: Math.round(
            (new Date(session.endTime).getTime() -
              new Date(session.startTime).getTime()) /
              60000,
          ),
          students,
        };
      }),
    );

    return c.json({
      success: true,
      status_code: 200,
      sessions: enhancedSessions,
    });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

attendance.patch("/sessions/:id/students", async (c) => {
  const sessionId = c.req.param("id");
  let body: { students: { id: string; status: "present" | "absent" | null }[] };

  try {
    body = await c.req.json();
    if (!body.students || !Array.isArray(body.students)) {
      return createHonoErrorResponse(c, ERROR_CODES.INVALID_INPUT);
    }
  } catch {
    return createHonoErrorResponse(c, ERROR_CODES.INVALID_INPUT);
  }

  try {
    // Process bulk updates in a transaction
    await prisma.$transaction(async (tx) => {
      for (const student of body.students) {
        if (student.status === "present") {
          // Add log if not exists
          const existing = await tx.attendanceLogs.findUnique({
            where: {
              sessionId_userId: {
                sessionId,
                userId: student.id,
              },
            },
          });
          if (!existing) {
            await tx.attendanceLogs.create({
              data: {
                sessionId,
                userId: student.id,
              },
            });
          }
        } else if (student.status === "absent" || student.status === null) {
          // Remove log if exists
          const existing = await tx.attendanceLogs.findUnique({
            where: {
              sessionId_userId: {
                sessionId,
                userId: student.id,
              },
            },
          });
          if (existing) {
            await tx.attendanceLogs.delete({
              where: {
                sessionId_userId: {
                  sessionId,
                  userId: student.id,
                },
              },
            });
          }
        }
      }
    });

    await invalidateCache(`attendanceLogs:session:${sessionId}`);

    return c.json({
      success: true,
      status_code: 200,
      message: "Attendance updated successfully",
    });
  } catch (error) {
    console.error("Error updating session attendance:", error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

export default attendance;

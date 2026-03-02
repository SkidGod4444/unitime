import { createHonoErrorResponse, ERROR_CODES } from "@/lib/error.codes";
import { generateQRToken, verifyQRToken } from "@/lib/qr.algo";
import { getOrSetCache, invalidateCache } from "@unitime/cache";
import { prisma } from "@unitime/db";
import { Hono } from "hono";

const attendance = new Hono();

attendance.post("/qr/session/create", async (c) => {
  const { courseId, creatorId, startTime, endTime, manualPresentIds, manualAbsentIds } = await c.req.json();
  if (!courseId || !creatorId || !startTime || !endTime) {
    return createHonoErrorResponse(c, ERROR_CODES.MISSING_REQUIRED_FIELD);
  }
  const manualIds = Array.isArray(manualPresentIds) ? manualPresentIds : [];
  const absentIds = Array.isArray(manualAbsentIds) ? manualAbsentIds : [];

  const courseDetails = await prisma.courses.findUnique({
    where: { id: courseId },
    select: { name: true, organizationId: true }
  });

  const qrSession = await prisma.attendanceQRSession.create({
    data: {
      courseId,
      createdBy: creatorId,
      startTime,
      endTime,
      markedUsers: manualIds.length > 0 ? manualIds : [],
    },
  });
  if (!qrSession.id) {
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }

  if (manualIds.length > 0) {
    try {
      await prisma.attendanceLogs.createMany({
        data: manualIds.map((userId: string) => ({
          sessionId: qrSession.id,
          userId,
          sessionType: "MANUAL_SESSION",
          markedAt: new Date(),
        })),
        skipDuplicates: true,
      });
      console.log(`Manually marked ${manualIds.length} students for session ${qrSession.id}`);
    } catch (err) {
      console.error("Failed to commit manual attendance logs during session create", err);
    }
  }

    if (manualIds.length > 0) {
      await prisma.historyLog.createMany({
        data: manualIds.map((userId: string) => ({
          title: "Manual Attendance (Present)",
          description: `You were manually marked Present for ${courseDetails?.name || 'your class'}.`,
          type: "ATTENDANCE",
          userId,
          organizationId: courseDetails?.organizationId || null,
        }))
      });

      await prisma.notification.createMany({
        data: manualIds.map((userId: string) => ({
          title: "Attendance Updated",
          body: `You were manually marked Present for ${courseDetails?.name || 'your class'}.`,
          type: "SYSTEM",
          userId,
          organizationId: courseDetails?.organizationId || null,
        }))
      });
    }

    if (absentIds.length > 0) {
      await prisma.historyLog.createMany({
        data: absentIds.map((userId: string) => ({
          title: "Manual Attendance (Absent)",
          description: `You were manually marked Absent for ${courseDetails?.name || 'your class'}.`,
          type: "ATTENDANCE",
          userId,
          organizationId: courseDetails?.organizationId || null,
        }))
      });

      await prisma.notification.createMany({
        data: absentIds.map((userId: string) => ({
          title: "Attendance Updated",
          body: `You were manually marked Absent for ${courseDetails?.name || 'your class'}.`,
          type: "SYSTEM",
          userId,
          organizationId: courseDetails?.organizationId || null,
        }))
      });
    }

  // Trigger parallel Push Notifications to enrolled students
  try {
    const enrolledStudents = await prisma.userCourse.findMany({
      where: { courseId: courseId },
      include: {
        user: {
          select: { id: true, expoPushToken: true }
        }
      }
    });

    const tokens = enrolledStudents
      .filter((enrollment) => {
        const uid = enrollment.user?.id;
        if (!uid || uid === creatorId) return false;
        if (manualIds.includes(uid) || absentIds.includes(uid)) return false;
        return true;
      })
      .map((enrollment) => enrollment.user?.expoPushToken)
      .filter(Boolean) as string[];

    if (tokens.length > 0) {
      const pushDetails = {
        sound: 'default',
        title: 'Attendance Started',
        body: `Attendance for ${courseDetails?.name || 'your class'} is now open! Please open the app to check in.`,
        data: { courseId: courseId, sessionId: qrSession.id },
      };

      // Expo Push API chunks requests, but for <100 tokens this bulk push is completely fine
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tokens.map(token => ({ to: token, ...pushDetails })))
      }).catch(console.error);
    }
  } catch (pushErr) {
    console.error("Failed to push notifications:", pushErr);
  }

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

/**
 * Calculates the great-circle distance between two points on the Earth.
 * Returns distance in meters.
 */
function haversineDistance(coords1: { lat: number; lng: number }, coords2: { lat: number; lng: number }) {
  const R = 6371e3; // Earth radius in meters
  const toRadian = (angle: number) => (Math.PI / 180) * angle;

  const dLat = toRadian(coords2.lat - coords1.lat);
  const dLon = toRadian(coords2.lng - coords1.lng);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadian(coords1.lat)) * Math.cos(toRadian(coords2.lat)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; 
}

attendance.post("/checkin", async (c) => {
  const { sessionId, userId, coordinates } = await c.req.json();
  if (!sessionId || !userId || !coordinates || !coordinates.lat || !coordinates.lng) {
    return createHonoErrorResponse(c, ERROR_CODES.MISSING_REQUIRED_FIELD);
  }

  try {
    const session = await prisma.attendanceQRSession.findUnique({
      where: { id: sessionId },
      include: { user: true } // The professor who created it
    });

    if (!session || session.status !== "ACTIVE") {
      return c.json({ success: false, message: "Session is invalid or inactive" }, 400);
    }

    if (!session.user.coordinates) {
       return c.json({ success: false, message: "Professor location is not broadcasted. Cannot verify." }, 400);
    }
    
    // Parse creator coordinates "lat,lng"
    const [profLatStr, profLngStr] = session.user.coordinates.split(",");
    const profCoords = { lat: parseFloat(profLatStr), lng: parseFloat(profLngStr) };
    
    // Verify distance
    const distanceMeters = haversineDistance(coordinates, profCoords);
    const THRESHOLD_METERS = 75; // 75 meters geofence leeway
    
    if (distanceMeters > THRESHOLD_METERS) {
      console.log(`[Check-in Failed] User ${userId} is ${distanceMeters.toFixed(1)}m away from class.`);
      return c.json({ success: false, message: "You are too far from the classroom to check in." }, 400);
    }

    // Check if duplicate
    const existing = await prisma.attendanceLogs.findUnique({
      where: { sessionId_userId: { sessionId, userId } }
    });
    
    if (existing) {
       return c.json({ success: true, message: "Attendance already verified" }, 200);
    }

    // Save attendance
    await prisma.attendanceLogs.create({
      data: {
        sessionId,
        userId,
        sessionType: "TAP_SESSION",
        markedAt: new Date(),
      }
    });
    
    // Add user to the markedUsers array for the session to prevent routing loops
    await prisma.attendanceQRSession.update({
      where: { id: sessionId },
      data: {
        markedUsers: {
          push: userId
        }
      }
    });

    // Background aggregation: Update attendance_summary asynchronously
    (async () => {
      try {
        const courseId = session.courseId;
        const totalSessions = await prisma.attendanceQRSession.count({
          where: { courseId },
        });

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

        const percentage = totalSessions === 0 ? 100 : Math.round((attendedSessions / totalSessions) * 100);

        await prisma.attendanceSummary.upsert({
          where: {
            userId_courseId: {
              userId,
              courseId,
            }
          },
          update: {
            attended: attendedSessions,
            total: totalSessions,
            percentage
          },
          create: {
            userId,
            courseId,
            attended: attendedSessions,
            total: totalSessions,
            percentage
          }
        });
        console.log(`[Background Job] Updated attendance summary for user ${userId} in course ${courseId}`);
      } catch (aggrError) {
        console.error("Failed to aggregate attendance in background:", aggrError);
      }
    })();
    
    // Important: Invalidate cache for realtime updates
    await invalidateCache(`attendanceLogs:session:${sessionId}`);
    await invalidateCache(`dashboard:${userId}`);
    
    return c.json({ success: true, message: "Attendance Marked Successfully" }, 200);

  } catch (error) {
    console.error("Error during manual check-in:", error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
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

attendance.get("/sessions/all", async (c) => {
  try {
    const attendanceSessions = await getOrSetCache(
      "attendanceQRSessions:all",
      () => prisma.attendanceQRSession.findMany({
        include: {
          user: true,
          course: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      120,
    );

    const enhancedSessions = await Promise.all(
      attendanceSessions.map(async (session) => {
        const logs = await prisma.attendanceLogs.findMany({
          where: { sessionId: session.id },
        });

        const enrolledStudents = await prisma.userCourse.findMany({
          where: { courseId: session.courseId },
          include: {
            user: { include: { studentProfile: true } },
          },
        });

        const formattedLogs = enrolledStudents.map((enr) => {
          const isPresent = logs.some((log) => log.userId === enr.userId);
          return {
            studentId: enr.userId,
            student: { name: enr.user.name },
            status: isPresent ? "present" : "absent",
          };
        });

        return { ...session, logs: formattedLogs };
      })
    );

    return c.json(
      {
        success: true,
        status_code: 200,
        sessions: enhancedSessions,
      },
      200,
    );
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
            // Add to markedUsers string array
            const session = await tx.attendanceQRSession.findUnique({ where: { id: sessionId } });
            if (session && !session.markedUsers.includes(student.id)) {
              await tx.attendanceQRSession.update({
                where: { id: sessionId },
                data: {
                  markedUsers: {
                    push: student.id
                  }
                }
              });
            }
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
            
            // Remove from markedUsers array 
            const session = await tx.attendanceQRSession.findUnique({ where: { id: sessionId } });
            if (session && session.markedUsers.includes(student.id)) {
               const newMarkedUsers = session.markedUsers.filter(id => id !== student.id);
               await tx.attendanceQRSession.update({
                  where: { id: sessionId },
                  data: {
                    markedUsers: newMarkedUsers
                  }
               });
            }
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

attendance.get("/sessions/:id/export", async (c) => {
  const sessionId = c.req.param("id");

  try {
    const session = await prisma.attendanceQRSession.findUnique({
      where: { id: sessionId },
      include: {
        course: true,
      }
    });

    if (!session) {
      return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
    }

    const logs = await prisma.attendanceLogs.findMany({
      where: { sessionId },
    });

    const enrolledStudents = await prisma.userCourse.findMany({
      where: { courseId: session.courseId },
      include: {
        user: { include: { studentProfile: true } },
      },
    });

    const headers = [
      "Student Name",
      "Admission Number",
      "Email ID",
      "Contact Number",
      "Status",
    ];

    const csvRows = [headers.join(",")];

    for (const enr of enrolledStudents) {
      const isPresent = logs.some((log) => log.userId === enr.userId);
      const profile = enr.user.studentProfile;
      
      const row = [
        `"${enr.user.name || ""}"`,
        `"${profile?.admissionNumber || ""}"`,
        `"${profile?.studentEmail || enr.user.email || ""}"`,
        `"${profile?.contactNumber || ""}"`,
        isPresent ? "Present" : "Absent",
      ];
      
      csvRows.push(row.join(","));
    }

    const csvString = csvRows.join("\n");

    const response = new Response(csvString);
    response.headers.set("Content-Type", "text/csv");
    response.headers.set("Content-Disposition", `attachment; filename="attendance_${session.course.code}.csv"`);
    return response;

  } catch (error) {
    console.error("Error exporting session:", error);
    return createHonoErrorResponse(c, ERROR_CODES.QUERY_FAILED);
  }
});

export default attendance;

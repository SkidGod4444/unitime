import { useAuth } from "@/contexts/auth.cntxt";
import { useLocalStore } from "@/contexts/localstore.cntxt";
import { apiFetch } from "@/lib/api";
import * as Notifications from "expo-notifications";
import { useRouter, useSegments } from "expo-router";
import { useEffect, useRef } from "react";
import { Alert, AppState, AppStateStatus } from "react-native";

export function AttendanceListener() {
  const router = useRouter();
  const { loggedInUser } = useAuth();
  const { getItem } = useLocalStore();
  const redirectingRef = useRef(false);

  // IMPORTANT: useSegments must be called at the top of the component
  // so both useEffects below have a stable, non-undefined reference.
  const segments = useSegments();

  // BACKGROUND & SYSTEM TRAY LISTENER (Expo Push Notifications)
  useEffect(() => {
    // This listener is fired whenever a user taps on or interacts with a notification
    // (works when app is backgrounded or killed)
    const responseListener =
      Notifications.addNotificationResponseReceivedListener(
        async (response) => {
          const data = response.notification.request.content.data;
          if (data && data.sessionId && data.courseId && loggedInUser?.id) {
            // Check local cache
            const markedStr = await getItem("MARKED_SESSIONS");
            const markedIds = markedStr ? JSON.parse(markedStr) : [];
            if (markedIds.includes(data.sessionId)) {
              console.log(
                "Ignored Push Notification tap: Session already marked locally.",
              );
              return;
            }

            // If user already attempted this session, don't auto-redirect again
            const attemptedStr = await getItem("ATTEMPTED_SESSIONS");
            const attemptedIds = attemptedStr ? JSON.parse(attemptedStr) : [];
            if (attemptedIds.includes(data.sessionId)) {
              console.log(
                "Ignored Push Notification tap: User already attempted this session.",
              );
              return;
            }

            try {
              const res = await apiFetch(`/dashboard/${loggedInUser.id}`, {
                headers: {
                  "Cache-Control": "no-cache",
                  Pragma: "no-cache",
                  Expires: "0",
                },
              });
              if (res.ok) {
                const json = await res.json();
                if (json.success) {
                  const dashboardCourses = Array.isArray(json.data.courses)
                    ? json.data.courses
                    : [];
                  const currentEnrolledIds = dashboardCourses.map(
                    (c: any) => c.id,
                  );

                  if (!currentEnrolledIds.includes(data.courseId)) {
                    console.log(
                      "Ignored Push Notification tap: User is not officially enrolled in this course.",
                    );
                    return;
                  }

                  // Verify expiration
                  const activeSessions = Array.isArray(json.data.activeSessions)
                    ? json.data.activeSessions
                    : [];
                  const validSession = activeSessions.find(
                    (s: any) => s.id === data.sessionId,
                  );

                  if (!validSession) {
                    console.log(
                      "Ignored Push Notification tap: Session no longer active.",
                    );
                    Alert.alert(
                      "Session Expired",
                      "This attendance session is no longer active.",
                    );
                    return;
                  }

                  const now = new Date();
                  const endTime = new Date(validSession.endTime);
                  const graceEndTime = new Date(endTime.getTime() + 120 * 1000);
                  if (now > graceEndTime) {
                    console.log(
                      "Ignored Push Notification tap: Session time has expired.",
                    );
                    Alert.alert(
                      "Session Expired",
                      "This attendance session has ended.",
                    );
                    return;
                  }
                }
              }
            } catch (e) {
              console.warn(
                "Failed to check push notification course validity, proceeding carefully...",
                e,
              );
              return;
            }

            // Use Array.includes for robust route check regardless of stack depth
            const alreadyOnTapToMark =
              Array.isArray(segments) &&
              (segments as string[]).includes("tap-to-mark");
            if (!redirectingRef.current && !alreadyOnTapToMark) {
              console.log(
                "Push Notification tapped! Routing directly to tap-to-mark...",
              );
              redirectingRef.current = true;
              setTimeout(() => {
                router.push(
                  `/tap-to-mark?sessionId=${data.sessionId}&courseName=${data.courseId}`,
                );
                setTimeout(() => {
                  redirectingRef.current = false;
                }, 800);
              }, 300);
            } else {
              console.log(
                "Ignored Push Notification tap: Already on tap-to-mark screen.",
              );
            }
          }
        },
      );

    return () => {
      responseListener.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, loggedInUser?.id, segments]);

  // FOREGROUND PULL (Active App / Refresh Fallback)
  useEffect(() => {
    if (!loggedInUser?.id) return;

    const checkActiveSessions = async () => {
      try {
        const res = await apiFetch(`/dashboard/${loggedInUser.id}`, {
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
            Expires: "0",
          },
        });
        if (!res.ok) return;

        const json = await res.json();
        if (json.success && json.data?.activeSessions?.length > 0) {
          const dashboardCourses = Array.isArray(json.data.courses)
            ? json.data.courses
            : [];
          const currentEnrolledIds = dashboardCourses.map((c: any) => c.id);

          // Find the first active session the student is enrolled in
          const validSession = json.data.activeSessions.find((session: any) =>
            currentEnrolledIds.includes(session.courseId),
          );

          if (validSession) {
            const now = new Date();
            const endTime = new Date(validSession.endTime);
            const graceEndTime = new Date(endTime.getTime() + 120 * 1000);

            if (now > graceEndTime) {
              console.log(
                "Foreground listener ignored active session: session time has expired.",
              );
              return;
            }

            const markedStr = await getItem("MARKED_SESSIONS");
            const markedIds = markedStr ? JSON.parse(markedStr) : [];
            if (markedIds.includes(validSession.id)) {
              console.log(
                "Foreground listener ignored active session: already marked locally.",
              );
              return;
            }

            const attemptedStr = await getItem("ATTEMPTED_SESSIONS");
            const attemptedIds = attemptedStr ? JSON.parse(attemptedStr) : [];
            if (attemptedIds.includes(validSession.id)) {
              console.log(
                "Foreground listener ignored active session: user already attempted.",
              );
              return;
            }

            const courseName =
              validSession.course?.name || validSession.courseId;
            const courseCode = validSession.course?.code || "";
            const endTimeISO = validSession.endTime || "";
            const startTimeISO = validSession.startTime || "";
            console.log("Found Active Session on Foreground:", validSession.id);

            // Use Array.includes for robust check that works at any route stack depth
            const alreadyOnTapToMark =
              Array.isArray(segments) &&
              (segments as string[]).includes("tap-to-mark");
            if (!redirectingRef.current && !alreadyOnTapToMark) {
              redirectingRef.current = true;
              router.push(
                `/tap-to-mark?sessionId=${validSession.id}&courseName=${encodeURIComponent(courseName)}&courseCode=${encodeURIComponent(courseCode)}&endTime=${encodeURIComponent(endTimeISO)}&startTime=${encodeURIComponent(startTimeISO)}`,
              );
              setTimeout(() => {
                redirectingRef.current = false;
              }, 800);
            } else {
              console.log("Ignored redirect: Already on tap-to-mark screen.");
            }
          }
        }
      } catch (err) {
        console.warn("Foreground active session check failed:", err);
      }
    };

    // 1. Check immediately upon mount
    checkActiveSessions();

    // 2. Add an AppState listener if they minimize and reopen within the window
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "active") {
          checkActiveSessions();
        }
      },
    );

    return () => {
      subscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedInUser?.id, router, segments]);

  return null; // This component is strictly logic/listeners, no UI
}

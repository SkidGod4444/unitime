import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/auth.cntxt";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useSegments } from "expo-router";
import * as Notifications from "expo-notifications";
import React, { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";

export default function AttendanceListener() {
  const { loggedInUser } = useAuth();
  const segments = useSegments();
  const redirectingRef = useRef(false);

  const checkActiveSessions = React.useCallback(async () => {
    if (!loggedInUser?.id || redirectingRef.current) return;

    // Don't auto-redirect if already on a related screen
    const currentPath = segments.join("/");
    if (
      currentPath.includes("tap-to-mark") ||
      currentPath.includes("attendance-session-form")
    ) {
      return;
    }

    try {
      const res = await apiFetch(`/dashboard/${loggedInUser.id}`, {
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.activeSessions?.length > 0) {
          const session = json.data.activeSessions[0];
          const markedStr = await AsyncStorage.getItem("MARKED_SESSIONS");
          const markedIds = markedStr ? JSON.parse(markedStr) : [];

          if (!markedIds.includes(session.id)) {
            redirectingRef.current = true;
            router.push({
              pathname: "/tap-to-mark",
              params: {
                sessionId: session.id,
                courseName: session.course?.name || "Class",
              },
            } as any);
            setTimeout(() => {
              redirectingRef.current = false;
            }, 2000);
          }
        }
      }
    } catch (err) {
      console.warn("Foreground active session check failed:", err);
    }
  }, [loggedInUser?.id, segments]);

  useEffect(() => {
    // 1. Notification Received (Foreground)
    const notificationListener = Notifications.addNotificationReceivedListener(
      (_notif) => {
        checkActiveSessions(); // Bug 11: Foreground polling/check on notification
      },
    );

    // 2. Notification Response (Tap)
    const responseListener =
      Notifications.addNotificationResponseReceivedListener(
        async (response) => {
          const data = response.notification.request.content.data;
          if (data?.sessionId) {
            // Bug 3: Ensure we have courseName for the destination
            let courseName = data.courseName || "Class";
            if (!data.courseName && data.courseId) {
              try {
                const res = await apiFetch(`/courses/${data.courseId}`);
                if (res.ok) {
                  const course = await res.json();
                  courseName = course.name;
                }
              } catch (_e) {}
            }

            router.push({
              pathname: "/tap-to-mark",
              params: { sessionId: data.sessionId, courseName },
            } as any);
          }
        },
      );

    // 3. AppState change (Minimize/Reopen) - Bug 13
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "active") {
          checkActiveSessions();
        }
      },
    );

    // Initial check
    checkActiveSessions();

    return () => {
      notificationListener.remove();
      responseListener.remove();
      subscription.remove();
    };
  }, [loggedInUser?.id, checkActiveSessions]);

  return null;
}

import { useAuth } from "@/contexts/auth.cntxt";
import { useLocalStore } from "@/contexts/localstore.cntxt";
import * as Notifications from "expo-notifications";
import { useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { AppState, AppStateStatus } from "react-native";

export function AttendanceListener() {
  const router = useRouter();
  const { loggedInUser } = useAuth();
  const { getItem } = useLocalStore();
  // BACKGROUND & SYSTEM TRAY LISTENER (Expo Push Notifications)
  useEffect(() => {
    // This listener is fired whenever a user taps on or interacts with a notification 
    // (works when app is backgrounded or killed)
    const responseListener = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const data = response.notification.request.content.data;
      if (data && data.sessionId && data.courseId && loggedInUser?.id) {
         // Check local cache
         const markedStr = await getItem("MARKED_SESSIONS");
         const markedIds = markedStr ? JSON.parse(markedStr) : [];
         if (markedIds.includes(data.sessionId)) {
            console.log("Ignored Push Notification tap: Session already marked locally.");
            return;
         }

          try {
            const origin = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/v1";
            const res = await fetch(`${origin}/dashboard/${loggedInUser.id}`, {
               headers: {
                 "Cache-Control": "no-cache",
                 "Pragma": "no-cache",
                 "Expires": "0"
               }
            });
            if (res.ok) {
              const json = await res.json();
              if (json.success) {
                const dashboardCourses = Array.isArray(json.data.courses) ? json.data.courses : [];
                const currentEnrolledIds = dashboardCourses.map((c: any) => c.id);
                
                if (!currentEnrolledIds.includes(data.courseId)) {
                  console.log("Ignored Push Notification tap: User is not officially enrolled in this course.");
                  return;
                }
              }
            }
          } catch (e) {
             console.warn("Failed to check push notification course validity, proceeding carefully...", e);
          }


         console.log("Push Notification tapped! Routing directly to tap-to-mark...");
         setTimeout(() => {
            router.push(`/tap-to-mark?sessionId=${data.sessionId}&courseName=${data.courseId}`);
         }, 300);
      }
    });

    return () => {
      responseListener.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, loggedInUser?.id]);

  const segments = useSegments();

  // FOREGROUND PULL (Active App / Refresh Fallback)
  // When user opens the app, pull the active sessions from the unified dashboard endpoint
  useEffect(() => {
    if (!loggedInUser?.id) return;

    const checkActiveSessions = async () => {
      try {
        const origin = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/v1";
        // The dashboard endpoint was built in Phase 1 to contain everything
        const res = await fetch(`${origin}/dashboard/${loggedInUser.id}`, {
           headers: {
             "Cache-Control": "no-cache",
             "Pragma": "no-cache",
             "Expires": "0"
           }
        });
        if (!res.ok) return;
        
        const json = await res.json();
        if (json.success && json.data?.activeSessions?.length > 0) {
          // The dashboard endpoint explicitly returns the user's `.courses`
          const dashboardCourses = Array.isArray(json.data.courses) ? json.data.courses : [];
          const currentEnrolledIds = dashboardCourses.map((c: any) => c.id);

          // Find the first active session the student is enrolled in
          const validSession = json.data.activeSessions.find((session: any) => 
            currentEnrolledIds.includes(session.courseId)
          );

          if (validSession) {
             const markedStr = await getItem("MARKED_SESSIONS");
             const markedIds = markedStr ? JSON.parse(markedStr) : [];
             if (markedIds.includes(validSession.id)) {
                console.log("Foreground listener ignored active session: already marked locally.");
                return;
             }
             
             const courseName = validSession.course?.name || validSession.courseId;
             console.log("Found Active Session on Foreground:", validSession.id);
             
             // Ensure we are not already on the page before auto-redirecting
             const currentRoute = segments[segments.length - 1];
             if (currentRoute !== "tap-to-mark") {
               router.push(`/tap-to-mark?sessionId=${validSession.id}&courseName=${courseName}`);
             } else {
               console.log("Ignored redirect: Already on tap-to-mark screen.");
             }
          }
        }
      } catch (err) {
        console.warn("Foreground active session check failed:", err);
      }
    };

    // 1. Check immediately upon mount (if app loads fully open)
    checkActiveSessions();

    // 2. Add an AppState listener if they minimize and reopen within the window
    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        checkActiveSessions();
      }
    });

    return () => {
      subscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedInUser?.id, router]);

  return null; // This component is strictly logic/listeners, no UI
}

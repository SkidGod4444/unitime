import { useAuth } from "@/contexts/auth.cntxt";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";

export function AttendanceListener() {
  const router = useRouter();
  const { loggedInUser } = useAuth();
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  
  // Track enrollment natively for quick checks when an event arrives
  useEffect(() => {
    if (loggedInUser && (loggedInUser as any).courses) {
       const userAny = loggedInUser as any;
       const courseIds = Array.isArray(userAny.courses) ? userAny.courses.map((c: any) => c.courseId) : [];
       setEnrolledCourseIds(courseIds);
    } else {
       setEnrolledCourseIds([]);
    }
  }, [loggedInUser]);

  // BACKGROUND & SYSTEM TRAY LISTENER (Expo Push Notifications)
  useEffect(() => {
    // This listener is fired whenever a user taps on or interacts with a notification 
    // (works when app is backgrounded or killed)
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data && data.sessionId && data.courseId) {
         console.log("Push Notification tapped! Routing directly to tap-to-mark...");
         setTimeout(() => {
            router.push(`/tap-to-mark?sessionId=${data.sessionId}&courseName=${data.courseId}`);
         }, 300);
      }
    });

    return () => {
      responseListener.remove();
    };
  }, [router]);

  return null; // This component is strictly logic/listeners, no UI
}

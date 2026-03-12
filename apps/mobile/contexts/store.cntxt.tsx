import { apiFetch } from "@/lib/api";
import {
  useAttendanceStore,
  useCoursesStore,
  useLabGroupsStore,
  useOrgsStore,
  useProfilesStore,
  useTimetableStore,
  useUsersStore,
} from "@/lib/store";
import { useEnrollmentStore } from "@/lib/store/enrollment";
import { useHistoryStore } from "@/lib/store/history";
import { useNotificationsStore } from "@/lib/store/notifications";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useSegments } from "expo-router";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Alert,
  AppState,
  Modal,
  Platform,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "./auth.cntxt";
import { useLocalStore } from "./localstore.cntxt";

type StoreContextType = {
  refresh: (isManual?: boolean) => Promise<void>;
  loading: boolean;
};

const StoreContext = createContext<StoreContextType>({
  refresh: async () => {},
  loading: false,
});

export const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(false);
  const [rateLimitedFeatures, setRateLimitedFeatures] = useState<string[]>([]);
  const { loggedInUser } = useAuth();
  const { getItem } = useLocalStore();
  const router = useRouter();
  const segments = useSegments() as string[];
  const lastRefreshedAt = useRef<number>(0);
  const redirectingToTapRef = useRef(false);

  const handleActiveSessions = async (bundleData?: {
    activeSessions?: any[];
    courses?: any[];
  }) => {
    try {
      const sessions = Array.isArray(bundleData?.activeSessions)
        ? bundleData!.activeSessions
        : [];
      if (sessions.length === 0) return;

      const dashboardCourses = Array.isArray(bundleData?.courses)
        ? bundleData!.courses
        : [];
      const currentEnrolledIds = dashboardCourses.map((c: any) => c.id);

      const validSession = sessions.find((session: any) =>
        currentEnrolledIds.includes(session.courseId),
      );
      if (!validSession) return;

      const now = new Date();
      const endTime = new Date(validSession.endTime);
      const graceEndTime = new Date(endTime.getTime() + 120 * 1000);
      if (now > graceEndTime) {
        console.log("Bundle active session ignored: session expired.");
        return;
      }

      const markedStr = await getItem("MARKED_SESSIONS");
      const markedIds = markedStr ? JSON.parse(markedStr) : [];
      if (markedIds.includes(validSession.id)) {
        console.log("Bundle active session ignored: already marked locally");
        return;
      }

      const attemptedStr = await getItem("ATTEMPTED_SESSIONS");
      const attemptedIds = attemptedStr ? JSON.parse(attemptedStr) : [];
      if (attemptedIds.includes(validSession.id)) {
        console.log("Bundle active session ignored: user already attempted.");
        return;
      }

      const isOnTapToMark =
        Array.isArray(segments) && segments.includes("tap-to-mark");
      if (!isOnTapToMark && !redirectingToTapRef.current) {
        const courseName = validSession.course?.name || validSession.courseId;
        redirectingToTapRef.current = true;
        console.log("Bundle contains Active Session:", validSession.id);
        router.push(
          `/tap-to-mark?sessionId=${validSession.id}&courseName=${courseName}`,
        );
        setTimeout(() => {
          redirectingToTapRef.current = false;
        }, 800);
      } else {
        console.log(
          "Bundle active session ignored: already on tap-to-mark or redirecting.",
        );
      }
    } catch (err) {
      console.warn("handleActiveSessions failed:", err);
    }
  };

  const { fetchUsers } = useUsersStore();
  const { fetchProfiles } = useProfilesStore();
  const { fetchOrgs } = useOrgsStore();

  const { fetchTimetable, setTimetables } = useTimetableStore();
  const { fetchSummary, fetchSessions, setSummary } = useAttendanceStore();
  const { fetchCourses } = useCoursesStore();
  const { fetchEnrollments } = useEnrollmentStore();
  const { fetchNotifications } = useNotificationsStore();
  const { fetchHistoryLogs } = useHistoryStore();

  const refresh = React.useCallback(
    async (isManual: boolean = true) => {
      // Throttle manual refreshes to max 1 per 10 seconds
      const now = Date.now();
      if (now - lastRefreshedAt.current < 10000) {
        if (isManual) {
          console.log("Throttling manual refresh");
          if (Platform.OS === "android") {
            ToastAndroid.show(
              "Please wait a moment before refreshing again.",
              ToastAndroid.SHORT,
            );
          } else {
            Alert.alert(
              "Refreshing too fast",
              "Please wait a few seconds before refreshing again.",
            );
          }
        }
        return;
      }
      lastRefreshedAt.current = now;

      setLoading(true);

      let bundleSucceeded = false;

      // 1) Try dashboard bundle first
      if (!bundleSucceeded && loggedInUser?.id) {
        try {
          const res = await apiFetch(`/dashboard/${loggedInUser.id}/bundle`, {
            headers: {
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
              Expires: "0",
            },
          });
          if (res.ok) {
            const json = await res.json();
            const data = json?.data || {};
            bundleSucceeded = true;
            await handleActiveSessions(json?.data);
            if (Array.isArray(data.timetable)) setTimetables(data.timetable);
            if (Array.isArray(data.attendanceSummary))
              setSummary(data.attendanceSummary);
            if (data.notifications?.items) {
              // Optimistically set notifications state
              useNotificationsStore.setState({
                notifications: data.notifications.items,
                loading: false,
                error: null,
              });
            }
            if (Array.isArray(data.history)) {
              useHistoryStore.setState({
                logs: data.history,
                loading: false,
                error: null,
              });
            }
            // also refresh personal tickets/feedbacks
          } else {
            // Fallback to legacy per-endpoint calls
            await Promise.allSettled([
              fetchTimetable(loggedInUser.id),
              fetchSummary(loggedInUser.id),
              fetchNotifications(loggedInUser.id),
              fetchHistoryLogs(loggedInUser.id),
            ]);
          }
        } catch {
          // Network error → fallback
          await Promise.allSettled([
            fetchTimetable(loggedInUser.id),
            fetchSummary(loggedInUser.id),
            fetchNotifications(loggedInUser.id),
            fetchHistoryLogs(loggedInUser.id),
          ]);
        }
      }

      // 2) Gate heavy admin/prof fetches by role
      const role = loggedInUser?.role;
      const adminOrProf = role === "ADMIN" || role === "PROFESSOR";
      // const adminOrRep = role === "ADMIN" || role === "REPRESENTATIVE";

      await Promise.allSettled([
        ...(adminOrProf ? [fetchUsers()] : []),
        // Always fetch profiles so student's organization is known in UI filters
        fetchProfiles(),
        // Always fetch courses so students see newly created ones
        fetchCourses(),
        ...(adminOrProf ? [fetchOrgs(), fetchSessions()] : []),
      ]);

      // Fetch enrollments and set lab group if applicable (depends on profiles resolving first)
      if (loggedInUser) {
        const uProfiles = useProfilesStore.getState().profiles;
        const userProfile = uProfiles.find((p) => p.userId === loggedInUser.id);

        // 1. Sync the logged-in user's assigned lab group to the local store
        if (userProfile?.labGroupId) {
          useLabGroupsStore.setState({ myLabGroupId: userProfile.labGroupId });
        }

        // 2. Fetch enrollments for admins/reps based on their organization
        if (
          loggedInUser.role === "ADMIN" ||
          loggedInUser.role === "REPRESENTATIVE"
        ) {
          const organizationId = userProfile?.organizationId || null;
          if (!organizationId && loggedInUser.role === "ADMIN") {
            await fetchEnrollments();
          } else if (organizationId) {
            await fetchEnrollments(organizationId);
          }
        }
      }

      // Active Session Fallback Check for "Pull to Refresh"
      if (!bundleSucceeded && loggedInUser?.id) {
        try {
          const dashRes = await apiFetch(`/dashboard/${loggedInUser.id}`, {
            headers: {
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
              Expires: "0",
            },
          });
          if (dashRes.ok) {
            const dashData = await dashRes.json();

            if (dashData.success && dashData.data?.activeSessions?.length > 0) {
              // The dashboard endpoint explicitly returns the user's `.courses`
              const dashboardCourses = Array.isArray(dashData.data.courses)
                ? dashData.data.courses
                : [];
              const currentEnrolledIds = dashboardCourses.map((c: any) => c.id);

              const validSession = dashData.data.activeSessions.find(
                (session: any) => currentEnrolledIds.includes(session.courseId),
              );

              if (validSession) {
                // Expiry guard using same 120s grace as listener/backend
                const now = new Date();
                const endTime = new Date(validSession.endTime);
                const graceEndTime = new Date(endTime.getTime() + 120 * 1000);
                if (now > graceEndTime) {
                  console.log(
                    "Pull-to-refresh fallback ignored: session expired.",
                  );
                } else {
                  const markedStr = await getItem("MARKED_SESSIONS");
                  const markedIds = markedStr ? JSON.parse(markedStr) : [];
                  if (markedIds.includes(validSession.id)) {
                    console.log(
                      "Pull-to-refresh fallback ignored session: already marked locally",
                    );
                  } else {
                    const attemptedStr = await getItem("ATTEMPTED_SESSIONS");
                    const attemptedIds = attemptedStr
                      ? JSON.parse(attemptedStr)
                      : [];
                    if (attemptedIds.includes(validSession.id)) {
                      console.log(
                        "Pull-to-refresh fallback ignored: user already attempted.",
                      );
                    } else {
                      const isOnTapToMark =
                        Array.isArray(segments) &&
                        segments.includes("tap-to-mark");
                      if (!isOnTapToMark && !redirectingToTapRef.current) {
                        const courseName =
                          validSession.course?.name || validSession.courseId;
                        redirectingToTapRef.current = true;
                        console.log(
                          "Pull-to-refresh caught Active Session:",
                          validSession.id,
                        );
                        router.push(
                          `/tap-to-mark?sessionId=${validSession.id}&courseName=${courseName}`,
                        );
                        setTimeout(() => {
                          redirectingToTapRef.current = false;
                        }, 800);
                      } else {
                        console.log(
                          "Pull-to-refresh ignored: already on tap-to-mark or redirecting.",
                        );
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (err) {
          console.warn("Manual refresh active session check failed:", err);
        }
      }

      setLoading(false);
    },
    [
      fetchUsers,
      fetchProfiles,
      fetchOrgs,
      fetchCourses,
      fetchTimetable,
      fetchSummary,
      fetchSessions,
      fetchEnrollments,
      fetchHistoryLogs,
      fetchNotifications,
      getItem,
      loggedInUser,
      router,
      segments,
    ],
  );

  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (loggedInUser?.id) {
      refresh(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedInUser?.id]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        if (loggedInUser?.id) {
          refresh(false);
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [loggedInUser?.id, refresh]);

  useEffect(() => {
    const originalFetch = global.fetch;
    global.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 429) {
        const urlStr =
          typeof args[0] === "string" ? args[0] : (args[0] as Request).url;
        const lowerUrlStr = urlStr.toLowerCase();
        let feature = "Data";

        if (lowerUrlStr.includes("timetable")) feature = "Timetable";
        else if (lowerUrlStr.includes("dashboard")) feature = "Dashboard";
        else if (lowerUrlStr.includes("attendance")) feature = "Attendance";
        else if (lowerUrlStr.includes("users")) feature = "Users";
        else if (lowerUrlStr.includes("courses")) feature = "Courses";
        else if (
          lowerUrlStr.includes("orgs") ||
          lowerUrlStr.includes("classes")
        )
          feature = "Classes";
        else if (lowerUrlStr.includes("profiles")) feature = "Profiles";
        else if (lowerUrlStr.includes("enrollments")) feature = "Enrollments";
        else if (lowerUrlStr.includes("history")) feature = "History";
        else if (lowerUrlStr.includes("alarms")) feature = "Alarms";
        else if (lowerUrlStr.includes("notifications"))
          feature = "Notifications";
        else {
          try {
            const urlPath = new URL(urlStr).pathname;
            const segments = urlPath.split("/").filter(Boolean);
            for (let i = segments.length - 1; i >= 0; i--) {
              const seg = segments[i];
              if (
                seg !== "v1" &&
                seg !== "api" &&
                !seg.includes("_") &&
                !seg.includes("-") &&
                seg.length > 2
              ) {
                feature = seg.charAt(0).toUpperCase() + seg.slice(1);
                break;
              }
            }
          } catch {}
        }

        setRateLimitedFeatures((prev) => {
          if (!prev.includes(feature)) {
            return [...prev, feature];
          }
          return prev;
        });
      }
      return response;
    };
    return () => {
      global.fetch = originalFetch;
    };
  }, []);

  return (
    <StoreContext.Provider value={{ refresh, loading }}>
      {children}

      <Modal
        visible={rateLimitedFeatures.length > 0}
        transparent
        animationType="fade"
        onRequestClose={() => setRateLimitedFeatures([])}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.iconContainer}>
              <Ionicons name="hourglass-outline" size={32} color="#f97316" />
            </View>
            <Text style={styles.titleText}>Rate Limit Reached</Text>
            <Text style={styles.messageText}>
              You have been rate limited. Please try accessing later.{" "}
              <Text style={styles.featureText}>
                {rateLimitedFeatures.join(", ")}
              </Text>{" "}
              data is not available right now.
            </Text>
            <TouchableOpacity
              onPress={() => setRateLimitedFeatures([])}
              style={styles.button}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Understood</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </StoreContext.Provider>
  );
};

export const useStore = () => useContext(StoreContext);

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    zIndex: 9999,
    elevation: 9999,
  },
  modalContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#ffedd5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  titleText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  messageText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
    opacity: 0.9,
  },
  featureText: {
    fontWeight: "bold",
    color: "#374151",
  },
  button: {
    backgroundColor: "#f97316",
    width: "100%",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
});

import {
    useAttendanceStore,
    useCoursesStore,
    useOrgsStore,
    useProfilesStore,
    useTimetableStore,
    useUsersStore,
} from "@/lib/store";
import { useEnrollmentStore } from "@/lib/store/enrollment";
import { Ionicons } from "@expo/vector-icons";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Alert, Modal, Platform, StyleSheet, Text, ToastAndroid, TouchableOpacity, View } from "react-native";
import { useAuth } from "./auth.cntxt";

type StoreContextType = {
  refresh: () => Promise<void>;
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
  const lastRefreshedAt = useRef<number>(0);

  const { fetchUsers } = useUsersStore();
  const { fetchProfiles } = useProfilesStore();
  const { fetchOrgs } = useOrgsStore();

  const { fetchTimetable } = useTimetableStore();
  const { fetchSummary, fetchSessions } = useAttendanceStore();
  const { fetchCourses } = useCoursesStore();
  const { fetchEnrollments } = useEnrollmentStore();

  const refresh = React.useCallback(async () => {
    // Throttle manual refreshes to max 1 per 10 seconds
    const now = Date.now();
    if (now - lastRefreshedAt.current < 10000) {
      console.log("Throttling manual refresh");
      if (Platform.OS === "android") {
        ToastAndroid.show("Please wait a moment before refreshing again.", ToastAndroid.SHORT);
      } else {
        Alert.alert("Refreshing too fast", "Please wait a few seconds before refreshing again.");
      }
      return;
    }
    lastRefreshedAt.current = now;

    setLoading(true);
    await Promise.allSettled([
      fetchUsers(),
      fetchProfiles(),
      fetchOrgs(),
      fetchCourses(),
      ...(loggedInUser?.id ? [fetchTimetable(loggedInUser.id)] : []),
      ...(loggedInUser?.id ? [fetchSummary(loggedInUser.id)] : []),
      ...(loggedInUser?.id && loggedInUser.role === "PROFESSOR"
        ? [fetchSessions(loggedInUser.id)]
        : []),
    ]);

    // Fetch enrollments if applicable (depends on profiles resolving first)
    if (loggedInUser?.role === 'ADMIN' || loggedInUser?.role === 'REPRESENTATIVE') {
      const uProfiles = useProfilesStore.getState().profiles;
      const userProfile = uProfiles.find((p) => p.userId === loggedInUser.id);
      const organizationId = userProfile?.organizationId || null;

      if (!organizationId && loggedInUser.role === 'ADMIN') {
         await fetchEnrollments();
      } else if (organizationId) {
         await fetchEnrollments(organizationId);
      }
    }

    setLoading(false);
  }, [
    fetchUsers,
    fetchProfiles,
    fetchOrgs,
    fetchCourses,
    fetchTimetable,
    fetchSummary,
    fetchSessions,
    fetchEnrollments,
    loggedInUser?.id,
    loggedInUser?.role,
  ]);

  useEffect(() => {
    if (loggedInUser) {
      refresh();
    }

    if (loggedInUser) {
      const interval = setInterval(async () => {
        console.log("Refreshing secondary data (attendance/timetable)...");
        if (loggedInUser.id) {
          fetchSummary(loggedInUser.id);
          fetchTimetable(loggedInUser.id);
          if (loggedInUser.role === "PROFESSOR") {
            fetchSessions(loggedInUser.id);
          }
        }
      }, 30 * 1000); // Wait 30s instead of 10s for intensive DB calls

      return () => clearInterval(interval);
    }
  }, [loggedInUser, fetchSessions, fetchSummary, fetchTimetable, refresh]);

  useEffect(() => {
    const originalFetch = global.fetch;
    global.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 429) {
        const urlStr =
          typeof args[0] === "string" ? args[0] : (args[0] as Request).url;
        let feature = "This feature";
        
        if (urlStr.includes("timetable")) feature = "Timetable";
        else if (urlStr.includes("attendance")) feature = "Attendance";
        else if (urlStr.includes("users")) feature = "Users";
        else if (urlStr.includes("courses")) feature = "Courses";
        else if (urlStr.includes("orgs") || urlStr.includes("classes")) feature = "Classes";
        else if (urlStr.includes("profiles")) feature = "Profiles";

        if (feature === "This feature") {
            const urlPath = new URL(urlStr).pathname;
            const segments = urlPath.split('/').filter(Boolean);
            if (segments.length > 0) {
              const lastSegment = segments[segments.length - 1];
              feature = lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1);
            }
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

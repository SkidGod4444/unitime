import { useAuth } from "@/contexts/auth.cntxt";
import { useLocalStore } from "@/contexts/localstore.cntxt";
import { useRefresh } from "@/hooks/use-refresh";
import {
  useAttendanceStore,
  useFeedbacksStore,
  useTimetableStore,
} from "@/lib/store";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ATTENDANCE_EXPANDED_KEY = "@attendance-card-expanded";

export default function Index() {
  const router = useRouter();
  const { getItem, setItem } = useLocalStore();
  const [expanded, setExpanded] = useState(true);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackCategory, setFeedbackCategory] = useState<
    "BUG" | "UX" | "FEATURE" | "OTHER"
  >("OTHER");
  const { loggedInUser } = useAuth();
  const { refresh, refreshing } = useRefresh();

  // Load saved state on mount
  useEffect(() => {
    const loadState = async () => {
      const savedState = await getItem(ATTENDANCE_EXPANDED_KEY);
      if (savedState !== null) {
        setExpanded(savedState === "true");
      }
    };
    loadState();
  }, [getItem]);

  const toggleExpand = () => {
    const newState = !expanded;
    setExpanded(newState);
    setItem(ATTENDANCE_EXPANDED_KEY, newState.toString());
  };

  // Biometric auth before entering admin panel.
  // Falls back to device PIN/password if fingerprint is not enrolled
  // (unlike QR scanner which is biometric-only).
  const authenticateForAdmin = async (): Promise<boolean> => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        // No biometric hardware — allow with device passcode
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Authenticate to access Admin Panel",
          cancelLabel: "Cancel",
          disableDeviceFallback: false,
        });
        return result.success;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to access Admin Panel",
        cancelLabel: "Cancel",
        // If enrolled: prefer biometrics but allow device PIN as fallback.
        // If not enrolled: device PIN/password is the only option.
        disableDeviceFallback: false,
      });

      if (result.success) return true;

      if (result.error !== "user_cancel" && result.error !== "system_cancel") {
        Alert.alert(
          "Authentication Failed",
          isEnrolled
            ? "Biometric authentication failed. Please try again."
            : "Device authentication failed. Please try again.",
          [{ text: "OK" }],
        );
      }
      return false;
    } catch (error) {
      console.error("Admin auth error:", error);
      // Allow on unexpected error to avoid blocking
      return true;
    }
  };

  const handleAdminPress = async () => {
    const authenticated = await authenticateForAdmin();
    if (authenticated) router.push("/admin");
  };

  const { fetchSummary, summary } = useAttendanceStore();
  const { timetables, loading, fetchWeekTimetable } = useTimetableStore();
  const { createFeedback } = useFeedbacksStore();

  // Fetch full weekly timetable for all screens
  useEffect(() => {
    if (loggedInUser?.id) {
      fetchWeekTimetable(loggedInUser.id);
      fetchSummary(loggedInUser.id);
    }
  }, [loggedInUser?.id, fetchWeekTimetable, fetchSummary]);

  const validSummary = summary.filter((s) => s.total > 0);
  const totalAttended = validSummary.reduce(
    (acc, curr) => acc + curr.attended,
    0,
  );
  const totalHeld = validSummary.reduce((acc, curr) => acc + curr.total, 0);
  const overall =
    totalHeld > 0 ? Math.round((totalAttended / totalHeld) * 100) : 0;

  const dayNames = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ];
  const todayDay = dayNames[new Date().getDay()];

  // Filter unified store by today explicitly
  const todayTimetables = timetables.filter(
    (t) => t.day.toUpperCase().trim() === todayDay,
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    if (hour < 21) return "Good Evening";
    return "Good Night";
  };

  // Map timetable items for quick dashboard view with dynamic status
  const todaysSchedule = [...todayTimetables]
    .map((t) => {
      // Robust time parsing helper
      const parseTime = (timeInput: string | Date) => {
        if (!timeInput)
          return { sortVal: 0, display: "TBD", date: new Date(0) };
        const d = new Date(timeInput);
        if (!isNaN(d.getTime()) && String(timeInput).includes("T")) {
          return {
            sortVal: d.getHours() * 60 + d.getMinutes(),
            display: d.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }),
            date: d,
          };
        }
        // Fallback for "HH:MM AM/PM" strings
        const match = String(timeInput).match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (match) {
          let h = parseInt(match[1]);
          const m = parseInt(match[2]);
          const ampm = match[3].toUpperCase();
          if (ampm === "PM" && h !== 12) h += 12;
          if (ampm === "AM" && h === 12) h = 0;
          const today = new Date();
          const date = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
            h,
            m,
          );
          return { sortVal: h * 60 + m, display: timeInput, date };
        }
        return { sortVal: 0, display: String(timeInput), date: new Date(0) };
      };

      const start = parseTime(t.startTime);
      const end = parseTime(t.endTime);
      const now = new Date();

      let status: "Ongoing" | "Past" | "Upcoming" = "Upcoming";
      if (now >= start.date && now <= end.date) {
        status = "Ongoing";
      } else if (now > end.date) {
        status = "Past";
      }

      const colors = {
        Ongoing: "border-l-blue-500",
        Upcoming: "border-l-indigo-500",
        Past: "border-l-gray-300",
      };

      const badgeColors = {
        Ongoing:
          "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
        Upcoming:
          "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400",
        Past: "bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-500",
      };

      return {
        id: t.id,
        time: `${start.display} - ${end.display}`,
        subject: t.course?.name || "Unknown",
        courseCode: t.course?.code || "",
        classType: t.course?.classType || "Lecture",
        room: t.location || "TBA",
        status,
        color: colors[status],
        badgeStyle: badgeColors[status],
        sortVal: start.sortVal,
      };
    })
    .sort((a, b) => a.sortVal - b.sortVal)
    .filter((item) => item.status !== "Past")
    .slice(0, 5);

  return (
    <SafeAreaView
      className="flex-1 bg-background dark:bg-zinc-900"
      edges={["top"]}
    >
      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100, gap: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
      >
        {/* Header Section */}
        <View className="flex-row justify-between items-center mt-4">
          <TouchableOpacity
            className="flex-row items-center gap-3"
            onPress={() => router.push("/profile")}
          >
            <View className="h-14 w-14 rounded-full bg-gray-200 justify-center items-center overflow-hidden">
              <Image
                source={
                  loggedInUser?.image
                    ? { uri: loggedInUser.image }
                    : require("../../assets/images/pfp-face.png")
                }
                className="h-full w-full rounded-full"
              />
            </View>
            <View>
              <Text className="text-gray-500 dark:text-zinc-400 font-medium text-sm">
                {getGreeting()},
              </Text>
              <Text className="text-zinc-900 dark:text-zinc-100 font-lora font-bold text-xl">
                {loggedInUser?.name || "John Doe"}
              </Text>
            </View>
          </TouchableOpacity>
          {loggedInUser && loggedInUser.role === "ADMIN" ? (
            <TouchableOpacity
              onPress={handleAdminPress}
              className="bg-white dark:bg-zinc-900 p-2.5 rounded-full shadow-sm border border-gray-100 dark:border-zinc-800"
            >
              <Ionicons name="settings-outline" size={24} color="#18181B" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => setFeedbackVisible(true)}
              className="bg-white dark:bg-zinc-900 p-2.5 rounded-full shadow-sm border border-gray-100 dark:border-zinc-800"
            >
              <Ionicons name="heart-outline" size={24} color="#F33A6A" />
            </TouchableOpacity>
          )}
        </View>

        {/* Status Overview Cards */}
        <View className="gap-4">
          {/* Expandable Attendance Card */}
          <TouchableOpacity
            onPress={toggleExpand}
            activeOpacity={0.9}
            className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm relative overflow-hidden w-full"
          >
            <View className="flex-row justify-between items-start">
              <View>
                <View className="flex-row items-center mb-2">
                  <View className="bg-blue-50 p-1.5 rounded-lg mr-2">
                    <Ionicons
                      name="pie-chart-outline"
                      size={18}
                      color="#2563EB"
                    />
                  </View>
                  <Text className="text-gray-600 dark:text-zinc-300 font-medium text-xs uppercase tracking-wider">
                    Overall Attendance
                  </Text>
                </View>
                <Text className="text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                  {overall}%
                </Text>
              </View>
              <View
                className={`bg-blue-50 p-2 rounded-full ${expanded ? "rotate-180" : ""}`}
              >
                <Ionicons name="chevron-down" size={20} color="#2563EB" />
              </View>
            </View>

            <View className="flex-row items-center mb-1">
              <View className="h-2 flex-1 bg-gray-100 rounded-full overflow-hidden">
                <View
                  className="h-full bg-blue-600 rounded-full"
                  style={{ width: `${overall}%` }}
                />
              </View>
            </View>
            <Text className="text-xs text-gray-400 dark:text-zinc-400 mb-2">
              Target: 75% • You are doing great!
            </Text>

            {expanded && summary.length > 0 && (
              <View className="mt-4 pt-4 border-t border-gray-100 gap-3">
                {summary.map((item, index) => (
                  <View
                    key={index}
                    className="flex-row items-center justify-between"
                  >
                    <View className="flex-1 mr-4">
                      <View className="flex-row justify-between mb-1 items-center">
                        <View className="flex-row items-center flex-1 pr-2">
                          <Text
                            className="text-sm font-semibold text-gray-700 dark:text-zinc-200"
                            numberOfLines={1}
                            style={{ flexShrink: 1 }}
                          >
                            {item.courseName}
                          </Text>
                          {item.classType === "LAB" && (
                            <View className="bg-purple-100 dark:bg-purple-500/20 px-1.5 py-0.5 rounded ml-2">
                              <Text className="text-[10px] font-bold text-purple-700 dark:text-purple-400">
                                LAB
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text
                          className={`text-xs font-bold ${item.total === 0 ? "text-gray-400" : item.percentage >= 75 ? "text-green-600" : "text-red-500"}`}
                        >
                          {item.total === 0 ? 0 : item.percentage}%
                        </Text>
                      </View>
                      <View className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <View
                          className={`h-full rounded-full ${item.total === 0 ? "bg-gray-300" : item.percentage >= 75 ? "bg-green-500" : "bg-red-500"}`}
                          style={{
                            width: `${item.total === 0 ? 0 : item.percentage}%`,
                          }}
                        />
                      </View>
                      <Text className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">
                        {item.attended}/{item.total} Classes
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Actions Grid */}
        <View>
          <Text className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4 font-lora">
            Quick Actions
          </Text>
          <View className="flex-row flex-wrap justify-between gap-y-4">
            {[
              {
                icon: "calendar-outline",
                label: "Timetable",
                color: "text-purple-600",
                bg: "bg-purple-50",
                route: "/schedule",
                visible: true,
              },
              {
                icon: "book-outline",
                label: "My Courses",
                color: "text-green-600",
                bg: "bg-green-50",
                route: "/my-courses",
                visible: true,
              },
              {
                icon: "alarm-outline",
                label: "Alarm",
                color: "text-red-600",
                bg: "bg-red-50",
                route: "/alarm",
                visible: true,
              },
              {
                icon: "alarm-outline",
                label: "TTM",
                color: "text-red-600",
                bg: "bg-red-50",
                route: "/tap-to-mark",
                visible: true,
              },
            ]
              .filter((action) => action.visible)
              .map((action, index) => (
                <TouchableOpacity
                  key={index}
                  className="w-[48%] bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm flex-row items-center gap-3"
                  onPress={() =>
                    action.route && router.push(action.route as any)
                  }
                >
                  <View
                    className={`h-10 w-10 ${action.bg} rounded-full justify-center items-center`}
                  >
                    <Ionicons
                      name={action.icon as any}
                      size={20}
                      className={action.color}
                      style={{
                        color:
                          action.color === "text-blue-600"
                            ? "#2563EB"
                            : action.color === "text-purple-600"
                              ? "#9333EA"
                              : action.color === "text-yellow-600"
                                ? "#D97706"
                                : action.color === "text-green-600"
                                  ? "#10B981"
                                  : "#E11D48",
                      }}
                    />
                  </View>
                  <Text className="font-semibold text-gray-700 dark:text-zinc-200">
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>
        </View>

        {/* Admin/CR/Teacher Actions Grid */}
        {loggedInUser &&
          (loggedInUser.role === "REPRESENTATIVE" ||
            loggedInUser.role === "ADMIN" ||
            loggedInUser.role === "PROFESSOR") && (
            <View>
              <Text className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4 font-lora">
                Manage Attendance
              </Text>
              <View className="flex-row flex-wrap justify-between gap-y-4">
                {[
                  {
                    icon: "timer-outline",
                    label: "Session",
                    color: "text-blue-600",
                    bg: "bg-blue-50",
                    route: "/attendance-session-form",
                  },
                  {
                    icon: "time-outline",
                    label: "History",
                    color: "text-purple-600",
                    bg: "bg-purple-50",
                    route: "/attendance-session-history",
                  },
                ].map((action, index) => (
                  <TouchableOpacity
                    key={index}
                    className="w-[48%] bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm flex-row items-center gap-3"
                    onPress={() =>
                      action.route && router.push(action.route as any)
                    }
                  >
                    <View
                      className={`h-10 w-10 ${action.bg} rounded-full justify-center items-center`}
                    >
                      <Ionicons
                        name={action.icon as any}
                        size={20}
                        className={action.color}
                        style={{
                          color:
                            action.color === "text-blue-600"
                              ? "#2563EB"
                              : action.color === "text-purple-600"
                                ? "#9333EA"
                                : action.color === "text-yellow-600"
                                  ? "#CA8A04"
                                  : "#E11D48",
                        }}
                      />
                    </View>
                    <Text className="font-semibold text-gray-700 dark:text-zinc-200">
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

        {/* CR Actions Grid */}
        {loggedInUser &&
          (loggedInUser.role === "REPRESENTATIVE" ||
            loggedInUser.role === "ADMIN") && (
            <View>
              <Text className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4 font-lora">
                Manage Courses
              </Text>
              <View className="flex-row flex-wrap justify-between gap-y-4">
                {[
                  {
                    icon: "people-circle-outline",
                    label: "Requests",
                    color: "text-amber-600",
                    bg: "bg-amber-50",
                    route: "/manage-requests",
                  },
                  {
                    icon: "book-outline",
                    label: "Courses",
                    color: "text-green-600",
                    bg: "bg-green-50",
                    route: "/manage-org-courses",
                  },
                ].map((action, index) => (
                  <TouchableOpacity
                    key={index}
                    className="w-[48%] bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm flex-row items-center gap-3"
                    onPress={() =>
                      action.route && router.push(action.route as any)
                    }
                  >
                    <View
                      className={`h-10 w-10 ${action.bg} rounded-full justify-center items-center`}
                    >
                      <Ionicons
                        name={action.icon as any}
                        size={20}
                        className={action.color}
                        style={{
                          color:
                            action.color === "text-blue-600"
                              ? "#2563EB"
                              : action.color === "text-purple-600"
                                ? "#9333EA"
                                : action.color === "text-yellow-600"
                                  ? "#CA8A04"
                                  : "#E11D48",
                        }}
                      />
                    </View>
                    <Text className="font-semibold text-gray-700">
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

        {/* Timetable Management Grid */}
        {loggedInUser &&
          (loggedInUser.role === "REPRESENTATIVE" ||
            loggedInUser.role === "ADMIN") && (
            <View>
              <Text className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4 font-lora">
                Manage Timetable
              </Text>
              <View className="flex-row flex-wrap justify-between gap-y-4">
                {[
                  {
                    icon: "calendar-number-outline",
                    label: "Manage",
                    color: "text-indigo-600",
                    bg: "bg-indigo-50",
                    route: "/manage-timetable",
                  },
                  {
                    icon: "list-outline",
                    label: "View Week",
                    color: "text-teal-600",
                    bg: "bg-teal-50",
                    route: "/schedule",
                  },
                ].map((action, index) => (
                  <TouchableOpacity
                    key={index}
                    className="w-[48%] bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm flex-row items-center gap-3"
                    onPress={() =>
                      action.route && router.push(action.route as any)
                    }
                  >
                    <View
                      className={`h-10 w-10 ${action.bg} rounded-full justify-center items-center`}
                    >
                      <Ionicons
                        name={action.icon as any}
                        size={20}
                        className={action.color}
                        style={{
                          color:
                            action.color === "text-indigo-600"
                              ? "#4F46E5"
                              : "#0D9488",
                        }}
                      />
                    </View>
                    <Text className="font-semibold text-gray-700 dark:text-zinc-200">
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

        {/* Recent Announcements */}
        <View className="gap-3 mt-2">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-lg font-bold text-zinc-900 dark:text-zinc-100 font-lora">
              Recent Announcements
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/annc" as any)}
              className="px-3 py-1 rounded-full border border-primary"
            >
              <Text className="text-primary text-sm font-medium">View All</Text>
            </TouchableOpacity>
          </View>
          <View className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden flex-col">
            <View className="bg-gray-50 dark:bg-zinc-800 p-6 items-center justify-center border border-gray-100 dark:border-zinc-800 border-dashed m-2 rounded-2xl">
              <Text className="text-gray-500 font-medium my-2">
                No announcements yet!
              </Text>
            </View>
          </View>
        </View>

        {/* Today's Schedule */}
        <View>
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-zinc-900 dark:text-zinc-100 font-lora">
              Today&apos;s Timetable
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/schedule")}
              className="px-3 py-1 rounded-full border border-primary"
            >
              <Text className="text-primary text-sm font-medium">View All</Text>
            </TouchableOpacity>
          </View>

          <View className="gap-4">
            {loading ? (
              <Text className="text-center text-gray-500 dark:text-zinc-400 py-4">
                Loading schedule...
              </Text>
            ) : todaysSchedule.length === 0 ? (
              <View className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden flex-col">
                <View className="bg-gray-50 dark:bg-zinc-800 p-6 items-center justify-center border border-gray-100 dark:border-zinc-800 border-dashed m-2 rounded-2xl">
                  <Text className="text-gray-500 font-medium my-2">
                    No classes today!
                  </Text>
                </View>
              </View>
            ) : (
              todaysSchedule.map((item) => (
                <View
                  key={item.id}
                  className={`bg-white dark:bg-zinc-900 p-4 rounded-3xl border-l-4 ${item.color} shadow-sm flex-row justify-between items-center border border-gray-100 dark:border-zinc-800`}
                >
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 mb-1">
                      <Text className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">
                        {item.time}
                      </Text>
                      {item.courseCode && (
                        <>
                          <View className="w-1 h-1 rounded-full bg-gray-300" />
                          <Text className="text-[10px] text-primary font-bold">
                            {item.courseCode}
                          </Text>
                        </>
                      )}
                    </View>
                    <Text
                      numberOfLines={1}
                      className="text-base font-bold text-zinc-900 dark:text-zinc-100"
                    >
                      {item.subject}
                    </Text>
                    <View className="flex-row items-center mt-1.5 gap-3">
                      <View className="flex-row items-center gap-1">
                        <Ionicons
                          name="location-outline"
                          size={12}
                          color="#6B7280"
                        />
                        <Text className="text-xs text-gray-500">
                          {item.room}
                        </Text>
                      </View>
                      <View className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                        <Text className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                          {item.classType}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View
                    className={`${item.badgeStyle} px-3 py-1.2 rounded-full`}
                  >
                    <Text className="text-[10px] font-bold uppercase tracking-wider">
                      {item.status}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Feedback Modal */}
      <Modal
        visible={feedbackVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFeedbackVisible(false)}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setFeedbackVisible(false)}
            className="flex-1 bg-black/75 justify-end"
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                bounces={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ flexGrow: 1 }}
              >
                <View className="bg-white dark:bg-zinc-900 w-full rounded-t-[32px] p-8 pb-10 items-center shadow-2xl">
                  {/* Handle bar */}
                  <View className="w-12 h-1.5 bg-gray-200 rounded-full mb-6" />

                  {/* Icon */}
                  <View className="h-20 w-20 bg-pink-50 rounded-full items-center justify-center mb-5 border-[6px] border-pink-100">
                    <Ionicons name="heart" size={36} color="#F33A6A" />
                  </View>

                  {/* Title */}
                  <Text className="text-2xl font-bold text-zinc-900 font-lora text-center mb-2 dark:text-zinc-100">
                    Send Feedback
                  </Text>

                  {/* Subtitle */}
                  <Text className="text-gray-500 dark:text-zinc-400 text-center mb-5 leading-6 px-2">
                    We&apos;d love to hear from you! Share your thoughts to help
                    us improve.
                  </Text>

                  {/* Category selector */}
                  <View className="w-full mb-3">
                    <Text className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-2">
                      Category
                    </Text>
                    <View className="flex-row gap-2 flex-wrap">
                      {(["BUG", "UX", "FEATURE", "OTHER"] as const).map(
                        (cat) => {
                          const active = feedbackCategory === cat;
                          return (
                            <TouchableOpacity
                              key={cat}
                              className={`px-3 py-1.5 rounded-full border ${active ? "bg-pink-100 border-pink-200" : "bg-gray-100 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700"}`}
                              onPress={() => setFeedbackCategory(cat)}
                            >
                              <Text
                                className={`text-xs font-bold ${active ? "text-pink-700" : "text-gray-600 dark:text-zinc-300"}`}
                              >
                                {cat}
                              </Text>
                            </TouchableOpacity>
                          );
                        },
                      )}
                    </View>
                  </View>

                  {/* Text Input */}
                  <View className="w-full mb-5">
                    <TextInput
                      className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-2xl p-4 text-gray-900 dark:text-zinc-100 min-h-[120px] text-base"
                      placeholder="Tell us what you think..."
                      placeholderTextColor="#9CA3AF"
                      multiline
                      textAlignVertical="top"
                      value={feedbackText}
                      onChangeText={setFeedbackText}
                    />
                  </View>

                  {/* Action buttons */}
                  <View className="w-full gap-3">
                    <TouchableOpacity
                      activeOpacity={0.85}
                      className="bg-blue-600 w-full py-3.5 rounded-2xl flex-row items-center justify-center shadow-lg shadow-blue-200 active:scale-[0.98] gap-2"
                      onPress={async () => {
                        if (!feedbackText.trim()) {
                          Alert.alert(
                            "Feedback required",
                            "Please enter your feedback message.",
                          );
                          return;
                        }
                        try {
                          const fb = await createFeedback(
                            feedbackText.trim(),
                            feedbackCategory,
                          );
                          if (!fb) {
                            Alert.alert(
                              "Failed",
                              "Could not submit feedback. Please try again.",
                            );
                            return;
                          }
                          Alert.alert(
                            "Thank You!",
                            "Your feedback has been submitted.",
                          );
                          setFeedbackVisible(false);
                          setFeedbackText("");
                          setFeedbackCategory("OTHER");
                        } catch (e) {
                          console.error(e);
                          Alert.alert(
                            "Failed",
                            "Network error while submitting feedback.",
                          );
                        }
                      }}
                    >
                      <Text
                        numberOfLines={1}
                        className="text-white font-bold text-base text-center flex-shrink"
                      >
                        Submit Feedback
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      className="bg-gray-100 dark:bg-zinc-800 w-full py-3.5 rounded-2xl items-center justify-center active:scale-[0.98]"
                      onPress={() => {
                        setFeedbackVisible(false);
                        setFeedbackText("");
                      }}
                    >
                      <Text
                        numberOfLines={1}
                        className="text-gray-600 dark:text-zinc-300 font-bold text-base text-center"
                      >
                        Cancel
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

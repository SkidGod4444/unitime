import { useAuth } from "@/contexts/auth.cntxt";
import { useLocalStore } from "@/contexts/localstore.cntxt";
import { useRefresh } from "@/hooks/use-refresh";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ATTENDANCE_EXPANDED_KEY = "@attendance-card-expanded";

export default function Index() {
  const router = useRouter();
  const { getItem, setItem } = useLocalStore();
  const [expanded, setExpanded] = useState(true);
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

  const subjectAttendance = [
    { subject: "Mathematics", percentage: 92, attended: 18, total: 20 },
    { subject: "Physics", percentage: 78, attended: 14, total: 18 },
    { subject: "Chemistry", percentage: 85, attended: 17, total: 20 },
    { subject: "Computer Science", percentage: 95, attended: 19, total: 20 },
    { subject: "English", percentage: 88, attended: 22, total: 25 },
  ];

  const overall = Math.round(
    subjectAttendance.reduce((acc, curr) => acc + curr.percentage, 0) /
      subjectAttendance.length,
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
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
              <Text className="text-gray-500 font-medium text-sm">
                Welcome back,
              </Text>
              <Text className="text-dark font-lora font-bold text-xl">
                {loggedInUser?.name || "John Doe"}
              </Text>
            </View>
          </TouchableOpacity>
          {loggedInUser && loggedInUser.role === "ADMIN" && (
            <TouchableOpacity
              onPress={handleAdminPress}
              className="bg-white p-2.5 rounded-full shadow-sm border border-gray-100"
            >
              <Ionicons name="settings-outline" size={24} color="#18181B" />
            </TouchableOpacity>
          )}
        </View>

        {/* Status Overview Cards */}
        <View className="gap-4">
          {/* Expandable Attendance Card */}
          <TouchableOpacity
            onPress={toggleExpand}
            activeOpacity={0.9}
            className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden w-full"
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
                  <Text className="text-gray-600 font-medium text-xs uppercase tracking-wider">
                    Overall Attendance
                  </Text>
                </View>
                <Text className="text-4xl font-bold text-dark mb-1">
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
            <Text className="text-xs text-gray-400 mb-2">
              Target: 75% • You are doing great!
            </Text>

            {expanded && (
              <View className="mt-4 pt-4 border-t border-gray-100 gap-3">
                {subjectAttendance.map((item, index) => (
                  <View
                    key={index}
                    className="flex-row items-center justify-between"
                  >
                    <View className="flex-1 mr-4">
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-sm font-semibold text-gray-700">
                          {item.subject}
                        </Text>
                        <Text
                          className={`text-xs font-bold ${item.percentage >= 75 ? "text-green-600" : "text-red-500"}`}
                        >
                          {item.percentage}%
                        </Text>
                      </View>
                      <View className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <View
                          className={`h-full rounded-full ${item.percentage >= 75 ? "bg-green-500" : "bg-red-500"}`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </View>
                      <Text className="text-[10px] text-gray-400 mt-0.5">
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
          <Text className="text-lg font-bold text-dark mb-4 font-lora">
            Quick Actions
          </Text>
          <View className="flex-row flex-wrap justify-between gap-y-4">
            {[
              {
                icon: "scan-outline",
                label: "Scan QR",
                color: "text-blue-600",
                bg: "bg-blue-50",
                route: "/qr-scanner",
              },
              {
                icon: "calendar-outline",
                label: "Timetable",
                color: "text-purple-600",
                bg: "bg-purple-50",
                route: "/schedule",
              },
              {
                icon: "alarm-outline",
                label: "Alarm",
                color: "text-red-600",
                bg: "bg-red-50",
                route: "/alarm",
              },
              {
                icon: "chatbox-outline",
                label: "TTM",
                color: "text-green-600",
                bg: "bg-green-50",
                route: "/tap-to-mark",
              },
            ].map((action, index) => (
              <TouchableOpacity
                key={index}
                className="w-[48%] bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex-row items-center gap-3"
                onPress={() => action.route && router.push(action.route as any)}
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

        {/* Admin/CR/Teacher Actions Grid */}
        {loggedInUser &&
          (loggedInUser.role === "REPRESENTATIVE" ||
            loggedInUser.role === "ADMIN" ||
            loggedInUser.role === "PROFESSOR") && (
            <View>
              <Text className="text-lg font-bold text-dark mb-4 font-lora">
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
                    className="w-[48%] bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex-row items-center gap-3"
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

        {/* Today's Schedule */}
        <View>
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-dark font-lora">
              Today&apos;s Schedule
            </Text>
            <TouchableOpacity>
              <Text className="text-primary text-sm font-medium">See All</Text>
            </TouchableOpacity>
          </View>

          <View className="gap-4">
            {[
              {
                time: "09:00 AM",
                subject: "Mathematics",
                room: "Room 302",
                status: "Upcoming",
                color: "border-l-blue-500",
              },
              {
                time: "10:30 AM",
                subject: "Physics",
                room: "Lab 2",
                status: "Upcoming",
                color: "border-l-green-500",
              },
              {
                time: "01:00 PM",
                subject: "Computer Science",
                room: "Lab 1",
                status: "Upcoming",
                color: "border-l-purple-500",
              },
            ].map((item, index) => (
              <View
                key={index}
                className={`bg-white p-4 rounded-3xl border-l-4 ${item.color} shadow-sm flex-row justify-between items-center border border-gray-100`}
              >
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 font-medium mb-1">
                    {item.time}
                  </Text>
                  <Text className="text-base font-bold text-dark">
                    {item.subject}
                  </Text>
                  <View className="flex-row items-center mt-1 gap-1">
                    <Ionicons
                      name="location-outline"
                      size={12}
                      color="#6B7280"
                    />
                    <Text className="text-xs text-gray-500">{item.room}</Text>
                  </View>
                </View>
                <View className="bg-gray-50 px-3 py-1 rounded-full">
                  <Text className="text-xs font-medium text-gray-600">
                    {item.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

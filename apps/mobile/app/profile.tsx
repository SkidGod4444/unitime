import { useAuth } from "@/contexts/auth.cntxt";
import {
  useAttendanceStore,
  useOrgsStore,
  useProfilesStore,
  useThemeStore,
} from "@/lib/store";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Updates from "expo-updates";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Profile() {
  const router = useRouter();
  const [isCheckingUpdates, setIsCheckingUpdates] = React.useState(false);
  const { theme, toggleTheme } = useThemeStore();
  const { logout, loggedInUser } = useAuth();
  const { profiles } = useProfilesStore();
  const { orgs } = useOrgsStore();
  const myProfile = profiles.find((p) => p.userId === loggedInUser?.id);
  const myOrg = orgs.find((o) => o.id === myProfile?.organizationId);

  const handleCheckForUpdates = async () => {
    if (__DEV__) {
      Alert.alert(
        "Development Mode",
        "Updates are not available in development mode.",
      );
      return;
    }

    setIsCheckingUpdates(true);
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        Alert.alert(
          "Update Available",
          "A new version of the app is available. Would you like to download and install it?",
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => setIsCheckingUpdates(false),
            },
            {
              text: "Update",
              onPress: async () => {
                try {
                  await Updates.fetchUpdateAsync();
                  Alert.alert(
                    "Update Ready",
                    "The update has been downloaded. The app will now restart to apply the changes.",
                    [
                      {
                        text: "OK",
                        onPress: async () => {
                          // Apply the update without wiping local data.
                          Updates.reloadAsync();
                        },
                      },
                    ],
                  );
                } catch {
                  Alert.alert(
                    "Error",
                    "Failed to fetch the update. Please try again later.",
                  );
                } finally {
                  setIsCheckingUpdates(false);
                }
              },
            },
          ],
        );
      } else {
        Alert.alert("Up to Date", "You are already using the latest version.");
        setIsCheckingUpdates(false);
      }
    } catch (error) {
      console.error("Update check failed:", error);
      Alert.alert(
        "Error",
        "Failed to check for updates. Please check your internet connection.",
      );
      setIsCheckingUpdates(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-zinc-900" edges={["top"]}>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />

      {/* Header */}
      <View className="px-5 py-2 flex-row items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="h-10 w-10 bg-gray-50 dark:bg-zinc-800 rounded-full items-center justify-center"
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme === "dark" ? "#E5E7EB" : "#374151"}
          />
        </TouchableOpacity>
        <Text className="text-lg font-bold font-lora text-zinc-900 dark:text-zinc-100">
          My Profile
        </Text>
        <TouchableOpacity className="h-10 w-10 bg-gray-50 dark:bg-zinc-800 rounded-full items-center justify-center">
          <Ionicons
            name="settings-outline"
            size={22}
            color={theme === "dark" ? "#E5E7EB" : "#374151"}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Profile Card */}
        <View className="mx-5 mt-5 rounded-3xl overflow-hidden border border-gray-100 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
          {/* Top Banner */}
          <View className="h-20 bg-primary/10 dark:bg-primary/20 w-full" />

          {/* Avatar overlapping the banner */}
          <View className="items-center -mt-12 pb-5 px-5">
            <View className="relative">
              <View className="h-24 w-24 rounded-full bg-white dark:bg-zinc-900 p-1.5 border-2 border-white dark:border-zinc-900 shadow-md">
                <Image
                  source={
                    loggedInUser?.image
                      ? { uri: loggedInUser.image }
                      : require("../assets/images/pfp-face.png")
                  }
                  className="h-full w-full rounded-full"
                />
              </View>
              <TouchableOpacity className="absolute bottom-0 right-0 bg-primary h-7 w-7 rounded-full items-center justify-center border-2 border-white dark:border-zinc-900 shadow-sm">
                <Ionicons name="camera" size={14} color="white" />
              </TouchableOpacity>
            </View>

            {/* Name */}
            <Text className="text-xl font-bold font-lora text-zinc-900 dark:text-zinc-100 mt-3">
              {loggedInUser?.name || "John Doe"}
            </Text>
            <Text className="text-sm text-gray-400 dark:text-zinc-400 mt-0.5">
              {loggedInUser?.email}
            </Text>

            {/* Admission number pill */}
            <View className="flex-row items-center gap-1.5 mt-2.5 bg-primary/10 dark:bg-primary/20 px-4 py-1.5 rounded-full">
              <Ionicons name="id-card-outline" size={13} color="#2563EB" />
              <Text className="text-primary font-bold text-xs tracking-wider">
                ID: {myProfile?.admissionNumber ?? "—"}
              </Text>
            </View>

            {/* Info rows — column layout so long text wraps properly */}
            <View className="w-full mt-5 rounded-2xl overflow-hidden border border-gray-100 dark:border-zinc-800">
              {[
                {
                  icon: "business-outline",
                  label: "Department",
                  value:
                    myOrg?.departmentName || myProfile?.department || "N/A",
                  color: "#2563EB",
                  bg: "#EFF6FF",
                },
                {
                  icon: "book-outline",
                  label: "Course",
                  value: myOrg?.courseName || myProfile?.course || "N/A",
                  color: "#7C3AED",
                  bg: "#F5F3FF",
                },
                {
                  icon: "people-outline",
                  label: "Section",
                  value: myOrg?.section ? `Sec: ${myOrg.section}` : "N/A",
                  color: "#059669",
                  bg: "#ECFDF5",
                },
              ].map((row, i, arr) => (
                <View
                  key={row.label}
                  className={`flex-row items-center justify-start px-4 py-3 bg-white dark:bg-zinc-900 ${i !== arr.length - 1 ? "border-b border-gray-100 dark:border-zinc-800" : ""}`}
                >
                  <View
                    className="h-8 w-8 rounded-full items-center justify-center shrink-0"
                    style={{ backgroundColor: row.bg }}
                  >
                    <Ionicons
                      name={row.icon as any}
                      size={15}
                      color={row.color}
                    />
                  </View>
                  <Text
                    className="text-sm font-bold text-gray-800 dark:text-zinc-100 flex-shrink ml-3"
                    numberOfLines={1}
                  >
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View className="flex-row justify-between px-5 mt-8 gap-4">
          {[
            {
              label: "Semester",
              value: myOrg?.semester
                ? myOrg.semester
                    .replace("_SEMESTER", "")
                    .replace("FIRST", "1st")
                    .replace("SECOND", "2nd")
                    .replace("THIRD", "3rd")
                    .replace("FOURTH", "4th")
                    .replace("FIFTH", "5th")
                    .replace("SIXTH", "6th")
                    .replace("SEVENTH", "7th")
                    .replace("EIGHTH", "8th")
                    .replace("NINTH", "9th")
                    .replace("TENTH", "10th")
                : myProfile?.semester
                  ? myProfile?.semester
                      .replace("_SEMESTER", "")
                      .replace("FIRST", "1st")
                      .replace("SECOND", "2nd")
                      .replace("THIRD", "3rd")
                      .replace("FOURTH", "4th")
                      .replace("FIFTH", "5th")
                      .replace("SIXTH", "6th")
                      .replace("SEVENTH", "7th")
                      .replace("EIGHTH", "8th")
                      .replace("NINTH", "9th")
                      .replace("TENTH", "10th")
                  : "N/A",
              icon: "school-outline",
              color: "text-blue-600",
              bg: "bg-blue-50",
            },
            {
              label: "Attendance",
              value: (() => {
                const summaryStore = useAttendanceStore.getState().summary;
                if (!summaryStore || summaryStore.length === 0) return "N/A";
                const totalAttended = summaryStore.reduce(
                  (acc, curr) => acc + curr.attended,
                  0,
                );
                const totalHeld = summaryStore.reduce(
                  (acc, curr) => acc + curr.total,
                  0,
                );
                if (totalHeld === 0) return "0%";
                return `${Math.round((totalAttended / totalHeld) * 100)}%`;
              })(),
              icon: "stats-chart-outline",
              color: "text-green-600",
              bg: "bg-green-50",
            },
          ].map((stat, index) => (
            <View
              key={index}
              className="flex-1 bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm items-center"
            >
              <View
                className={`h-8 w-8 ${stat.bg} rounded-full items-center justify-center mb-2`}
              >
                <Ionicons
                  name={stat.icon as any}
                  size={16}
                  className={stat.color}
                  style={{
                    color:
                      stat.color === "text-blue-600" ? "#2563EB" : "#16A34A",
                  }}
                />
              </View>
              <Text className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {stat.value}
              </Text>
              <Text className="text-xs text-gray-400 dark:text-zinc-400 font-medium uppercase tracking-wide">
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Menu Items */}
        <View className="mt-8 px-5 gap-6">
          {/* {menuItems.map((section, sectionIndex) => (
            <View key={sectionIndex}>
              <Text className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">
                {section.title}
              </Text>
              <View className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {section.items.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    className={`flex-row items-center justify-between p-4 bg-white active:bg-gray-50 ${index !== section.items.length - 1 ? "border-b border-gray-50" : ""}`}
                  >
                    <View className="flex-row items-center gap-4">
                      <View
                        className={`h-10 w-10 ${item.bg} rounded-full items-center justify-center`}
                      >
                        <Ionicons
                          name={item.icon as any}
                          size={20}
                          color={item.color}
                        />
                      </View>
                      <Text className="text-base font-semibold text-gray-700">
                        {item.label}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#D1D5DB"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))} */}

          {/* Support */}
          <View>
            <Text className="text-sm font-bold text-gray-400 dark:text-zinc-400 uppercase tracking-widest mb-3 ml-1">
              Support
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/support")}
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden p-4 flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-4">
                <View className="h-10 w-10 bg-blue-50 dark:bg-blue-900/20 rounded-full items-center justify-center">
                  <Ionicons
                    name="help-buoy-outline"
                    size={20}
                    color="#2563EB"
                  />
                </View>
                <View>
                  <Text className="text-base font-semibold text-gray-700 dark:text-zinc-100">
                    Support
                  </Text>
                  <Text className="text-xs text-gray-500 dark:text-zinc-400">
                    Open a ticket or view responses
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => Linking.openURL("https://git.new/unitime")}
              className="mt-3 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden p-4 flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-4">
                <View className="h-10 w-10 bg-slate-50 dark:bg-zinc-800 rounded-full items-center justify-center">
                  <Ionicons
                    name="logo-github"
                    size={20}
                    color={theme === "dark" ? "#E5E7EB" : "#374151"}
                  />
                </View>
                <View>
                  <Text className="text-base font-semibold text-gray-700 dark:text-zinc-100">
                    Star us on GitHub
                  </Text>
                  <Text className="text-xs text-gray-500 dark:text-zinc-400">
                    Star & contribute to the source code
                  </Text>
                </View>
              </View>
              <Ionicons name="open-outline" size={18} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {/* Dark Mode Toggle */}
          <View>
            <Text className="text-sm font-bold text-gray-400 dark:text-zinc-400 uppercase tracking-widest mb-3 ml-1">
              Preferences
            </Text>
            <View className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden p-4 flex-row items-center justify-between">
              <View className="flex-row items-center gap-4">
                <View className="h-10 w-10 bg-slate-100 dark:bg-zinc-800 rounded-full items-center justify-center">
                  <Ionicons name="moon-outline" size={20} color="#475569" />
                </View>
                <Text className="text-base font-semibold text-gray-700 dark:text-zinc-100">
                  Dark Mode
                </Text>
              </View>
              <Switch
                value={theme === "dark"}
                onValueChange={toggleTheme}
                trackColor={{ false: "#E2E8F0", true: "#2563EB" }}
                thumbColor={"#FFFFFF"}
              />
            </View>

            <TouchableOpacity
              onPress={handleCheckForUpdates}
              disabled={isCheckingUpdates}
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden p-4 flex-row items-center justify-between mt-3"
            >
              <View className="flex-row items-center gap-4">
                <View className="h-10 w-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-full items-center justify-center">
                  <Ionicons
                    name="cloud-download-outline"
                    size={20}
                    color="#4F46E5"
                  />
                </View>
                <Text className="text-base font-semibold text-gray-700 dark:text-zinc-100">
                  Check for Updates
                </Text>
              </View>
              {isCheckingUpdates ? (
                <ActivityIndicator size="small" color="#4F46E5" />
              ) : (
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              )}
            </TouchableOpacity>
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            onPress={logout}
            className="flex-row items-center justify-center gap-2 bg-red-50 dark:bg-red-500/10 p-4 rounded-2xl border border-red-100 dark:border-red-500/20 mt-4 active:scale-[0.99] transition-transform"
          >
            <Ionicons name="log-out-outline" size={20} color="#DC2626" />
            <Text className="text-red-600 font-bold text-base">Log Out</Text>
          </TouchableOpacity>

          <Text className="text-center text-xs text-gray-400 dark:text-zinc-500 mt-4">
            Version 1.0.2 (Build 202402)
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

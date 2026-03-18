import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/auth.cntxt";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import { useAttendanceStore } from "@/lib/store";
import {
  Alert,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Image,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TapToMark = () => {
  const { sessionId, courseName, locationName, sessionTime } =
    useLocalSearchParams<{
      sessionId: string;
      courseName: string;
      locationName?: string;
      sessionTime?: string;
    }>();
  const { loggedInUser } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error" | "expired"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const isSubmittingRef = useRef(false);

  const handleMarkAttendance = async () => {
    if (isSubmittingRef.current || !sessionId || !loggedInUser?.id) return;
    isSubmittingRef.current = true;
    setStatus("loading");

    try {
      // 1. Get Location (High Accuracy)
      const { status: locStatus } =
        await Location.requestForegroundPermissionsAsync();
      if (locStatus !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location is required for geofencing."
        );
        setStatus("idle");
        isSubmittingRef.current = false;
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // 2. Submit Checkin
      const res = await apiFetch("/attendance/checkin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          coordinates: {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          },
        }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (res.ok && data.success) {
        setStatus("success");
        // Store only the last 50 IDs to prevent storage bloat
        const markedStr = await AsyncStorage.getItem("MARKED_SESSIONS");
        let markedIds = markedStr ? JSON.parse(markedStr) : [];
        markedIds = [
          sessionId,
          ...markedIds.filter((id: string) => id !== sessionId),
        ].slice(0, 50);
        await AsyncStorage.setItem(
          "MARKED_SESSIONS",
          JSON.stringify(markedIds)
        );

        // Refresh stats on home screen
        useAttendanceStore.getState().fetchSummary(loggedInUser.id);

        setTimeout(() => router.replace("/(tabs)/attendance" as any), 2000);
      } else {
        // Improved error feedback
        const msg = data.message || data.error || "Failed to mark attendance.";
        setErrorMessage(msg);
        if (msg.toLowerCase().includes("expired")) {
          setStatus("expired");
        } else {
          setStatus("error");
        }
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMessage("An unexpected error occurred.");
    } finally {
      isSubmittingRef.current = false;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f8f6f6] dark:bg-[#221610]">
      <View className="flex-1 items-center justify-center p-6 gap-16">
        {/* Class Info Section */}
        <View className="items-center gap-3">
          <View className="flex-row items-center gap-2 px-3 py-1.5 rounded-full bg-[#ec5b13]/10">
            <Ionicons name="wifi" size={16} color="#ec5b13" />
            <Text className="text-[#ec5b13] text-xs font-bold uppercase tracking-wider">
              Attendance Session Active
            </Text>
          </View>
          <Text className="text-4xl text-center font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            {courseName || "Biology 101"}
          </Text>
          <View className="items-center gap-1.5">
            <View className="flex-row items-center gap-2">
              <Ionicons
                name="location-sharp"
                size={16}
                color={isDark ? "#94a3b8" : "#475569"}
              />
              <Text className="font-medium text-slate-600 dark:text-slate-400">
                {locationName || "Lecture Hall A"}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Ionicons
                name="calendar-outline"
                size={14}
                color={isDark ? "#94a3b8" : "#475569"}
              />
              <Text className="text-sm text-slate-600 dark:text-slate-400">
                {sessionTime || "Monday, Oct 23 • 10:30 AM"}
              </Text>
            </View>
          </View>
        </View>

        {/* Main Action Button */}
        <View className="relative items-center justify-center w-64 h-64">
          <View className="absolute inset-0 bg-[#ec5b13]/20 rounded-full scale-110 animate-pulse" />
          <View className="absolute inset-0 bg-[#ec5b13]/10 rounded-full scale-125" />

          <TouchableOpacity
            onPress={
              status === "error" || status === "expired"
                ? () => setStatus("idle")
                : handleMarkAttendance
            }
            disabled={status === "loading" || status === "success"}
            className="w-full h-full bg-[#ec5b13] rounded-full items-center justify-center shadow-2xl shadow-[#ec5b13]/40 active:scale-95 transition-transform"
            style={{ elevation: 10 }}
          >
            {status === "loading" ? (
              <ActivityIndicator size="large" color="#ffffff" />
            ) : status === "error" || status === "expired" ? (
              <>
                <Ionicons
                  name={status === "error" ? "alert-circle-outline" : "time-outline"}
                  size={64}
                  color="white"
                  className="mb-2"
                />
                <Text className="text-white text-xl font-bold uppercase tracking-widest mt-2">
                  {status === "error" ? "Failed" : "Expired"}
                </Text>
                <Text className="text-white/80 text-xs font-medium mt-1 text-center px-4">
                  {status === "error"
                    ? errorMessage
                    : "Session is no longer active."}
                </Text>
                <Text className="text-white/90 text-xs font-bold mt-2 underline">
                  Tap to retry
                </Text>
              </>
            ) : (
              <>
                <Ionicons
                  name="finger-print-outline"
                  size={72}
                  color="white"
                  className="mb-2"
                />
                <Text className="text-white text-xl font-bold uppercase tracking-widest mt-2">
                  Tap to Mark
                </Text>
                <Text className="text-white/80 text-xs font-medium mt-1">
                  Must be in range
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Map/Location Context Card */}
        {status !== "success" && (
          <View className="w-full max-w-sm bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-[#ec5b13]/10 flex-row items-center gap-4">
            <View className="w-16 h-16 rounded-lg bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
              <Image
                source={{
                  uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuBSQoKzuJxCRRDGJnfbGBRmDDirEARkeNZQCt4XmrXVFPrLypTsMjgVNZmwFOmfMxfsCbiK6WHxi7Ba-YHbbSALwFAwDcZi3F7e64bJ59TQlnKCTBc19H0GmWKE39B5YB1bsuGGt5GnkZGffGSM1hTHnJxVrEvQCawE4phdVdKgz9L5XkYMpJSNdm7d3QDvfs4Was3GGZGSnSnkA-qYnSDqkyHKZihKg283H_eU5hfsmmpJyAAbNiBuia-U0Qt-jb6mtC8Y2k7KKij9",
                }}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-bold text-[#ec5b13] uppercase tracking-wider">
                Your Location
              </Text>
              <Text className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {locationName || "Science Building, Wing B"}
              </Text>
              <Text className="text-xs text-slate-500">
                You are within the geo-fence
              </Text>
            </View>
            <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
          </View>
        )}
      </View>

      {/* Success Feedback Overlay */}
      {status === "success" && (
        <View className="absolute inset-0 bg-[#f8f6f6]/95 dark:bg-[#221610]/95 z-50 flex-col items-center justify-center p-6">
          <View className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-500/30">
            <Ionicons name="checkmark-done-circle" size={48} color="white" />
          </View>
          <Text className="text-center text-3xl font-bold mb-2 text-slate-900 dark:text-white">
            Attendance Marked!
          </Text>
          <Text className="text-slate-500 text-center mb-10 text-lg mt-1">
            {courseName || "Biology 101"} • Verified
          </Text>

          <TouchableOpacity
            onPress={() => router.replace("/(tabs)/attendance" as any)}
            className="px-8 py-4 bg-[#ec5b13] rounded-xl active:bg-[#d9530f]"
          >
            <Text className="text-white font-bold text-lg">
              Back to Dashboard
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

export default TapToMark;

import { useAuth } from "@/contexts/auth.cntxt";
import { useLocalStore } from "@/contexts/localstore.cntxt";
import { apiFetch } from "@/lib/api";
import { useAttendanceStore } from "@/lib/store";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function useCountdown(endTimeISO: string | undefined) {
  const calc = () => {
    if (!endTimeISO) return null;
    const diff = new Date(endTimeISO).getTime() - Date.now();
    return diff <= 0 ? 0 : diff;
  };
  const [ms, setMs] = useState<number | null>(calc);

  useEffect(() => {
    if (!endTimeISO) return;
    const id = setInterval(() => {
      const diff = new Date(endTimeISO).getTime() - Date.now();
      setMs(diff <= 0 ? 0 : diff);
    }, 1000);
    return () => clearInterval(id);
  }, [endTimeISO]);

  if (ms === null) return null;
  const totalSec = Math.floor(ms / 1000);
  return `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, "0")}`;
}

function fmtTime(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function TapToMarkScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { loggedInUser } = useAuth();
  const { getItem, setItem } = useLocalStore();
  const markAttendance = useAttendanceStore((s) => s.markAttendance);

  // Session details fetched from backend (self-sufficient)
  const [sessionInfo, setSessionInfo] = useState<{
    courseName: string;
    courseCode: string;
    endTime: string;
    startTime: string;
  } | null>(null);

  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const isSubmittingRef = useRef(false);

  // Fetch session details on mount via dashboard (already cached by listener)
  useEffect(() => {
    if (!loggedInUser?.id || !sessionId) return;
    apiFetch(`/dashboard/${loggedInUser.id}`, {
      headers: { "Cache-Control": "no-cache" },
    })
      .then((r) => r.json())
      .then((json) => {
        if (!json?.data?.activeSessions) return;
        const session = json.data.activeSessions.find(
          (s: any) => s.id === sessionId,
        );
        if (session) {
          setSessionInfo({
            courseName:
              session.course?.name ?? session.courseId ?? "Unknown Course",
            courseCode: session.course?.code ?? "",
            endTime: session.endTime ?? "",
            startTime: session.startTime ?? "",
          });
        }
      })
      .catch(() => {});
  }, [loggedInUser?.id, sessionId]);

  const endTime = sessionInfo?.endTime;
  const countdown = useCountdown(endTime);
  const isExpired = countdown === "0:00";

  // ---------------------------------------------------------------------------
  // Animations
  // ---------------------------------------------------------------------------
  const pulseScale = useSharedValue(1);
  const rippleScale = useSharedValue(0);
  const successScale = useSharedValue(0);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [pulseScale]);

  const rippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(rippleScale.value, [0, 1], [0.8, 4]) }],
    opacity: interpolate(rippleScale.value, [0, 0.5, 1], [0.6, 0.3, 0]),
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: status === "idle" ? pulseScale.value : 1 }],
  }));

  const successIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
    opacity: successScale.value,
  }));

  // ---------------------------------------------------------------------------
  // Tap handler
  // ---------------------------------------------------------------------------
  const handlePress = async () => {
    if (status !== "idle" || isSubmittingRef.current || isExpired) return;
    if (!sessionId || !loggedInUser?.id) {
      Alert.alert("Error", "Missing session or user information.");
      return;
    }

    // Record attempt immediately so the listener won't re-route
    try {
      const attemptedStr = await getItem("ATTEMPTED_SESSIONS");
      const attemptedIds: string[] = attemptedStr
        ? JSON.parse(attemptedStr)
        : [];
      if (!attemptedIds.includes(String(sessionId))) {
        await setItem(
          "ATTEMPTED_SESSIONS",
          JSON.stringify([...attemptedIds, sessionId]),
        );
      }
    } catch {}

    isSubmittingRef.current = true;
    setStatus("loading");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    pulseScale.value = withTiming(0.95, { duration: 200 });

    try {
      const { status: locStatus } =
        await Location.requestForegroundPermissionsAsync();
      if (locStatus !== "granted") {
        setStatus("error");
        Alert.alert(
          "Permission Error",
          "Location permission is required to mark attendance.",
        );
        pulseScale.value = withSpring(1);
        isSubmittingRef.current = false;
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const result = await markAttendance(String(sessionId), {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      });

      if (result.success) {
        setStatus("success");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Persist marked session locally
        const prevStr = await getItem("MARKED_SESSIONS");
        const prevIds = prevStr ? JSON.parse(prevStr) : [];
        if (!prevIds.includes(sessionId)) {
          await setItem(
            "MARKED_SESSIONS",
            JSON.stringify([...prevIds, sessionId]),
          );
        }

        pulseScale.value = withSpring(1);
        rippleScale.value = withTiming(1, {
          duration: 500,
          easing: Easing.out(Easing.cubic),
        });
        successScale.value = withSpring(1, { damping: 12 });

        setTimeout(() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace("/");
          }
        }, 2500);
      } else {
        setStatus("error");
        Alert.alert(
          "Attendance Failed",
          result.message || "Could not verify location or session.",
        );
        pulseScale.value = withSpring(1);
        isSubmittingRef.current = false;
      }
    } catch {
      setStatus("error");
      Alert.alert("Error", "An unexpected error occurred during check-in.");
      pulseScale.value = withSpring(1);
      isSubmittingRef.current = false;
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-zinc-900">
      {/* Header */}
      <View className="px-6 py-4 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 bg-white dark:bg-zinc-800 rounded-full shadow-sm border border-gray-100 dark:border-zinc-800"
        >
          <Feather name="arrow-left" size={22} color="#18181B" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-zinc-900 dark:text-zinc-100 font-lora">
          Mark Attendance
        </Text>
        <View className="w-10" />
      </View>

      {/* Session Info Card — only rendered once we have details */}
      {sessionInfo && (
        <Animated.View
          entering={FadeInUp.springify().delay(60)}
          className="mx-6 mb-6 bg-white dark:bg-zinc-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-zinc-700"
        >
          {/* Badges row */}
          <View className="flex-row items-center gap-x-2 mb-3 flex-wrap">
            {!!sessionInfo.courseCode && (
              <View className="bg-indigo-100 dark:bg-indigo-900/50 px-2.5 py-1 rounded-full">
                <Text className="text-indigo-700 dark:text-indigo-300 text-xs font-bold tracking-wide">
                  {sessionInfo.courseCode}
                </Text>
              </View>
            )}
            <View className="bg-green-100 dark:bg-green-900/40 px-2.5 py-1 rounded-full flex-row items-center gap-x-1">
              <View className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <Text className="text-green-700 dark:text-green-300 text-xs font-semibold">
                Live
              </Text>
            </View>
          </View>

          {/* Course name */}
          <Text
            className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-3 font-lora"
            numberOfLines={2}
          >
            {sessionInfo.courseName}
          </Text>

          {/* Time row */}
          <View className="flex-row items-center gap-x-2">
            {(!!sessionInfo.startTime || !!sessionInfo.endTime) && (
              <View className="flex-row items-center gap-x-1.5 bg-gray-50 dark:bg-zinc-700 px-3 py-2 rounded-lg flex-1">
                <Feather name="clock" size={12} color="#6b7280" />
                <Text className="text-gray-600 dark:text-gray-300 text-xs font-medium">
                  {fmtTime(sessionInfo.startTime)} –{" "}
                  {fmtTime(sessionInfo.endTime)}
                </Text>
              </View>
            )}
            {countdown !== null && (
              <View
                className={`flex-row items-center gap-x-1.5 px-3 py-2 rounded-lg ${
                  isExpired
                    ? "bg-red-50 dark:bg-red-900/30"
                    : "bg-amber-50 dark:bg-amber-900/30"
                }`}
              >
                <Ionicons
                  name="timer-outline"
                  size={12}
                  color={isExpired ? "#ef4444" : "#d97706"}
                />
                <Text
                  className={`text-xs font-bold ${
                    isExpired ? "text-red-600" : "text-amber-600"
                  }`}
                >
                  {isExpired ? "Expired" : countdown}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      )}

      {/* Tap Button Area */}
      <View className="flex-1 items-center justify-center">
        {/* Ripple */}
        <Animated.View
          className="absolute w-64 h-64 rounded-full bg-blue-100"
          style={rippleStyle}
        />

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handlePress}
          disabled={status !== "idle" || isExpired}
        >
          <Animated.View
            style={buttonStyle}
            className={`w-64 h-64 rounded-full items-center justify-center shadow-lg shadow-blue-200/50 ${
              status === "success"
                ? "bg-green-500"
                : isExpired
                  ? "bg-gray-400"
                  : "bg-primary"
            }`}
          >
            {status === "success" ? (
              <Animated.View style={successIconStyle}>
                <Feather name="check" size={80} color="white" />
              </Animated.View>
            ) : (
              <View className="items-center px-6">
                <Ionicons
                  name={isExpired ? "time-outline" : "finger-print"}
                  size={64}
                  color="white"
                />
                <Text className="text-white font-semibold text-xl mt-4 text-center">
                  {isExpired
                    ? "Session Ended"
                    : status === "loading"
                      ? "Verifying..."
                      : "Tap to Mark"}
                </Text>
                {status === "loading" && (
                  <Text className="text-blue-100 text-sm mt-1">
                    Checking location…
                  </Text>
                )}
              </View>
            )}
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <Animated.View
        entering={FadeInDown.springify().delay(100)}
        className="pb-10 px-10"
      >
        {status === "success" ? (
          <Text className="text-green-600 font-bold text-lg text-center">
            Attendance Marked Successfully! 🎉
          </Text>
        ) : isExpired ? (
          <Text className="text-red-500 font-medium text-center">
            This session has expired. Contact your professor.
          </Text>
        ) : (
          <Text className="text-accent text-center text-sm">
            Please ensure you are within the class premises to mark attendance.
          </Text>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

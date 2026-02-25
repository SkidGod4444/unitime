import { Ionicons } from "@expo/vector-icons";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect } from "react";
import {
  BackHandler,
  Dimensions,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ClassSession = {
  courseCode: string;
  label: string;
  time: string;
  leadMinutes: number;
  color: string;
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SLIDE_WIDTH = SCREEN_WIDTH - 48;
const BUTTON_SIZE = 56;
const SLIDE_RANGE = SLIDE_WIDTH - BUTTON_SIZE - 8;

// ---------------------------------------------------------------------------
// Format the class start time nicely
// ---------------------------------------------------------------------------

function formatClassTime(time: string | undefined): string {
  if (!time) return "--:--";
  const [h, m] = time.split(":");
  const h24 = parseInt(h, 10);
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, "0")}:${m} ${period}`;
}

// ---------------------------------------------------------------------------
// SlideToDismiss component
// ---------------------------------------------------------------------------

const SlideToDismiss = ({ onDismiss }: { onDismiss: () => void }) => {
  const translateX = useSharedValue(0);
  const isDismissed = useSharedValue(false);

  // --- Audio Logic ---
  const player = useAudioPlayer(
    require("@/assets/sounds/mixkit-digital-clock-digital-alarm-buzzer-992.wav"),
  );

  useEffect(() => {
    const startAlarm = async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          interruptionMode: "duckOthers",
        });
        player.loop = true;
        player.play();
      } catch (error) {
        console.error("Failed to play alarm sound", error);
      }
    };

    startAlarm();
    Vibration.vibrate([100, 500, 500], true);

    return () => {
      Vibration.cancel();
      try {
        player.pause();
      } catch {
        // If the player was already released by expo-audio, ignore.
      }
    };
  }, [player]);

  const handleDismiss = useCallback(() => {
    Vibration.cancel();
    try {
      player.pause();
    } catch {
      // Ignore if released
    }
    onDismiss();
  }, [player, onDismiss]);

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      "worklet";
      if (isDismissed.value) return;
      const nextPos = Math.max(0, Math.min(event.translationX, SLIDE_RANGE));
      translateX.value = nextPos;
    })
    .onEnd(() => {
      "worklet";
      if (isDismissed.value) return;
      if (translateX.value > SLIDE_RANGE * 0.8) {
        translateX.value = withTiming(SLIDE_RANGE);
        isDismissed.value = true;
        scheduleOnRN(
          Haptics.notificationAsync,
          Haptics.NotificationFeedbackType.Success,
        );
        scheduleOnRN(handleDismiss);
      } else {
        translateX.value = withSpring(0);
      }
    });

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SLIDE_RANGE / 2],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const bgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SLIDE_RANGE],
      [0.8, 1],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <View className="relative h-16 w-full justify-center overflow-hidden rounded-full bg-gray-100 mb-6 border border-gray-200">
      <Animated.View
        className="absolute inset-0 bg-indigo-500"
        style={[{ opacity: 0 }, bgStyle]}
      />

      <Animated.Text
        className="absolute w-full text-center text-base font-bold text-gray-900 tracking-widest uppercase"
        style={textStyle}
      >
        Slide to dismiss
      </Animated.Text>

      <GestureDetector gesture={pan}>
        <Animated.View
          className="absolute left-1 h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm border border-gray-200"
          style={buttonStyle}
        >
          <Ionicons name="chevron-forward" size={32} color="#111827" />
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Main Alarm Player Screen
// ---------------------------------------------------------------------------

export default function AlarmPlayerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    alarmId?: string;
    label?: string;
    courseCode?: string;
    color?: string;
    time?: string;
    leadMinutes?: string;
  }>();
  const [currentTime, setCurrentTime] = React.useState(new Date());

  // Build the session data from params (fall back to placeholders)
  const session: ClassSession = {
    courseCode: params.courseCode ?? "CLASS",
    label: params.label ?? "Upcoming Class",
    time: params.time ?? "",
    leadMinutes: parseInt(params.leadMinutes ?? "15", 10),
    color: params.color ?? "#6366f1",
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Block Android hardware back button
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => true,
    );
    return () => subscription.remove();
  }, []);

  const handleDismiss = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  const handleSnooze = () => handleDismiss();

  return (
    <GestureHandlerRootView className="flex-1">
      {/* Disable iOS swipe-back gesture */}
      <Stack.Screen options={{ gestureEnabled: false }} />
      <SafeAreaView className="flex-1 bg-white px-6 justify-between">
        <StatusBar style="dark" />

        {/* --- Top Section: Time & Date --- */}
        <View className="mt-10 items-center">
          <Text className="text-gray-900 text-lg font-bold tracking-widest uppercase mb-2">
            Upcoming Class
          </Text>
          <Text className="text-7xl font-bold text-black tracking-tighter">
            {currentTime.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
          </Text>
          <Text className="text-gray-700 text-xl font-medium mt-1">
            {currentTime.toLocaleDateString([], {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </Text>
        </View>

        {/* --- Middle Section: Class Card --- */}
        <Animated.View
          entering={FadeInDown.delay(300).springify()}
          className="w-full bg-white rounded-3xl p-6 border-2 shadow-xl"
          style={{ borderColor: session.color + "33" }}
        >
          <View className="flex-row items-center mb-6">
            <View
              className="h-10 w-10 rounded-full items-center justify-center mr-4"
              style={{ backgroundColor: session.color + "22" }}
            >
              <Ionicons name="school-outline" size={20} color={session.color} />
            </View>
            <View className="flex-1">
              <Text
                className="font-bold tracking-wider text-xs uppercase mb-1"
                style={{ color: session.color }}
              >
                {session.leadMinutes > 0
                  ? `Starting in ${session.leadMinutes} min`
                  : "Starting now"}
              </Text>
              <Text
                className="text-black text-2xl font-bold leading-tight"
                numberOfLines={2}
              >
                {session.label}
              </Text>
            </View>
          </View>

          <View className="space-y-4">
            {/* Course code */}
            <View className="flex-row items-center">
              <Ionicons
                name="book-outline"
                size={20}
                color="#1f2937"
                style={{ width: 30 }}
              />
              <View
                className="px-2 py-0.5 rounded-full"
                style={{ backgroundColor: session.color + "22" }}
              >
                <Text
                  className="text-xs font-bold uppercase tracking-wide"
                  style={{ color: session.color }}
                >
                  {session.courseCode}
                </Text>
              </View>
            </View>

            {/* Time */}
            {session.time ? (
              <View className="flex-row items-center">
                <Ionicons
                  name="time-outline"
                  size={20}
                  color="#1f2937"
                  style={{ width: 30 }}
                />
                <Text className="text-gray-900 text-base font-semibold">
                  {formatClassTime(session.time)}
                </Text>
              </View>
            ) : null}
          </View>
        </Animated.View>

        {/* --- Bottom Section: Actions --- */}
        <View className="mb-8 w-full">
          <TouchableOpacity
            onPress={handleSnooze}
            className="w-full py-4 mb-4 rounded-full border-2 border-gray-200 bg-gray-50 items-center justify-center active:bg-gray-100"
          >
            <Text className="text-gray-900 font-bold text-lg">
              Snooze for 5 min
            </Text>
          </TouchableOpacity>

          <SlideToDismiss onDismiss={handleDismiss} />
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

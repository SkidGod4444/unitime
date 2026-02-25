import { Ionicons } from "@expo/vector-icons";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
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

// --- Types & Mock Data ---

type ClassSession = {
  id: string;
  courseCode: string;
  courseName: string;
  startTime: string;
  endTime: string;
  location: string;
  professor: string;
  type: "Lecture" | "Lab" | "Tutorial";
  color: string;
};

// Mock data for the upcoming class
const UPCOMING_CLASS: ClassSession = {
  id: "1",
  courseCode: "CS101",
  courseName: "Intro to Computer Science",
  startTime: "09:00",
  endTime: "10:30",
  location: "Hall A",
  professor: "Dr. Smith",
  type: "Lecture",
  color: "#818cf8", // Indigo-400
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SLIDE_WIDTH = SCREEN_WIDTH - 48; // padding horizontally
const BUTTON_SIZE = 56;
const SLIDE_RANGE = SLIDE_WIDTH - BUTTON_SIZE - 8; // 8px padding inside slider

// --- Components ---

const SlideToDismiss = ({ onDismiss }: { onDismiss: () => void }) => {
  const translateX = useSharedValue(0);
  const isDismissed = useSharedValue(false);

  // --- Audio Logic ---
  // useAudioPlayer auto-releases the player when the component unmounts.
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

    // Start vibration pattern: 100ms pause, 500ms vibrate, 500ms pause, repeat
    Vibration.vibrate([100, 500, 500], true);

    return () => {
      Vibration.cancel();
      player.pause();
    };
  }, [player]);

  // Stop sound + vibration when slide-dismissing
  const handleDismiss = useCallback(() => {
    Vibration.cancel();
    player.pause();
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
        scheduleOnRN(handleDismiss); // Call our new wrapper
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
      [0.8, 1], // Becomes solid as you slide
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

export default function AlarmScreen() {
  const router = useRouter();
  const [currentTime, setCurrentTime] = React.useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Block Android hardware back button – only the slide gesture dismisses this page
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => true, // returning true prevents the default back action
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

  const handleSnooze = () => {
    console.log("Snoozed");
    handleDismiss();
  };

  return (
    <GestureHandlerRootView className="flex-1">
      {/* Disable iOS swipe-back gesture for this screen only */}
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
          className="w-full bg-white rounded-3xl p-6 border-2 border-gray-100 shadow-xl shadow-indigo-100/50"
        >
          <View className="flex-row items-center mb-6">
            <View className="h-10 w-10 rounded-full bg-indigo-100 items-center justify-center mr-4">
              <Ionicons name="school-outline" size={20} color="#3730a3" />
            </View>
            <View>
              <Text className="text-indigo-800 font-bold tracking-wider text-xs uppercase mb-1">
                Starting in 10 min
              </Text>
              <Text className="text-black text-2xl font-bold leading-tight">
                {UPCOMING_CLASS.courseName}
              </Text>
            </View>
          </View>

          <View className="space-y-4">
            <View className="flex-row items-center">
              <Ionicons
                name="time-outline"
                size={20}
                color="#1f2937"
                style={{ width: 30 }}
              />
              <Text className="text-gray-900 text-base font-semibold">
                {UPCOMING_CLASS.startTime} - {UPCOMING_CLASS.endTime}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons
                name="location-outline"
                size={20}
                color="#1f2937"
                style={{ width: 30 }}
              />
              <Text className="text-gray-900 text-base font-semibold">
                {UPCOMING_CLASS.location}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons
                name="person-outline"
                size={20}
                color="#1f2937"
                style={{ width: 30 }}
              />
              <Text className="text-gray-900 text-base font-semibold">
                {UPCOMING_CLASS.professor}
              </Text>
            </View>
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

import { useLocalStore } from "@/contexts/localstore.cntxt";
import { colors } from "@/utils/constants";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Alert, Dimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const WIDGET_SIZE = 56;
const STORAGE_KEY = "@draggable-widget-position";

export default function QRScannerWidget() {
  const router = useRouter();
  const { getItem, setItem } = useLocalStore();
  const translateX = useSharedValue(SCREEN_WIDTH - WIDGET_SIZE - 20);
  const translateY = useSharedValue(SCREEN_HEIGHT - 200);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const pendingSaveX = useSharedValue<number | null>(null);
  const pendingSaveY = useSharedValue<number | null>(null);

  // Load saved position on mount
  useEffect(() => {
    const loadPosition = async () => {
      try {
        const savedPosition = await getItem(STORAGE_KEY);
        if (savedPosition) {
          const { x, y } = JSON.parse(savedPosition);
          // Validate and constrain the saved position
          const validX = Math.max(0, Math.min(SCREEN_WIDTH - WIDGET_SIZE, x));
          const validY = Math.max(0, Math.min(SCREEN_HEIGHT - WIDGET_SIZE, y));
          translateX.value = validX;
          translateY.value = validY;
        }
      } catch (error) {
        console.error("Error loading widget position:", error);
      }
    };
    loadPosition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save position to storage
  const savePosition = async (x: number, y: number) => {
    try {
      console.log("Saving widget position:", x, y);
      await setItem(STORAGE_KEY, JSON.stringify({ x, y }));
    } catch (error) {
      console.error("Error saving widget position:", error);
    }
  };

  // Watch for pending saves and save them
  useEffect(() => {
    const checkAndSave = async () => {
      if (pendingSaveX.value !== null && pendingSaveY.value !== null) {
        const x = pendingSaveX.value;
        const y = pendingSaveY.value;
        pendingSaveX.value = null;
        pendingSaveY.value = null;
        await savePosition(x, y);
      }
    };

    const interval = setInterval(checkAndSave, 100);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Authenticate using biometrics before accessing QR scanner
  const authenticateBeforeScanning = async (): Promise<boolean> => {
    try {
      // Check if device has biometric hardware
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        Alert.alert(
          "Biometric Authentication Unavailable",
          "Your device does not support biometric authentication. Proceeding to QR scanner.",
          [{ text: "OK" }]
        );
        return true; // Allow access anyway
      }

      // Check if biometrics are enrolled
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        Alert.alert(
          "No Biometrics Enrolled",
          "Please set up Face ID, Touch ID, or fingerprint authentication in your device settings to use this feature. Proceeding to QR scanner.",
          [{ text: "OK" }]
        );
        return true; // Allow access anyway
      }

      // Attempt authentication
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to access QR Scanner",
        cancelLabel: "Cancel",
        disableDeviceFallback: true, // Force biometric-only, no passcode fallback
      });

      if (result.success) {
        return true;
      } else {
        // Authentication failed or cancelled
        if (result.error === "user_cancel") {
          // User cancelled, no need to show alert
          return false;
        } else if (result.error === "system_cancel") {
          // System cancelled (e.g., app went to background)
          return false;
        } else {
          Alert.alert(
            "Authentication Failed",
            "Could not authenticate. Please try again.",
            [{ text: "OK" }]
          );
          return false;
        }
      }
    } catch (error) {
      console.error("Authentication error:", error);
      Alert.alert(
        "Authentication Error",
        "An error occurred during authentication. Proceeding to QR scanner.",
        [{ text: "OK" }]
      );
      return true; // Allow access on error to prevent blocking user
    }
  };

  const navigateToQRScanner = async () => {
    const authenticated = await authenticateBeforeScanning();
    if (authenticated) {
      router.push("/qr-scanner");
    }
  };

  // Tap gesture - handles quick taps/clicks
  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .onEnd(() => {
      "worklet";
      runOnJS(navigateToQRScanner)();
    });

  // Pan gesture - handles dragging
  // minDistance ensures pan only activates when user actually drags
  const panGesture = Gesture.Pan()
    .minDistance(15) // Require at least 15px movement to activate pan (prevents accidental drags)
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      const newX = startX.value + event.translationX;
      const newY = startY.value + event.translationY;

      // Constrain the widget within screen bounds
      translateX.value = Math.max(
        0,
        Math.min(SCREEN_WIDTH - WIDGET_SIZE, newX),
      );
      translateY.value = Math.max(
        0,
        Math.min(SCREEN_HEIGHT - WIDGET_SIZE, newY),
      );
    })
    .onEnd(() => {
      "worklet";
      // Snap to nearest edge (left or right)
      const centerX = SCREEN_WIDTH / 2;
      const targetX =
        translateX.value < centerX
          ? 0 // Snap to left
          : SCREEN_WIDTH - WIDGET_SIZE; // Snap to right

      const finalY = translateY.value;

      translateX.value = withSpring(targetX, {
        damping: 20,
        stiffness: 90,
      });

      // Trigger save by setting pending save values
      pendingSaveX.value = targetX;
      pendingSaveY.value = finalY;
    });

  // Use Race: first gesture to activate wins
  // Tap will win for quick taps, Pan will win for drags
  const composedGesture = Gesture.Race(tapGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  });

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        className="absolute w-12 h-12 z-[500]"
        style={animatedStyle}
      >
        <View
          className="w-12 h-12 rounded-xl justify-center items-center shadow-md"
          style={{
            backgroundColor: colors.secondary,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 4.65,
            elevation: 8,
          }}
        >
          <Ionicons name="qr-code" size={28} color="white" />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

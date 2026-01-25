import React, { useEffect } from "react";
import { View, Dimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors } from "@/utils/constants";
import { useLocalStore } from "@/contexts/localstore.cntxt";

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

  const navigateToQRScanner = () => {
    router.push("/qr-scanner");
  };

  // Tap gesture - handles quick taps/clicks
  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .onEnd(() => {
      'worklet';
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
        Math.min(SCREEN_WIDTH - WIDGET_SIZE, newX)
      );
      translateY.value = Math.max(
        0,
        Math.min(SCREEN_HEIGHT - WIDGET_SIZE, newY)
      );
    })
    .onEnd(() => {
      'worklet';
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
        className="absolute w-14 h-14 z-[500]"
        style={animatedStyle}
      >
        <View 
          className="w-14 h-14 rounded-2xl justify-center items-center shadow-md"
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

import { Ionicons } from "@expo/vector-icons";
import {
  CameraView,
  PermissionStatus,
  useCameraPermissions,
} from "expo-camera";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Alert,
  Dimensions,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
// Size of the scanner square - rounded to prevent subpixel issues
const PREVIEW_SIZE = Math.round(SCREEN_WIDTH * 0.75);
// Border width needs to be large enough to cover the rest of the screen
const BORDER_WIDTH = Math.round(SCREEN_HEIGHT / 2 + 200);

export default function QRScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);

  // Animation values
  const translateY = useSharedValue(0);

  // Start scanning animation
  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(PREVIEW_SIZE, { duration: 1500, easing: Easing.linear }),
        withTiming(0, { duration: 1500, easing: Easing.linear }),
      ),
      -1,
      true,
    );
  }, [translateY]);

  // Request permission on mount if not granted
  useEffect(() => {
    if (
      permission &&
      !permission.granted &&
      permission.status === PermissionStatus.UNDETERMINED
    ) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const handleBarCodeScanned = async ({
    type,
    data,
  }: {
    type: string;
    data: string;
  }) => {
    if (scanned) return;

    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    console.log("QR Code scanned, verifying:", data);

    try {
      const res = await apiFetch("/attendance/qr/session/verify", {
        method: "POST",
        body: JSON.stringify({ qrString: data }),
      });
      const result = await res.json();

      if (res.ok) {
        // Persist locally to prevent auto-redirect loops from the listener
        try {
          const [sessionId] = (data || "").split("|");
          if (sessionId) {
            const markedStr = await AsyncStorage.getItem("MARKED_SESSIONS");
            let markedIds = markedStr ? JSON.parse(markedStr) : [];
            markedIds = [
              sessionId,
              ...markedIds.filter((id: string) => id !== sessionId),
            ].slice(0, 50);
            await AsyncStorage.setItem("MARKED_SESSIONS", JSON.stringify(markedIds));
          }
        } catch (e) {
          // Non-fatal: proceed even if storage write fails
          console.warn("Failed to persist MARKED_SESSIONS after scan:", e);
        }
        Alert.alert(
          "Success",
          result.message || "Attendance verified successfully",
          [{ text: "OK", onPress: () => router.replace("/(tabs)/" as any) }],
        );
      } else {
        Alert.alert(
          "Verification Failed",
          result.error || "Invalid or expired QR code",
          [
            { text: "Scan Again", onPress: () => setScanned(false) },
            { text: "Cancel", onPress: () => router.back(), style: "cancel" },
          ],
        );
      }
    } catch (err) {
      console.error(err);
      Alert.alert(
        "Error",
        "Failed to verify attendance. Please check your connection.",
        [{ text: "Scan Again", onPress: () => setScanned(false) }],
      );
    }
  };

  const toggleTorch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTorchEnabled((prev) => !prev);
  };

  if (!permission) {
    return (
      <View className="flex-1 bg-black">
        <StatusBar barStyle="light-content" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <StatusBar barStyle="light-content" />
        <View className="w-[85%] bg-zinc-900 rounded-3xl p-8 items-center">
          <View className="w-20 h-20 rounded-full bg-white justify-center items-center mb-6">
            <Ionicons name="camera" size={40} color="#000" />
          </View>
          <Text className="text-xl font-bold text-white mb-3 text-center">
            Camera Access Required
          </Text>
          <Text className="text-gray-400 text-center mb-8 leading-6 text-base">
            We need your permission to access the camera to scan QR codes for
            class attendance and events.
          </Text>
          <TouchableOpacity
            className="bg-white py-4 px-8 rounded-2xl w-full items-center mb-4 active:opacity-80"
            onPress={requestPermission}
          >
            <Text className="text-black text-base font-bold">Grant Access</Text>
          </TouchableOpacity>
          <TouchableOpacity className="py-2" onPress={() => router.back()}>
            <Text className="text-gray-400 text-base">Not Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <StatusBar barStyle="light-content" networkActivityIndicatorVisible />

      <CameraView
        style={{
          flex: 1,
          position: "absolute",
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
        }}
        facing="back"
        enableTorch={torchEnabled}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      />

      {/* Mask Overlay + Focus Frame Elements */}
      {/* 
         The View below creates the dark mask with a clear hole in the center.
         The children of this View are placed INSIDE the content box (the hole).
         This ensures the corners and laser are perfectly aligned with the hole.
      */}
      <View className="absolute inset-0 justify-center items-center z-10 pointer-events-none">
        <View
          style={{
            width: PREVIEW_SIZE + BORDER_WIDTH * 2,
            height: PREVIEW_SIZE + BORDER_WIDTH * 2,
            borderWidth: BORDER_WIDTH,
            borderColor: "rgba(0,0,0,0.6)",
            borderRadius: BORDER_WIDTH + 24,
          }}
          className="justify-center items-center relative"
        >
          {/* Note: Children here act as if they are in a container of size PREVIEW_SIZE x PREVIEW_SIZE */}
          <View style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}>
            {/* Corners */}
            <View className="absolute top-0 left-0 w-10 h-10 border-t-[5px] border-l-[5px] border-white rounded-tl-3xl" />
            <View className="absolute top-0 right-0 w-10 h-10 border-t-[5px] border-r-[5px] border-white rounded-tr-3xl" />
            <View className="absolute bottom-0 left-0 w-10 h-10 border-b-[5px] border-l-[5px] border-white rounded-bl-3xl" />
            <View className="absolute bottom-0 right-0 w-10 h-10 border-b-[5px] border-r-[5px] border-white rounded-br-3xl" />

            {/* Scanning Laser */}
            {!scanned && (
              <Animated.View
                style={[
                  {
                    position: "absolute",
                    left: 20,
                    right: 20,
                    height: 2,
                    backgroundColor: "#3b82f6",
                    shadowColor: "#3b82f6",
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 1,
                    shadowRadius: 10,
                    borderRadius: 1,
                  },
                  animatedStyle,
                ]}
              />
            )}
          </View>
        </View>
      </View>

      {/* Helper Text (Separate to avoid clipping/masking weirdness if any, though overflow is visible by default) */}
      <View className="absolute inset-0 justify-center items-center z-20 pointer-events-none">
        {/* Offset the text to be below the frame */}
        <Text
          className="text-gray-300 font-medium text-base bg-black/50 px-5 py-2.5 rounded-xl overflow-hidden"
          style={{ marginTop: PREVIEW_SIZE + 80 }}
        >
          Align QR code within the frame
        </Text>
      </View>

      {/* Header Controls */}
      <SafeAreaView
        className="absolute top-0 left-0 right-0 z-30 flex-row justify-between items-center px-5 pt-2"
        pointerEvents="box-none"
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-11 h-11 rounded-full bg-white/15 border border-white/10 justify-center items-center active:bg-white/25"
        >
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>

        <View className="px-4 py-2 bg-black/50 rounded-full">
          <Text className="text-white text-base font-semibold">Scan Code</Text>
        </View>

        <TouchableOpacity
          onPress={toggleTorch}
          className={`w-11 h-11 rounded-full border border-white/10 justify-center items-center active:bg-white/25 ${torchEnabled ? "bg-white" : "bg-white/15"}`}
        >
          <Ionicons
            name={torchEnabled ? "flash" : "flash-off"}
            size={22}
            color={torchEnabled ? "black" : "white"}
          />
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/auth.cntxt";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import { Alert, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TapToMark = () => {
  const { sessionId, courseName } = useLocalSearchParams<{ sessionId: string; courseName: string }>();
  const { loggedInUser } = useAuth();

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "expired">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const isSubmittingRef = useRef(false);

  const handleMarkAttendance = async () => {
    if (isSubmittingRef.current || !sessionId || !loggedInUser?.id) return;
    isSubmittingRef.current = true;
    setStatus("loading");

    try {
      // 1. Get Location (B15: High Accuracy)
      const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      if (locStatus !== "granted") {
        Alert.alert("Permission Denied", "Location is required for geofencing.");
        setStatus("idle");
        isSubmittingRef.current = false;
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });

      // 2. Submit Checkin
      const res = await apiFetch("/attendance/checkin", {
        method: "POST",
        body: JSON.stringify({
          sessionId,
          coordinates: { lat: location.coords.latitude, lng: location.coords.longitude },
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        // B9: Store only the last 50 IDs to prevent storage bloat
        const markedStr = await AsyncStorage.getItem("MARKED_SESSIONS");
        let markedIds = markedStr ? JSON.parse(markedStr) : [];
        markedIds = [sessionId, ...markedIds.filter((id: string) => id !== sessionId)].slice(0, 50);
        await AsyncStorage.setItem("MARKED_SESSIONS", JSON.stringify(markedIds));

        setTimeout(() => router.replace("/(tabs)/attendance" as any), 2000);
      } else {
        // B17: Improved error feedback
        setErrorMessage(data.message || "Failed to mark attendance.");
        if (data.message?.toLowerCase().includes("expired")) {
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
    <SafeAreaView className="flex-1 bg-white dark:bg-zinc-900 justify-center items-center px-6">
      <View className="items-center mb-10">
        <View className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full items-center justify-center mb-4">
          <Ionicons name="location" size={40} color="#6366f1" />
        </View>
        <Text className="text-2xl font-bold text-gray-900 dark:text-white text-center">
          {courseName || "Class Attendance"}
        </Text>
        <Text className="text-gray-500 text-center mt-2">
          Tap the button below to confirm your presence in the classroom.
        </Text>
      </View>

      {status === "idle" && (
        <TouchableOpacity
          onPress={handleMarkAttendance}
          className="bg-indigo-600 w-full p-5 rounded-2xl items-center shadow-lg active:opacity-80"
        >
          <Text className="text-white font-bold text-lg">Mark Attendance</Text>
        </TouchableOpacity>
      )}

      {status === "loading" && <ActivityIndicator size="large" color="#6366f1" />}

      {status === "success" && (
        <View className="items-center">
          <Ionicons name="checkmark-circle" size={80} color="#22c55e" />
          <Text className="text-green-600 font-bold text-xl mt-4">Verified!</Text>
        </View>
      )}

      {status === "error" && (
        <View className="items-center w-full">
          <Ionicons name="alert-circle" size={80} color="#ef4444" />
          <Text className="text-red-500 font-bold text-xl mt-4">Failed</Text>
          <Text className="text-gray-500 text-center mt-2 px-4">{errorMessage}</Text>
          <TouchableOpacity
            onPress={() => setStatus("idle")}
            className="mt-6 bg-gray-100 dark:bg-zinc-800 p-4 rounded-xl w-full items-center"
          >
            <Text className="text-indigo-600 font-semibold">Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === "expired" && (
        <View className="items-center w-full">
          <Ionicons name="time" size={80} color="#f59e0b" />
          <Text className="text-amber-500 font-bold text-xl mt-4">Session Expired</Text>
          <Text className="text-gray-500 text-center mt-2">This attendance session is no longer active.</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-6 bg-gray-100 dark:bg-zinc-800 p-4 rounded-xl w-full items-center"
          >
            <Text className="text-indigo-600 font-semibold">Go Back</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

export default TapToMark;

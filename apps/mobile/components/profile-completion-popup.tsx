import { useAuth } from "@/contexts/auth.cntxt";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";

export default function ProfileCompletionPopup() {
  const { loggedInUser } = useAuth();
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!loggedInUser) return;

    // Check for missing profile information
    const isEmailVerified = loggedInUser.emailVerified;
    const hasProfilePicture = !!loggedInUser.image;

    // Show popup if profile is incomplete
    if (!isEmailVerified || !hasProfilePicture) {
      // Simple delay to not show immediately on app load
      const timer = setTimeout(() => {
        setVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [loggedInUser]);

  const handleCompleteNow = () => {
    setVisible(false);
    router.push("/student-profile-form");
  };

  const handleRemindLater = () => {
    setVisible(false);
    // In a real app, you might want to save a timestamp to not show this again for a while
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={handleRemindLater}
    >
      <View className="flex-1 bg-black/60 justify-end sm:justify-center">
        {/* Backdrop tap to close */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleRemindLater}
          className="absolute inset-0"
        />

        <View className="bg-white w-full max-w-[420px] self-center rounded-t-[32px] sm:rounded-[24px] sm:m-6 p-8 pb-10 items-center shadow-2xl">
          {/* Handle bar for bottom sheet feel */}
          <View className="w-12 h-1.5 bg-gray-200 rounded-full mb-6 sm:hidden" />

          <View className="h-20 w-20 bg-blue-50 rounded-full items-center justify-center mb-6 border-[6px] border-blue-50/50 shadow-inner">
            <Ionicons name="shield-checkmark" size={36} color="#2563EB" />
          </View>

          <Text
            numberOfLines={2}
            className="text-2xl font-bold text-dark font-lora text-center mb-3 w-full"
          >
            Setup Your Profile
          </Text>

          <Text className="text-gray-500 text-center mb-8 leading-6 px-4">
            Complete your profile to unlock full access to campus features and
            connect with your peers.
          </Text>

          <View className="w-full gap-3">
            <TouchableOpacity
              onPress={handleCompleteNow}
              className="bg-primary-dark w-full py-3.5 rounded-2xl flex-row items-center justify-center shadow-lg shadow-blue-200 active:scale-[0.98] border border-primary-dark/10"
            >
              <Text
                numberOfLines={1}
                className="text-white font-bold text-base text-center flex-shrink"
              >
                Complete Now
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleRemindLater}
              className="w-full py-3 rounded-2xl flex-row items-center justify-center active:bg-gray-50"
            >
              <Text
                numberOfLines={1}
                className="text-gray-400 font-semibold text-sm text-center flex-shrink"
              >
                Maybe Later
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

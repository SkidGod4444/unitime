import { useAuth } from "@/contexts/auth.cntxt";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import React, { useEffect, useState } from "react";
import {
    Alert,
    BackHandler,
    Modal,
    Platform,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const SUPPORT_SERVER_URL = "https://unitime-backend.vercel.app/v1/users?email=saidev.25scse1680001@galgotiasuniversity.ac.in"; // 🔗 Replace with your actual support link

export default function BannedUserPopup() {
  const { loggedInUser } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!loggedInUser) return;

    if (loggedInUser.banned) {
      const timer = setTimeout(() => {
        setVisible(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loggedInUser]);

  // Prevent Android hardware back button from dismissing the popup
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, [visible]);

  const handleOpenSupport = async () => {
    const canOpen = await Linking.canOpenURL(SUPPORT_SERVER_URL);
    if (canOpen) {
      await Linking.openURL(SUPPORT_SERVER_URL);
    } else {
      Alert.alert(
        "Cannot Open Link",
        "Please visit our support server manually.",
      );
    }
  };

  const handleCloseApp = () => {
    Alert.alert(
      "Close App",
      "Are you sure you want to close the app?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Close",
          style: "destructive",
          onPress: () => {
            if (Platform.OS === "android") {
              BackHandler.exitApp();
            }
            // On iOS, apps cannot be programmatically closed per Apple guidelines.
            // We show an informational message instead.
            else {
              Alert.alert(
                "Exit App",
                "Please close the app manually from your app switcher.",
                [{ text: "OK" }],
              );
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  if (!visible) return null;

  const banReason = loggedInUser?.banReason;
  const banExpires = loggedInUser?.banExpires;

  const formattedExpiry = banExpires
    ? new Date(banExpires).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={() => {
        /* intentionally blocked */
      }}
      statusBarTranslucent
    >
      <View className="flex-1 bg-black/75 justify-end sm:justify-center">
        <View className="bg-white w-full max-w-[420px] self-center rounded-t-[32px] sm:rounded-[24px] sm:m-6 p-8 pb-10 items-center shadow-2xl">
          {/* Handle bar */}
          <View className="w-12 h-1.5 bg-gray-200 rounded-full mb-6 sm:hidden" />

          {/* Icon */}
          <View className="h-24 w-24 bg-red-50 rounded-full items-center justify-center mb-6 border-[6px] border-red-100 shadow-inner">
            <Ionicons name="ban" size={44} color="#DC2626" />
          </View>

          {/* Title */}
          <Text className="text-2xl font-bold text-gray-900 font-lora text-center mb-2">
            Account Suspended
          </Text>

          {/* Subtitle */}
          <Text className="text-gray-500 text-center mb-2 leading-6 px-2">
            Your account has been suspended and you no longer have access to
            UNiTIME.
          </Text>

          {/* Ban reason */}
          {banReason ? (
            <View className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 w-full mb-2 mt-1">
              <Text className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">
                Reason
              </Text>
              <Text className="text-red-700 text-sm leading-5">{banReason}</Text>
            </View>
          ) : null}

          {/* Ban expiry */}
          {formattedExpiry ? (
            <View className="bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3 w-full mb-6 mt-1">
              <Text className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-1">
                Suspension Expires
              </Text>
              <Text className="text-orange-700 text-sm">{formattedExpiry}</Text>
            </View>
          ) : (
            <View className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 w-full mb-6 mt-1">
              <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Duration
              </Text>
              <Text className="text-gray-600 text-sm">Permanent ban</Text>
            </View>
          )}

          {/* Action buttons */}
          <View className="w-full gap-3">
            {/* Contact Support */}
            <TouchableOpacity
              onPress={handleOpenSupport}
              activeOpacity={0.85}
              className="bg-red-600 w-full py-3.5 rounded-2xl flex-row items-center justify-center shadow-lg shadow-red-200 active:scale-[0.98] gap-2"
            >
              <Ionicons name="logo-discord" size={18} color="#fff" />
              <Text
                numberOfLines={1}
                className="text-white font-bold text-base text-center flex-shrink"
              >
                Contact Support
              </Text>
            </TouchableOpacity>

            {/* Close App */}
            <TouchableOpacity
              onPress={handleCloseApp}
              activeOpacity={0.85}
              className="bg-blue-700 w-full py-3.5 rounded-2xl flex-row items-center justify-center shadow-lg shadow-gray-200 active:scale-[0.98] gap-2"
            >
              {/* <Ionicons name="close-circle-outline" size={18} color="#9CA3AF" /> */}
              <Text
                numberOfLines={1}
                className="text-white font-bold text-base text-center flex-shrink"
              >
                Close App
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

import { useAppUpdates, UpdateStatus } from "@/hooks/use-app-updates";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UpdateModalProps {
  /** Pass the return value of `useAppUpdates()` directly. */
  updater: ReturnType<typeof useAppUpdates>;
}

// ─── Per-status config ────────────────────────────────────────────────────────

interface StatusConfig {
  iconName: React.ComponentProps<typeof Ionicons>["name"];
  iconColor: string;
  iconBg: string;
  iconBgDark: string;
  title: string;
  body: string;
  primaryLabel: string;
  dismissable: boolean;
  showSpinner: boolean;
}

const STATUS_CONFIG: Partial<Record<UpdateStatus, StatusConfig>> = {
  available: {
    iconName: "cloud-download-outline",
    iconColor: "#2563EB",
    iconBg: "bg-blue-50",
    iconBgDark: "dark:bg-blue-950",
    title: "Update Available",
    body: "A new version of UNiTIME is ready to download. Updates include bug fixes, performance improvements, and new features.",
    primaryLabel: "Download & Install",
    dismissable: true,
    showSpinner: false,
  },
  downloading: {
    iconName: "cloud-download",
    iconColor: "#2563EB",
    iconBg: "bg-blue-50",
    iconBgDark: "dark:bg-blue-950",
    title: "Downloading Update…",
    body: "Please wait while the update is being downloaded. This will only take a moment.",
    primaryLabel: "Downloading…",
    dismissable: false,
    showSpinner: true,
  },
  ready: {
    iconName: "checkmark-circle",
    iconColor: "#059669",
    iconBg: "bg-emerald-50",
    iconBgDark: "dark:bg-emerald-950",
    title: "Ready to Install",
    body: "The update has been downloaded and is ready to apply. The app will restart briefly — any unsaved work will be lost.",
    primaryLabel: "Restart Now",
    dismissable: true,
    showSpinner: false,
  },
  error: {
    iconName: "cloud-offline-outline",
    iconColor: "#DC2626",
    iconBg: "bg-red-50",
    iconBgDark: "dark:bg-red-950",
    title: "Download Failed",
    body: "Something went wrong while fetching the update. Please check your internet connection and try again.",
    primaryLabel: "Try Again",
    dismissable: true,
    showSpinner: false,
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function UpdateModal({ updater }: UpdateModalProps) {
  const { status, downloadUpdate, applyUpdate, dismiss } = updater;

  const isVisible =
    status === "available" ||
    status === "downloading" ||
    status === "ready" ||
    status === "error";

  const config = STATUS_CONFIG[status];

  if (!isVisible || !config) return null;

  const handlePrimary = () => {
    if (status === "available") downloadUpdate();
    else if (status === "ready") applyUpdate();
    else if (status === "error") downloadUpdate();
  };

  return (
    <Modal
      transparent
      animationType="slide"
      visible={isVisible}
      onRequestClose={config.dismissable ? dismiss : undefined}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <View className="flex-1 bg-black/60 justify-end sm:justify-center">
        {/* Sheet */}
        <View className="bg-white dark:bg-zinc-900 w-full max-w-[420px] self-center rounded-t-[32px] sm:rounded-[24px] sm:m-6 p-8 pb-10 items-center shadow-2xl">
          {/* Handle bar */}
          <View className="w-12 h-1.5 bg-gray-200 dark:bg-zinc-700 rounded-full mb-6 sm:hidden" />

          {/* Icon */}
          <View
            className={`h-24 w-24 rounded-full items-center justify-center mb-6 border-[6px] border-white dark:border-zinc-900 shadow-inner ${config.iconBg} ${config.iconBgDark}`}
          >
            {config.showSpinner ? (
              <ActivityIndicator size="large" color={config.iconColor} />
            ) : (
              <Ionicons
                name={config.iconName}
                size={44}
                color={config.iconColor}
              />
            )}
          </View>

          {/* Title */}
          <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 font-lora text-center mb-2">
            {config.title}
          </Text>

          {/* Body */}
          <Text className="text-gray-500 dark:text-zinc-400 text-center leading-6 px-2 mb-6">
            {config.body}
          </Text>

          {/* Version badge (shown when update is available or ready) */}
          {(status === "available" || status === "ready") && (
            <View className="flex-row items-center gap-1.5 mb-6 bg-blue-50 dark:bg-blue-950 px-4 py-1.5 rounded-full border border-blue-100 dark:border-blue-900">
              <Ionicons name="sparkles-outline" size={13} color="#2563EB" />
              <Text className="text-blue-600 dark:text-blue-400 font-bold text-xs tracking-wider">
                {status === "ready"
                  ? "Ready to apply"
                  : "New version available"}
              </Text>
            </View>
          )}

          {/* Actions */}
          <View className="w-full gap-3">
            {/* Primary action */}
            <TouchableOpacity
              onPress={handlePrimary}
              disabled={config.showSpinner}
              activeOpacity={config.showSpinner ? 1 : 0.85}
              className={`w-full py-3.5 rounded-2xl flex-row items-center justify-center shadow-lg gap-2 active:scale-[0.98]
                ${
                  status === "error"
                    ? "bg-red-600 shadow-red-200 dark:shadow-red-900"
                    : status === "ready"
                      ? "bg-emerald-600 shadow-emerald-200 dark:shadow-emerald-900"
                      : "bg-blue-600 shadow-blue-200 dark:shadow-blue-900"
                }
                ${config.showSpinner ? "opacity-70" : "opacity-100"}`}
            >
              {config.showSpinner ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons
                  name={
                    status === "ready"
                      ? "refresh-circle-outline"
                      : status === "error"
                        ? "reload-outline"
                        : "cloud-download-outline"
                  }
                  size={18}
                  color="#fff"
                />
              )}
              <Text className="text-white font-bold text-base text-center flex-shrink">
                {config.primaryLabel}
              </Text>
            </TouchableOpacity>

            {/* Dismiss / Later button */}
            {config.dismissable && (
              <TouchableOpacity
                onPress={dismiss}
                activeOpacity={0.7}
                className="w-full py-3.5 rounded-2xl flex-row items-center justify-center bg-gray-100 dark:bg-zinc-800 active:scale-[0.98]"
              >
                <Text className="text-gray-500 dark:text-zinc-400 font-semibold text-base text-center">
                  {status === "ready" ? "Later" : "Not Now"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

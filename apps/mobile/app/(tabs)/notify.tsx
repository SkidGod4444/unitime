import { useAuth } from "@/contexts/auth.cntxt";
import { useRefresh } from "@/hooks/use-refresh";
import { Notification, useNotificationsStore } from "@/lib/store/notifications";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  RefreshControl,
  SectionList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Notify() {
  const router = useRouter();
  const { refresh, refreshing } = useRefresh();
  const { loggedInUser } = useAuth();
  const { notifications, loading, markAsRead, markAllAsRead } =
    useNotificationsStore();

  const groupedNotifications = useMemo(() => {
    const today: Notification[] = [];
    const yesterday: Notification[] = [];
    const older: Notification[] = [];

    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfYesterday = new Date(startOfToday.getTime() - 86400000);

    notifications.forEach((n) => {
      const date = new Date(n.createdAt);
      if (date >= startOfToday) {
        today.push(n);
      } else if (date >= startOfYesterday) {
        yesterday.push(n);
      } else {
        older.push(n);
      }
    });

    const sections = [];
    if (today.length > 0) sections.push({ title: "Today", data: today });
    if (yesterday.length > 0)
      sections.push({ title: "Yesterday", data: yesterday });
    if (older.length > 0) sections.push({ title: "Older", data: older });

    return sections;
  }, [notifications]);

  // Helper for relative time formatting inside notifications
  function timeSince(dateString: string) {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;

    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " mins ago";
    return Math.floor(seconds) + " secs ago";
  }

  return (
    <SafeAreaView
      className="flex-1 bg-background dark:bg-zinc-900"
      edges={["top"]}
    >
      <View className="flex-1 px-5">
        {/* Header */}
        <View className="flex-row justify-between items-end mt-4 mb-6">
          <View>
            <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 font-lora">
              Notifications
            </Text>
            <Text className="text-gray-500 dark:text-zinc-400 text-sm">
              Stay updated with your classes
            </Text>
          </View>
          {notifications.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                if (loggedInUser?.id) {
                  markAllAsRead(loggedInUser.id);
                }
              }}
            >
              <Text className="text-primary font-medium text-sm mb-1">
                Mark all as read
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Notification List */}
        <SectionList
          sections={groupedNotifications}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100, gap: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || loading}
              onRefresh={refresh}
            />
          }
          renderSectionHeader={({ section: { title } }) => (
            <Text className="text-gray-500 dark:text-zinc-400 font-semibold text-xs uppercase tracking-wider mb-3 mt-4 bg-background dark:bg-zinc-900 pt-2">
              {title}
            </Text>
          )}
          renderItem={({ item }: { item: Notification }) => {
            const isRead = loggedInUser?.id
              ? item.readBy.includes(loggedInUser.id)
              : false;
            return (
              <TouchableOpacity
                onPress={() => {
                  if (!isRead && loggedInUser?.id) {
                    markAsRead(item.id, loggedInUser.id);
                  }
                  if (item.actionUrl) {
                    router.push(item.actionUrl as any);
                  }
                }}
                className={`p-4 rounded-xl border mb-3 flex-row gap-4 ${
                  isRead
                    ? "bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800"
                    : "bg-blue-50/30 border-blue-100 dark:bg-blue-500/10 dark:border-blue-900/40"
                }`}
              >
                <View
                  className={`h-12 w-12 rounded-full ${
                    item.type === "ATTENDANCE" ? "bg-green-50" : "bg-purple-50"
                  } justify-center items-center shrink-0 dark:bg-opacity-20`}
                >
                  <Ionicons
                    name={
                      item.type === "ATTENDANCE" ? "checkmark-circle" : "person"
                    }
                    size={24}
                    className={
                      item.type === "ATTENDANCE"
                        ? "text-green-600"
                        : "text-purple-600"
                    }
                    style={{
                      color: item.type === "ATTENDANCE" ? "#16A34A" : "#9333EA",
                    }}
                  />
                </View>
                <View className="flex-1">
                  <View className="flex-row justify-between items-start mb-1">
                    <Text
                      className={`font-bold text-base ${isRead ? "text-zinc-900 dark:text-zinc-100" : "text-black dark:text-zinc-100"}`}
                    >
                      {item.title}
                    </Text>
                    <Text className="text-xs text-gray-400 dark:text-zinc-500 font-medium shrink-0 ml-2">
                      {timeSince(item.createdAt)}
                    </Text>
                  </View>
                  <Text
                    className="text-gray-500 dark:text-zinc-300 text-sm leading-5"
                    numberOfLines={3}
                  >
                    {item.body}
                  </Text>
                </View>
                {!isRead && (
                  <View className="w-2 h-2 rounded-full bg-blue-600 absolute top-4 right-4" />
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={() => (
            <View className="items-center justify-center py-20">
              <Ionicons
                name="notifications-off-outline"
                size={48}
                color="#9CA3AF"
              />
              <Text className="text-gray-400 dark:text-zinc-500 mt-4 text-center">
                No notifications yet
              </Text>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

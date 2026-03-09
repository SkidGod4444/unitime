import { useRefresh } from "@/hooks/use-refresh";
import { useHistoryStore } from "@/lib/store/history";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const FILTERS = ["All", "Attendance", "System"];

// Helper for relative time formatting
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
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
}

export default function History() {
  const [activeFilter, setActiveFilter] = useState("All");
  const { refresh, refreshing } = useRefresh();
  const { logs, loading } = useHistoryStore();

  const filteredData =
    activeFilter === "All"
      ? logs
      : logs.filter((item) => item.type === activeFilter.toUpperCase());

  return (
    <SafeAreaView
      className="flex-1 bg-background dark:bg-zinc-900"
      edges={["top"]}
    >
      <View className="flex-1 px-5">
        {/* Header */}
        <View className="mt-4 mb-6">
          <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 font-lora">
            Activity History
          </Text>
          <Text className="text-gray-500 dark:text-zinc-400 text-sm">
            Your recent actions and logs
          </Text>
        </View>

        {/* Filters */}
        <View className="mb-6">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter}
                onPress={() => setActiveFilter(filter)}
                className={`px-4 py-2 rounded-full border ${
                  activeFilter === filter
                    ? "bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100"
                    : "bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800"
                }`}
              >
                <Text
                  className={`font-medium text-sm ${
                    activeFilter === filter
                      ? "text-white dark:text-zinc-900"
                      : "text-gray-600 dark:text-zinc-300"
                  }`}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Activity List */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100, gap: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || loading}
              onRefresh={refresh}
            />
          }
        >
          {filteredData.map((item) => (
            <View
              key={item.id}
              className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm flex-row items-center gap-4"
            >
              <View
                className={`h-12 w-12 rounded-full ${
                  item.type === "ATTENDANCE" ? "bg-green-50" : "bg-purple-50"
                } justify-center items-center`}
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
                  <Text className="font-bold text-zinc-900 dark:text-zinc-100 text-base">
                    {item.title}
                  </Text>
                  <Text className="text-xs text-gray-400 dark:text-zinc-500 font-medium">
                    {timeSince(item.createdAt)}
                  </Text>
                </View>
                <Text
                  className="text-gray-500 dark:text-zinc-300 text-sm"
                  numberOfLines={2}
                >
                  {item.description}
                </Text>
              </View>
            </View>
          ))}

          {!loading && filteredData.length === 0 && (
            <View className="items-center justify-center py-10">
              <Text className="text-gray-400">No activity found</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

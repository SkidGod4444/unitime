import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { SectionList, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  time: string;
  icon: string;
  color: string;
  bg: string;
  read: boolean;
};

const NOTIFICATIONS = [
  {
    title: "Today",
    data: [
      {
        id: "1",
        title: "Assignment Graded",
        body: "Your Physics Lab Report has been graded. You scored 85%.",
        time: "2 hours ago",
        icon: "document-text",
        color: "text-blue-600",
        bg: "bg-blue-50",
        read: false,
      },
      {
        id: "2",
        title: "Class Cancelled",
        body: "Tomorrow's Computer Science lecture at 10 AM has been cancelled.",
        time: "4 hours ago",
        icon: "alert-circle",
        color: "text-red-600",
        bg: "bg-red-50",
        read: false,
      },
    ],
  },
  {
    title: "Yesterday",
    data: [
      {
        id: "3",
        title: "New Event: Science Fair",
        body: "Registration for the Annual Science Fair is now open. Sign up before Friday.",
        time: "Yesterday, 3:00 PM",
        icon: "calendar",
        color: "text-purple-600",
        bg: "bg-purple-50",
        read: true,
      },
      {
        id: "4",
        title: "Library Book Due",
        body: "'Introduction to Algorithms' is due tomorrow. Please renew or return.",
        time: "Yesterday, 10:00 AM",
        icon: "book",
        color: "text-orange-600",
        bg: "bg-orange-50",
        read: true,
      },
    ],
  },
];

export default function Notify() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-1 px-5">
        {/* Header */}
        <View className="flex-row justify-between items-end mt-4 mb-6">
          <View>
            <Text className="text-2xl font-bold text-dark font-lora">Notifications</Text>
            <Text className="text-gray-500 text-sm">Stay updated with your classes</Text>
          </View>
          <TouchableOpacity>
            <Text className="text-primary font-medium text-sm mb-1">Mark all as read</Text>
          </TouchableOpacity>
        </View>

        {/* Notification List */}
        <SectionList
          sections={NOTIFICATIONS}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100, gap: 16 }}
          renderSectionHeader={({ section: { title } }) => (
            <Text className="text-gray-500 font-semibold text-xs uppercase tracking-wider mb-3 mt-4 bg-background pt-2">
              {title}
            </Text>
          )}
          renderItem={({ item }: { item: NotificationItem }) => (
            <TouchableOpacity 
              className={`p-4 rounded-xl border mb-3 flex-row gap-4 ${
                item.read 
                    ? "bg-white border-gray-100" 
                    : "bg-blue-50/30 border-blue-100"
              }`}
            >
              <View className={`h-12 w-12 rounded-full ${item.bg} justify-center items-center shrink-0`}>
                <Ionicons name={item.icon as any} size={24} className={item.color} style={{color: item.color === 'text-blue-600' ? '#2563EB' : item.color === 'text-red-600' ? '#DC2626' : item.color === 'text-purple-600' ? '#9333EA' : '#EA580C'}} />
              </View>
              <View className="flex-1">
                <View className="flex-row justify-between items-start mb-1">
                    <Text className={`font-bold text-base ${item.read ? "text-dark" : "text-black"}`}>
                        {item.title}
                    </Text>
                    <Text className="text-xs text-gray-400 font-medium shrink-0 ml-2">{item.time}</Text>
                </View>
                <Text className="text-gray-500 text-sm leading-5">{item.body}</Text>
              </View>
              {!item.read && (
                  <View className="w-2 h-2 rounded-full bg-blue-600 absolute top-4 right-4" />
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={() => (
            <View className="items-center justify-center py-20">
                <Ionicons name="notifications-off-outline" size={48} color="#9CA3AF" />
                <Text className="text-gray-400 mt-4 text-center">No notifications yet</Text>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}
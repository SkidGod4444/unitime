import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const FILTERS = ["All", "Attendance", "Assignments", "System"];

const HISTORY_DATA = [
  {
    id: 1,
    type: "Attendance",
    title: "Marked Present",
    description: "Mathematics - Room 302",
    timestamp: "2 hours ago",
    icon: "checkmark-circle",
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    id: 2,
    type: "Assignments",
    title: "Assignment Submitted",
    description: "Physics Lab Report",
    timestamp: "5 hours ago",
    icon: "document-text",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    id: 3,
    type: "System",
    title: "Profile Updated",
    description: "Changed profile picture",
    timestamp: "1 day ago",
    icon: "person",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    id: 4,
    type: "Attendance",
    title: "Class Cancelled",
    description: "Computer Science - Lab 1",
    timestamp: "2 days ago",
    icon: "alert-circle",
    color: "text-red-600",
    bg: "bg-red-50",
  },
  {
    id: 5,
    type: "Assignments",
    title: "New Assignment",
    description: "History Essay Due",
    timestamp: "3 days ago",
    icon: "book",
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
];

export default function History() {
  const [activeFilter, setActiveFilter] = useState("All");

  const filteredData =
    activeFilter === "All"
      ? HISTORY_DATA
      : HISTORY_DATA.filter((item) => item.type === activeFilter);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-1 px-5">
        {/* Header */}
        <View className="mt-4 mb-6">
          <Text className="text-2xl font-bold text-dark font-lora">Activity History</Text>
          <Text className="text-gray-500 text-sm">Your recent actions and logs</Text>
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
                    ? "bg-dark border-dark"
                    : "bg-white border-gray-200"
                }`}
                >
                <Text
                    className={`font-medium text-sm ${
                    activeFilter === filter ? "text-white" : "text-gray-600"
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
        >
          {filteredData.map((item) => (
            <View
              key={item.id}
              className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex-row items-center gap-4"
            >
              <View className={`h-12 w-12 rounded-full ${item.bg} justify-center items-center`}>
                <Ionicons name={item.icon as any} size={24} className={item.color} style={{color: item.color === 'text-green-600' ? '#16A34A' : item.color === 'text-blue-600' ? '#2563EB' : item.color === 'text-purple-600' ? '#9333EA' : item.color === 'text-red-600' ? '#DC2626' : '#EA580C'}} />
              </View>
              <View className="flex-1">
                <View className="flex-row justify-between items-start mb-1">
                    <Text className="font-bold text-dark text-base">{item.title}</Text>
                    <Text className="text-xs text-gray-400 font-medium">{item.timestamp}</Text>
                </View>
                <Text className="text-gray-500 text-sm">{item.description}</Text>
              </View>
            </View>
          ))}
          
          {filteredData.length === 0 && (
              <View className="items-center justify-center py-10">
                  <Text className="text-gray-400">No activity found</Text>
              </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

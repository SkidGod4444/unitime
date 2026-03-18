import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AnnouncementsScreen() {
  const router = useRouter();

  const announcements: any[] = [];

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-zinc-950" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center px-5 py-4 border-b border-gray-100 dark:border-zinc-800">
        <TouchableOpacity 
          onPress={() => router.back()} 
          className="w-10 h-10 bg-gray-50 dark:bg-zinc-900 rounded-full items-center justify-center mr-3 border border-gray-200 dark:border-zinc-800"
        >
          <Ionicons name="chevron-back" size={24} color="#71717A" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 font-lora">
          Announcements
        </Text>
      </View>

      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
      >
        <View className="gap-4">
          {announcements.length === 0 ? (
            <View className="bg-gray-50 dark:bg-zinc-800/50 rounded-3xl p-8 items-center justify-center border border-gray-100 dark:border-zinc-800 border-dashed mt-4">
              <View className="w-16 h-16 bg-white dark:bg-zinc-800 rounded-full items-center justify-center mb-4 shadow-sm border border-gray-50 dark:border-zinc-700">
                <Ionicons name="notifications-off-outline" size={28} color="#9CA3AF" />
              </View>
              <Text className="text-lg font-bold text-gray-700 dark:text-zinc-300 mb-2 font-lora">
                All caught up!
              </Text>
              <Text className="text-gray-500 dark:text-zinc-500 text-center text-sm px-4 leading-relaxed">
                There are no new announcements to show right now. Check back later.
              </Text>
            </View>
          ) : (
            announcements.map((annc) => (
              <View 
                key={annc.id} 
                className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm"
              >
                <View className="flex-row justify-between items-center mb-3">
                  <View className="flex-row items-center gap-2">
                    <View className={`w-2.5 h-2.5 rounded-full ${annc.color}`} />
                    <Text className="text-[#848484] dark:text-zinc-400 text-xs font-bold uppercase tracking-widest">
                      {annc.type}
                    </Text>
                  </View>
                  <View className="bg-gray-50 dark:bg-zinc-800/50 px-2.5 py-1 rounded-md border border-gray-100 dark:border-zinc-800">
                    <Text className="text-[10px] text-gray-500 dark:text-zinc-400 font-medium tracking-wide">
                      {annc.time}
                    </Text>
                  </View>
                </View>
                
                <Text className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                  {annc.title}
                </Text>
                
                <Text className="text-sm text-gray-600 dark:text-zinc-300 leading-relaxed font-medium">
                  {annc.description}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

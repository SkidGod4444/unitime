import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { Image, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Profile() {
  const router = useRouter();
  const [isDark, setIsDark] = React.useState(false);

  // Grouped menu items for cleaner code
  const menuItems = [
    {
      title: "Account Settings",
      items: [
        { icon: "person-outline", label: "Edit Profile", route: "/edit-profile", color: "#2563EB", bg: "bg-blue-50" },
        { icon: "notifications-outline", label: "Notifications", route: "/notifications", color: "#F59E0B", bg: "bg-yellow-50" },
        { icon: "shield-checkmark-outline", label: "Security & Password", route: "/security", color: "#10B981", bg: "bg-green-50" },
      ]
    },
    {
      title: "App Settings",
      items: [
        { icon: "help-buoy-outline", label: "Help & Support", route: "/support", color: "#EC4899", bg: "bg-pink-50" },
        { icon: "document-text-outline", label: "Privacy Policy", route: "/privacy", color: "#8B5CF6", bg: "bg-purple-50" },
      ]
    }
  ];

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="px-5 py-2 flex-row items-center justify-between border-b border-gray-50 pb-4">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="h-10 w-10 bg-gray-50 rounded-full items-center justify-center"
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-bold font-lora text-dark">My Profile</Text>
        <TouchableOpacity 
          className="h-10 w-10 bg-gray-50 rounded-full items-center justify-center"
        >
          <Ionicons name="settings-outline" size={22} color="#374151" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Profile Card */}
        <View className="items-center mt-6 px-5">
            <View className="relative">
                <View className="h-28 w-28 rounded-full bg-gray-100 p-1 border-2 border-primary/20">
                    <Image 
                        source={{ uri: "https://i.pravatar.cc/150?img=68" }} 
                        className="h-full w-full rounded-full"
                    />
                </View>
                <TouchableOpacity className="absolute bottom-0 right-0 bg-primary h-8 w-8 rounded-full items-center justify-center border-2 border-white shadow-sm">
                    <Ionicons name="camera" size={16} color="white" />
                </TouchableOpacity>
            </View>
            
            <Text className="text-2xl font-bold font-lora text-dark mt-4">Saidev Dhal</Text>
            <Text className="text-gray-500 font-medium">Computer Science & Eng.</Text>
            
            <View className="flex-row items-center gap-2 mt-2 bg-blue-50 px-3 py-1 rounded-full">
                <Ionicons name="id-card-outline" size={14} color="#2563EB" />
                <Text className="text-primary font-bold text-xs">ID: 21010158</Text>
            </View>
        </View>

        {/* Stats Row */}
        <View className="flex-row justify-between px-5 mt-8 gap-4">
            {[
                { label: "Semester", value: "6th", icon: "school-outline", color: "text-blue-600", bg: "bg-blue-50" },
                { label: "CGPA", value: "8.9", icon: "ribbon-outline", color: "text-purple-600", bg: "bg-purple-50" },
                { label: "Attendance", value: "92%", icon: "stats-chart-outline", color: "text-green-600", bg: "bg-green-50" },
            ].map((stat, index) => (
                <View key={index} className="flex-1 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm items-center">
                    <View className={`h-8 w-8 ${stat.bg} rounded-full items-center justify-center mb-2`}>
                        <Ionicons name={stat.icon as any} size={16} className={stat.color} style={{color: stat.color === 'text-blue-600' ? '#2563EB' : stat.color === 'text-purple-600' ? '#9333EA' : '#16A34A'}} />
                    </View>
                    <Text className="text-lg font-bold text-dark">{stat.value}</Text>
                    <Text className="text-xs text-gray-400 font-medium uppercase tracking-wide">{stat.label}</Text>
                </View>
            ))}
        </View>

        {/* Menu Items */}
        <View className="mt-8 px-5 gap-6">
            {menuItems.map((section, sectionIndex) => (
                <View key={sectionIndex}>
                    <Text className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">{section.title}</Text>
                    <View className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        {section.items.map((item, index) => (
                            <TouchableOpacity 
                                key={index}
                                className={`flex-row items-center justify-between p-4 bg-white active:bg-gray-50 ${index !== section.items.length - 1 ? 'border-b border-gray-50' : ''}`}
                            >
                                <View className="flex-row items-center gap-4">
                                    <View className={`h-10 w-10 ${item.bg} rounded-full items-center justify-center`}>
                                        <Ionicons name={item.icon as any} size={20} color={item.color} />
                                    </View>
                                    <Text className="text-base font-semibold text-gray-700">{item.label}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            ))}

            {/* Dark Mode Toggle */}
            <View>
                 <Text className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Preferences</Text>
                 <View className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-4 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-4">
                        <View className="h-10 w-10 bg-slate-100 rounded-full items-center justify-center">
                            <Ionicons name="moon-outline" size={20} color="#475569" />
                        </View>
                        <Text className="text-base font-semibold text-gray-700">Dark Mode</Text>
                    </View>
                    <Switch 
                        value={isDark} 
                        onValueChange={setIsDark}
                        trackColor={{ false: "#E2E8F0", true: "#2563EB" }}
                        thumbColor={"#FFFFFF"}
                    />
                 </View>
            </View>
            
            {/* Logout Button */}
            <TouchableOpacity className="flex-row items-center justify-center gap-2 bg-red-50 p-4 rounded-2xl border border-red-100 mt-4 active:scale-[0.99] transition-transform">
                <Ionicons name="log-out-outline" size={20} color="#DC2626" />
                <Text className="text-red-600 font-bold text-base">Log Out</Text>
            </TouchableOpacity>
            
            <Text className="text-center text-xs text-gray-400 mt-4">Version 1.0.2 (Build 202402)</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

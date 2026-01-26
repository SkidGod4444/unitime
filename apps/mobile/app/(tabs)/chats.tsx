import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { FlatList, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { SafeAreaView } from "react-native-safe-area-context";

type ChatItem = {
  id: string;
  name: string;
  message: string;
  time: string;
  avatar: string;
  unread: number;
  online: boolean;
};

const CHATS: ChatItem[] = [
  {
    id: "1",
    name: "Dr. Sarah Wilson",
    message: "Don't forget to submit your assignment by tomorrow.",
    time: "10:30 AM",
    avatar: "https://i.pravatar.cc/150?img=1",
    unread: 2,
    online: true,
  },
  {
    id: "2",
    name: "Physics Group",
    message: "Alex: I think the answer to Q3 is 42.",
    time: "09:15 AM",
    avatar: "https://i.pravatar.cc/150?img=11",
    unread: 5,
    online: true,
  },
  {
    id: "3",
    name: "John Doe",
    message: "Are you coming to the library?",
    time: "Yesterday",
    avatar: "https://i.pravatar.cc/150?img=3",
    unread: 0,
    online: true,
  },
  {
    id: "4",
    name: "Class - Computer Science",
    message: "Prof. Smith: Class is rescheduled to Room 405.",
    time: "Yesterday",
    avatar: "https://i.pravatar.cc/150?img=8",
    unread: 0,
    online: true,
  },
  {
    id: "5",
    name: "Emily Davis",
    message: "Thanks for the help!",
    time: "Mon",
    avatar: "https://i.pravatar.cc/150?img=5",
    unread: 0,
    online: true,
  },
  {
    id: "6",
    name: "Michael Brown",
    message: "Can you share the notes?",
    time: "Sun",
    avatar: "https://i.pravatar.cc/150?img=13",
    unread: 1,
    online: true,
  },
];

const ONLINE_USERS = CHATS.filter(c => c.online || Math.random() > 0.5); // Mock online users

export default function Chats() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredChats = CHATS.filter(
    (chat) =>
      chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderRightActions = (progress: any, dragX: any) => {
    return (
      <View className="flex-row items-center">
        <TouchableOpacity className="bg-gray-200 justify-center items-center w-20 h-full">
            <Ionicons name="archive-outline" size={24} color="#4B5563" />
        </TouchableOpacity>
        <TouchableOpacity className="bg-red-500 justify-center items-center w-20 h-full">
            <Ionicons name="trash-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <GestureHandlerRootView className="flex-1 bg-white">
        <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <View className="flex-1">
            {/* Header */}
            <View className="px-5 pt-2 pb-4 flex-row justify-between items-center bg-white z-10">
                <Text className="text-3xl font-bold text-dark font-lora">Messages</Text>
                <TouchableOpacity className="bg-gray-50 p-2.5 rounded-full">
                    <Ionicons name="create-outline" size={24} color="#2563EB" />
                </TouchableOpacity>
            </View>

            {/* Content */}
            <FlatList
            data={filteredChats}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
            ListHeaderComponent={
                <View className="mb-2">
                    {/* Search Bar */}
                    <View className="mx-5 flex-row items-center bg-gray-100 rounded-xl px-4 py-2.5 mb-6">
                        <Ionicons name="search" size={20} color="#9CA3AF" />
                        <TextInput
                            className="flex-1 ml-3 text-base text-dark"
                            placeholder="Search..."
                            placeholderTextColor="#9CA3AF"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    {/* Active Now Rail */}
                    <View className="pl-5 mb-6">
                        <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Active Now</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-4 pr-5">
                            {ONLINE_USERS.map((user) => (
                                <TouchableOpacity key={user.id} className="items-center gap-1 mr-4">
                                    <View className="relative">
                                        <Image
                                            source={{ uri: user.avatar }}
                                            className="h-14 w-14 rounded-full bg-gray-200 ring-2 ring-white"
                                        />
                                        <View className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-white" />
                                    </View>
                                    <Text className="text-xs text-dark font-medium w-16 text-center" numberOfLines={1}>
                                        {user.name.split(" ")[0]}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <Text className="px-5 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Recent</Text>
                </View>
            }
            renderItem={({ item }) => (
                <Swipeable renderRightActions={renderRightActions}>
                    <TouchableOpacity 
                        className="flex-row items-center bg-white px-5 py-3.5 active:bg-gray-50"
                        onPress={() => router.push("/chat")}
                    >
                        <View className="relative">
                            <Image
                            source={{ uri: item.avatar }}
                            className="h-12 w-12 rounded-full bg-gray-200"
                            />
                            {item.online && (
                            <View className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white" />
                            )}
                        </View>
                        
                        <View className="flex-1 ml-4 justify-center border-b border-gray-100 pb-3.5">
                            <View className="flex-row justify-between items-center mb-1">
                                <Text className={`text-base ${item.unread > 0 ? "font-bold text-dark" : "font-semibold text-gray-800"}`} numberOfLines={1}>
                                    {item.name}
                                </Text>
                                <Text className={`text-xs ${item.unread > 0 ? "text-blue-600 font-bold" : "text-gray-400"}`}>
                                    {item.time}
                                </Text>
                            </View>
                            <View className="flex-row justify-between items-center">
                                <Text 
                                    className={`text-sm flex-1 mr-4 ${item.unread > 0 ? "text-dark font-medium" : "text-gray-500"}`} 
                                    numberOfLines={1}
                                >
                                    {item.message}
                                </Text>
                                {item.unread > 0 && (
                                    <View className="bg-blue-600 px-2 py-0.5 rounded-full min-w-[20px] items-center justify-center">
                                    <Text className="text-white text-xs font-bold">{item.unread}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </TouchableOpacity>
                </Swipeable>
            )}
            ListEmptyComponent={() => (
                <View className="items-center justify-center py-20">
                    <Ionicons name="chatbubbles-outline" size={48} color="#9CA3AF" />
                    <Text className="text-gray-400 mt-4 text-center">No conversations found</Text>
                </View>
            )}
            />
        </View>
        </SafeAreaView>
    </GestureHandlerRootView>
  );
}

import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
import { useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Message {
  id: string;
  text: string;
  sender: string;
  senderId: string;
  timestamp: string;
  isSent: boolean;
  avatar?: string;
}

export default function Chat() {
  const navigation = useNavigation();
  const scrollViewRef = useRef<ScrollView>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hey everyone! Welcome to the group chat! 👋",
      sender: "Admin",
      senderId: "admin",
      timestamp: "10:30 AM",
      isSent: false,
      avatar: "https://i.pravatar.cc/150?img=12",
    },
    {
      id: "2",
      text: "Thanks for adding me!",
      sender: "John",
      senderId: "john",
      timestamp: "10:32 AM",
      isSent: false,
      avatar: "https://i.pravatar.cc/150?img=3",
    },
    {
      id: "3",
      text: "This is a test message from me",
      sender: "You",
      senderId: "me",
      timestamp: "10:35 AM",
      isSent: true,
    },
    {
      id: "4",
      text: "Great! Looking forward to working with everyone.",
      sender: "Sarah",
      senderId: "sarah",
      timestamp: "10:36 AM",
      isSent: false,
      avatar: "https://i.pravatar.cc/150?img=5",
    },
    {
      id: "5",
      text: "Same here! 😊",
      sender: "You",
      senderId: "me",
      timestamp: "10:37 AM",
      isSent: true,
    },
  ]);

  const handleSend = () => {
    if (message.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        text: message.trim(),
        sender: "You",
        senderId: "me",
        timestamp: new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
        isSent: true,
      };
      setMessages([...messages, newMessage]);
      setMessage("");
    }
  };

  const MessageBubble = ({ msg }: { msg: Message }) => {
    return (
      <View
        className={`mb-4 flex-row ${
          msg.isSent ? "justify-end" : "justify-start"
        }`}
      >
        {!msg.isSent && (
            <Image 
                source={{ uri: msg.avatar || "https://i.pravatar.cc/150?img=8" }} 
                className="h-8 w-8 rounded-full bg-gray-200 mr-2 mt-auto"
            />
        )}
        <View
          className={`px-4 py-3 max-w-[75%] ${
            msg.isSent
              ? "bg-blue-600 rounded-2xl rounded-tr-sm"
              : "bg-gray-100 rounded-2xl rounded-tl-sm"
          }`}
        >
          {!msg.isSent && (
              <Text className="text-xs font-bold text-gray-500 mb-1">{msg.sender}</Text>
          )}
          <Text
            className={`text-[15px] leading-[22px] ${
              msg.isSent ? "text-white" : "text-gray-800"
            }`}
          >
            {msg.text}
          </Text>
          <View className="flex-row items-center justify-end mt-1 space-x-1">
            <Text
              className={`text-[10px] ${
                msg.isSent ? "text-blue-200" : "text-gray-400"
              }`}
            >
              {msg.timestamp}
            </Text>
            {msg.isSent && (
              <Ionicons
                name="checkmark-done"
                size={12}
                color="#BFDBFE"
                style={{ marginLeft: 2 }}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
          keyboardVerticalOffset={0}
        >
            {/* Header */}
            <View className="px-4 py-3 flex-row items-center justify-between border-b border-gray-100 bg-white z-10">
            <View className="flex-row items-center flex-1">
                <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3 p-1 -ml-1">
                <Ionicons name="chevron-back" size={28} color="#1F2937" />
                </TouchableOpacity>
                <View className="relative">
                    <Image 
                        source={{ uri: "https://i.pravatar.cc/150?img=12" }} 
                        className="h-10 w-10 rounded-full bg-gray-200"
                    />
                    <View className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-white" />
                </View>
                <View className="flex-1 ml-3">
                <Text className="text-dark text-base font-bold font-lora">
                    Dr. Sarah Wilson
                </Text>
                <Text className="text-gray-400 text-xs font-medium">
                    Online
                </Text>
                </View>
            </View>
            <View className="flex-row items-center space-x-4 gap-4">
                <TouchableOpacity>
                <Ionicons name="call-outline" size={24} color="#1F2937" />
                </TouchableOpacity>
                <TouchableOpacity>
                <Ionicons name="videocam-outline" size={24} color="#1F2937" />
                </TouchableOpacity>
            </View>
            </View>

            {/* Messages List */}
            <ScrollView
                ref={scrollViewRef}
                className="flex-1 px-4"
                contentContainerStyle={{ paddingVertical: 20 }}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
                {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
                ))}
            </ScrollView>

            {/* Input Area */}
            <View className="px-4 py-3 border-t border-gray-100 bg-white flex-row items-end pb-6">
                <TouchableOpacity className="p-2 mr-2 bg-gray-50 rounded-full">
                <Ionicons name="add" size={24} color="#6B7280" />
                </TouchableOpacity>
                <View className="flex-1 bg-gray-50 rounded-2xl px-4 py-2 flex-row items-center min-h-[44px]">
                    <TextInput
                        className="flex-1 text-base text-dark max-h-24 pt-0"
                        placeholder="Type a message..."
                        placeholderTextColor="#9CA3AF"
                        value={message}
                        onChangeText={setMessage}
                        multiline
                    />
                    <TouchableOpacity className="ml-2">
                        <Ionicons name="happy-outline" size={24} color="#9CA3AF" />
                    </TouchableOpacity>
                </View>
                {message.trim().length > 0 ? (
                    <TouchableOpacity
                        onPress={handleSend}
                        className="ml-2 bg-primary rounded-full p-2.5 h-11 w-11 justify-center items-center shadow-sm"
                    >
                        <Ionicons name="send" size={20} color="white" style={{ marginLeft: 2 }} />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        className="ml-2 bg-gray-50 rounded-full p-2.5 h-11 w-11 justify-center items-center"
                    >
                        <Ionicons name="mic-outline" size={24} color="#6B7280" />
                    </TouchableOpacity>
                )}
            </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
  );
}
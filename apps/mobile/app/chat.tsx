import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
    ImageBackground,
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
}

export default function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hey everyone! Welcome to the group chat! 👋",
      sender: "Admin",
      senderId: "admin",
      timestamp: "10:30 AM",
      isSent: false,
    },
    {
      id: "2",
      text: "Thanks for adding me!",
      sender: "John",
      senderId: "john",
      timestamp: "10:32 AM",
      isSent: false,
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
        className={`mb-3 px-4 ${
          msg.isSent ? "items-end" : "items-start"
        }`}
      >
        {!msg.isSent && (
          <Text className="text-xs text-gray-500 mb-1 ml-1">{msg.sender}</Text>
        )}
        <View
          className={`max-w-[75%] rounded-lg px-3 py-2 ${
            msg.isSent
              ? "bg-[#DCF8C6] rounded-tr-none"
              : "bg-white rounded-tl-none"
          }`}
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2,
          }}
        >
          <Text
            className={`text-[15px] ${
              msg.isSent ? "text-[#000000]" : "text-[#000000]"
            }`}
            style={{ fontFamily: "Lora-Regular" }}
          >
            {msg.text}
          </Text>
          <View className="flex-row items-center justify-end mt-1">
            <Text
              className={`text-[11px] ${
                msg.isSent ? "text-[#667781]" : "text-[#667781]"
              }`}
            >
              {msg.timestamp}
            </Text>
            {msg.isSent && (
              <Ionicons
                name="checkmark-done"
                size={14}
                color="#4FC3F7"
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
      <SafeAreaView className="flex-1" edges={["top"]}>
    <ImageBackground
      source={require("../assets/images/chat-bg.png")}
      className="flex-1"
    //   resizeMode="cover"
    >
      {/* <StatusBar style="light" /> */}
        {/* Header */}
        <View className="bg-[#075E54] px-4 py-3 flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity className="mr-3">
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <View className="w-10 h-10 rounded-full bg-gray-300 items-center justify-center mr-3">
              <Ionicons name="people" size={20} color="#075E54" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-base font-semibold">
                Group Chat
              </Text>
              <Text className="text-[#B2F5EA] text-xs">
                5 members • online
              </Text>
            </View>
          </View>
          <View className="flex-row items-center">
            <TouchableOpacity className="mr-4">
              <Ionicons name="videocam" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity className="mr-4">
              <Ionicons name="call" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity>
              <Ionicons name="ellipsis-vertical" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages List */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingVertical: 10 }}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
          </ScrollView>

          {/* Input Area */}
          <View className="bg-[#F0F0F0] px-2 py-2 flex-row items-center">
            <TouchableOpacity className="mx-2">
              <Ionicons name="add-circle" size={28} color="#075E54" />
            </TouchableOpacity>
            <TextInput
              className="flex-1 bg-white rounded-full px-4 py-2 text-base max-h-20"
              placeholder="Type a message"
              placeholderTextColor="#999"
              value={message}
              onChangeText={setMessage}
              multiline
              style={{ fontFamily: "Lora-Regular" }}
            />
            {message.trim() ? (
              <TouchableOpacity
                onPress={handleSend}
                className="mx-2 bg-[#075E54] rounded-full p-2"
              >
                <Ionicons name="send" size={20} color="white" />
              </TouchableOpacity>
            ) : (
              <View className="flex-row mx-2">
                <TouchableOpacity className="mr-2">
                  <Ionicons name="camera" size={24} color="#075E54" />
                </TouchableOpacity>
                <TouchableOpacity>
                  <Ionicons name="mic" size={24} color="#075E54" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
    </ImageBackground>
      </SafeAreaView>
  );
}
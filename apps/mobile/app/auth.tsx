import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Auth() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleAuth = () => {
    // Dummy authentication
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView 
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
            showsVerticalScrollIndicator={false}
            className="px-6"
        >
            {/* Header / Logo */}
            <View className="items-center mb-10">
                <View className="h-20 w-20 bg-blue-50 rounded-2xl items-center justify-center mb-6 shadow-sm border border-blue-100">
                    <Ionicons name="school" size={40} color="#2563EB" />
                </View>
                <Text className="text-3xl font-bold text-dark font-lora text-center mb-2">
                    {isLogin ? "Welcome Back" : "Create Account"}
                </Text>
                <Text className="text-gray-500 text-center text-base">
                    {isLogin ? "Sign in to continue to UniTime" : "Join us and manage your studies"}
                </Text>
            </View>

            {/* Form */}
            <View className="gap-5 mb-8">
                {/* Email Input */}
                <View>
                    <Text className="text-sm font-bold text-gray-700 mb-2 ml-1">Email Address</Text>
                    <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 focus:border-blue-500 transition-colors">
                        <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
                        <TextInput 
                            className="flex-1 ml-3 text-base text-dark"
                            placeholder="student@university.edu"
                            placeholderTextColor="#9CA3AF"
                            autoCapitalize="none"
                            keyboardType="email-address"
                            value={email}
                            onChangeText={setEmail}
                        />
                    </View>
                </View>

                {/* Password Input */}
                <View>
                    <Text className="text-sm font-bold text-gray-700 mb-2 ml-1">Password</Text>
                    <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 focus:border-blue-500">
                        <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
                        <TextInput 
                            className="flex-1 ml-3 text-base text-dark"
                            placeholder="••••••••"
                            placeholderTextColor="#9CA3AF"
                            secureTextEntry={!showPassword}
                            value={password}
                            onChangeText={setPassword}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                    </View>
                    {isLogin && (
                        <TouchableOpacity className="self-end mt-2">
                            <Text className="text-blue-600 font-medium text-sm">Forgot Password?</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Actions */}
            <TouchableOpacity 
                className="bg-primary rounded-xl py-4 shadow-lg shadow-blue-200 mb-6 active:opacity-90 transition-opacity"
                onPress={handleAuth}
            >
                <Text className="text-white text-center font-bold text-base">
                    {isLogin ? "Sign In" : "Sign Up"}
                </Text>
            </TouchableOpacity>

            <View className="flex-row justify-center items-center">
                <Text className="text-gray-500 text-sm">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                </Text>
                <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
                    <Text className="text-blue-600 font-bold text-sm">
                        {isLogin ? "Sign Up" : "Sign In"}
                    </Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

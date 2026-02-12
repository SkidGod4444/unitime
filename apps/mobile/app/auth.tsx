import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
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
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          {/* Hero Section */}
          <View className="flex-1 justify-center items-center px-8 pt-14 pb-6">
            
            {/* Decorative Pills */}
            <View className="flex-row items-center gap-3 mb-6">
              <View className="bg-blue-50 rounded-full px-4 py-2 border border-blue-100">
                <Text className="text-blue-600 font-lato-bold text-xs">Attendance</Text>
              </View>
              <View className="bg-purple-50 rounded-full px-4 py-2 border border-purple-100">
                <Text className="text-purple-600 font-lato-bold text-xs">Calendar</Text>
              </View>
              <View className="bg-emerald-50 rounded-full px-4 py-2 border border-emerald-100">
                <Text className="text-emerald-600 font-lato-bold text-xs">Classes</Text>
              </View>
            </View>

            {/* Tagline */}
            <Text className="text-base text-center font-lora text-gray-400 leading-6 mx-auto">
              Effortless class management, seamlessly organized—with UNiTIME.
            </Text>
          </View>

          {/* Form Card */}
          <View className="mx-5 mb-10 bg-gray-50/80 rounded-3xl p-4 shadow-2xl shadow-black/10 border border-gray-200/90">
            {/* Email */}
            <View className="mb-5">
              <Text className="text-gray-800 font-lora font-bold mb-2 text-base tracking-wide">
                Email
              </Text>
              <TextInput
                className="bg-white/90 text-black px-4 py-4 rounded-xl font-lato-regular text-base border border-blue-300"
                placeholder="student@university.edu"
                placeholderTextColor="#b0b0b0"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* Password */}
            <View className="mb-6">
              <Text className="text-gray-800 font-lora font-bold mb-2 text-base tracking-wide">
                Password
              </Text>
              <TextInput
                className="bg-white/90 text-black px-4 py-4 rounded-xl font-lato-regular text-base border border-blue-300"
                placeholder="••••••••"
                placeholderTextColor="#b0b0b0"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              {isLogin && (
                <TouchableOpacity className="self-end mt-2">
                  <Text className="text-blue-600 font-lato-bold text-sm">
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              className="mb-5 rounded-xl py-4 bg-blue-600 shadow-lg shadow-blue-500/20"
              onPress={handleAuth}
            >
              <View className="flex-row items-center justify-center">
                <Text className="font-lato-bold text-lg text-center text-white">
                  {isLogin ? "Sign In" : "Sign Up"}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Toggle Login/Signup */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsLogin(!isLogin)}
            >
              <Text className="text-blue-700 font-lato-bold text-center underline text-base">
                {isLogin
                  ? "Don't have an account? Sign Up"
                  : "Already have an account? Sign In"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View className="flex-row items-center justify-center mb-10 px-16 mt-auto">
            <Text className="text-gray-400 font-lato-regular text-base text-center">
              By continuing, you agree to our{" "}
              <Text
                className="text-gray-500 font-lato-bold text-base text-center underline"
                onPress={() => Linking.openURL("https://l.devwtf.in/unitime")}
              >
                Terms of Service
              </Text>{" "}
              and{" "}
              <Text
                className="text-gray-500 underline font-lato-bold text-base text-center"
                onPress={() => Linking.openURL("https://l.devwtf.in/unitime")}
              >
                Privacy Policy
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

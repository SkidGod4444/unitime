import { useAuth } from "@/contexts/auth.cntxt";
import { useThemeStore } from "@/lib/store";
import { isInstitutionalEmail } from "@/utils/email.validator";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  Image,
  Linking,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

export default function Auth() {
  const { theme } = useThemeStore();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");

  const { register, login } = useAuth();
  const isDark = theme === "dark";

  const handleLogin = async () => {
    try {
      if (!isInstitutionalEmail(email)) {
        alert("Please use your institutional email address.");
      }
      await login(email, password);
    } catch (err) {
      console.error("Login failed:", err);
      alert("Login failed. Please check your credentials and try again.");
    }
  };

  const handleSignUp = async () => {
    if (!isInstitutionalEmail(email)) {
      alert("Please use your institutional email address.");
    }
    if (!isLogin && !firstName.trim()) {
      alert("Please enter your first name.");
      return;
    }

    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      await register(email, password, fullName);
    } catch (err) {
      console.error("Signup failed:", err);
      alert("Signup failed. Please check your details and try again.");
    }
  };

  return (
    <View className="flex-1 bg-indigo-600 dark:bg-zinc-950">
      <StatusBar style="light" />

      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        enableOnAndroid={true}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Top Header Background Area */}
        <View
          className="pt-24 pb-20 overflow-hidden relative"
          style={{ minHeight: 280 }}
        >
          {/* Decorative Blobs */}
          <View className="absolute top-10 -left-16 w-56 h-56 bg-indigo-500/40 dark:bg-indigo-900/40 rounded-full opacity-90" />
          <View className="absolute -bottom-12 -right-12 w-64 h-64 bg-purple-500/30 dark:bg-purple-900/30 rounded-full opacity-90" />

          <View className="flex-1 justify-center items-center px-6 relative z-10">
            <Text className="text-white text-[38px] font-bold text-center tracking-tight leading-tight">
              {isLogin ? "Welcome\nback" : "Create an\naccount"}
            </Text>
          </View>
        </View>

        {/* Bottom Form Card */}
        <View className="flex-1 bg-white dark:bg-[#09090B] -mt-10 rounded-t-[40px] px-6 pt-10 pb-10 shadow-2xl shadow-indigo-500/10">
          <View className="items-center mb-10">
            <Image
              source={require("@/assets/icons/logo.png")}
              className="w-16 h-16"
              resizeMode="contain"
            />
          </View>

          {/* Form Fields */}
          <View className="gap-y-4">
            {!isLogin && (
              <View className="flex-row gap-x-3">
                <TextInput
                  className="flex-1 bg-slate-50 dark:bg-zinc-900/50 rounded-2xl px-5 py-4 border border-slate-200/60 dark:border-zinc-800/80 text-[15px] font-medium text-slate-900 dark:text-white"
                  placeholder="First Name"
                  placeholderTextColor={isDark ? "#71717A" : "#94A3B8"}
                  autoCapitalize="words"
                  value={firstName}
                  onChangeText={setFirstName}
                />
                <TextInput
                  className="flex-1 bg-slate-50 dark:bg-zinc-900/50 rounded-2xl px-5 py-4 border border-slate-200/60 dark:border-zinc-800/80 text-[15px] font-medium text-slate-900 dark:text-white"
                  placeholder="Last Name (Optional)"
                  placeholderTextColor={isDark ? "#71717A" : "#94A3B8"}
                  autoCapitalize="words"
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>
            )}

            <TextInput
              className="bg-slate-50 dark:bg-zinc-900/50 rounded-2xl px-5 py-4 border border-slate-200/60 dark:border-zinc-800/80 text-[15px] font-medium text-slate-900 dark:text-white"
              placeholder="Email"
              placeholderTextColor={isDark ? "#71717A" : "#94A3B8"}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <View className="flex-row gap-x-3">
              <TextInput
                className="flex-1 bg-slate-50 dark:bg-zinc-900/50 rounded-2xl px-5 py-4 border border-slate-200/60 dark:border-zinc-800/80 text-[15px] font-medium text-slate-900 dark:text-white"
                placeholder="Password"
                placeholderTextColor={isDark ? "#71717A" : "#94A3B8"}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowPassword(!showPassword)}
                className="bg-slate-50 dark:bg-zinc-900/50 rounded-2xl border border-slate-200/60 dark:border-zinc-800/80 w-[60px] items-center justify-center"
              >
                <Ionicons
                  name={showPassword ? "eye" : "eye-off"}
                  size={20}
                  color={isDark ? "#71717A" : "#94A3B8"}
                />
              </TouchableOpacity>
            </View>

            {isLogin && (
              <TouchableOpacity className="self-end mt-1 px-1">
                <Text className="text-indigo-600 dark:text-indigo-400 font-bold text-[13px]">
                  Forgot password?
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Submit Button */}
          <View className="mt-8 mb-6">
            <TouchableOpacity
              activeOpacity={0.85}
              className="bg-indigo-600 dark:bg-indigo-500 rounded-full py-[18px] items-center justify-center shadow-[0_8px_30px_rgb(79,70,229,0.3)]"
              onPress={isLogin ? handleLogin : handleSignUp}
            >
              <Text className="text-white font-bold text-[17px] tracking-wide">
                {isLogin ? "Log in" : "Create account"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Terms text */}
          <View className="items-center px-4 mb-8">
            <Text className="text-slate-400 dark:text-zinc-500 text-[13px] text-center font-medium leading-[20px]">
              {isLogin
                ? "By logging in you agree to our"
                : "Signing up for an account means you\nagree to the"}{" "}
              <Text
                className="text-slate-600 dark:text-zinc-400 font-bold underline"
                onPress={() => Linking.openURL("https://unitime.devwtf.in/")}
              >
                Privacy Policy
              </Text>{" "}
              and{" "}
              <Text
                className="text-slate-600 dark:text-zinc-400 font-bold underline"
                onPress={() => Linking.openURL("https://unitime.devwtf.in/")}
              >
                Terms of Service
              </Text>
              .
            </Text>
          </View>

          {/* Bottom Switch */}
          <View className="flex-row justify-center items-center mt-auto pb-4">
            <Text className="text-slate-500 dark:text-zinc-400 text-[15px] font-medium">
              {isLogin ? "Don't have an account? " : "Have an account? "}
            </Text>
            <TouchableOpacity
              onPress={() => setIsLogin(!isLogin)}
              className="px-1"
            >
              <Text className="text-indigo-600 dark:text-indigo-400 font-bold text-[15px] underline">
                {isLogin ? "Sign up here" : "Log in here"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

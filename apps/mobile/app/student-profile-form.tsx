import { useAuth } from "@/contexts/auth.cntxt";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

export default function StudentProfileForm() {
  const router = useRouter();
  const { loggedInUser, setLoggedInUser } = useAuth();

  const [name, setName] = useState(loggedInUser?.name || "");
  const [email, setEmail] = useState(loggedInUser?.email || "");
  const [enrollmentId, setEnrollmentId] = useState("");
  const [admissionId, setAdmissiontId] = useState("");
  const [yearOfAdmission, setYearOfAdmission] = useState("2025");

  const [department, setDepartment] = useState("");
  const [course, setCourse] = useState("");
  const [semister, setSemister] = useState("");
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [showSemDropdown, setShowSemDropdown] = useState(false);

  const departments = [
    "Computer Science",
    "Information Technology",
    "Electronics",
    "Mechanical",
    "Civil",
    "Electrical",
    "Business Administration",
  ];

  const courses = [
    "BSc Computer Science",
    "BTech Computer Science",
    "BCA",
    "MCA",
    "BBA",
    "MBA",
  ];

  const sem = [
    "Semister 1",
    "Semister 2",
    "Semister 3",
    "Semister 4",
    "Semister 5",
    "Semister 6",
    "Semister 7",
    "Semister 8",
    "Semister 9",
    "Semister 10",
  ];

  console.log("Logged in user in form:", loggedInUser);
  const [loading, setLoading] = useState(false);

  // Mock function to simulate profile update
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Required Field", "Please enter your full name");
      return;
    }

    setLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Update local state (in a real app, this would call an API and refresh context)
      if (loggedInUser) {
        setLoggedInUser({
          ...loggedInUser,
          name: name,
        });
      }

      Alert.alert("Success", "Profile updated successfully");
      router.replace("/profile");
    } catch (error) {
      console.error("Profile update failed:", error);
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header */}
        <View className="px-6 py-4 flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="h-10 w-10 bg-white border border-gray-100 rounded-full items-center justify-center shadow-sm active:bg-gray-50"
          >
            <Ionicons name="arrow-back" size={20} color="#1F2937" />
          </TouchableOpacity>
          <Text
            numberOfLines={1}
            className="text-base font-bold text-gray-900 text-center flex-shrink w-full max-w-[220px]"
          >
            Edit Profile
          </Text>
          <View className="w-10" />
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          <View className="px-6 pt-4">
            {/* Avatar Section */}
            <View className="items-center mb-10">
              <View className="relative shadow-xl shadow-blue-100">
                <View className="h-36 w-36 rounded-full bg-white border-4 border-white overflow-hidden items-center justify-center">
                  <Image
                    source={{
                      uri:
                        loggedInUser?.image ||
                        "https://i.pravatar.cc/150?img=68",
                    }}
                    className="h-full w-full rounded-full"
                  />
                </View>
                <TouchableOpacity className="absolute bottom-1 right-1 bg-dark h-10 w-10 rounded-full items-center justify-center border-2 border-white shadow-md active:scale-95 transition-transform">
                  <Ionicons name="camera" size={18} color="white" />
                </TouchableOpacity>
              </View>
              <Text
                numberOfLines={1}
                className="text-gray-400 text-xs font-medium mt-4 uppercase tracking-wider text-center w-full"
              >
                Tap to change photo
              </Text>
            </View>

            {/* Form Fields */}
            <View className="gap-6">
              {/* Name Input */}
              <View>
                <Text
                  numberOfLines={1}
                  className="text-xs font-bold text-gray-500 mb-2 ml-1 uppercase tracking-wide w-full"
                >
                  Full Name*
                </Text>
                <View className="flex-row items-center border border-gray-200 rounded-2xl px-4 py-3.5 focus:border-primary bg-white focus:shadow-sm transition-all">
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color="#9CA3AF"
                    style={{ marginRight: 12 }}
                  />
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your full name"
                    placeholderTextColor="#9CA3AF"
                    selectionColor="#2563EB"
                    cursorColor="#2563EB"
                    scrollEnabled={true}
                    multiline={false}
                    numberOfLines={1}
                    className="flex-1 text-base text-gray-900 font-semibold py-0 min-h-[20px]"
                    style={{ includeFontPadding: false }}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Student Admission No Input */}
              <View>
                <Text
                  numberOfLines={1}
                  className="text-xs font-bold text-gray-500 mb-2 ml-1 uppercase tracking-wide w-full"
                >
                  Admission Number*
                </Text>
                <View className="flex-row items-center border border-gray-200 rounded-2xl px-4 py-3.5 focus:border-primary bg-white focus:shadow-sm transition-all">
                  <Ionicons
                    name="book-outline"
                    size={20}
                    color="#9CA3AF"
                    style={{ marginRight: 12 }}
                  />
                  <TextInput
                    value={admissionId}
                    onChangeText={setAdmissiontId}
                    placeholder="Enter your Admission ID"
                    placeholderTextColor="#9CA3AF"
                    selectionColor="#2563EB"
                    cursorColor="#2563EB"
                    scrollEnabled={true}
                    multiline={false}
                    numberOfLines={1}
                    className="flex-1 text-base text-gray-900 font-semibold py-0 min-h-[20px]"
                    style={{ includeFontPadding: false }}
                  />
                </View>
              </View>

              {/* Student Enrollement ID */}
              <View>
                <Text
                  numberOfLines={1}
                  className="text-xs font-bold text-gray-500 mb-2 ml-1 uppercase tracking-wide w-full"
                >
                  Enrollment ID
                </Text>
                <View className="flex-row items-center border border-gray-200 rounded-2xl px-4 py-3.5 focus:border-primary bg-white focus:shadow-sm transition-all">
                  <Ionicons
                    name="book-outline"
                    size={20}
                    color="#9CA3AF"
                    style={{ marginRight: 12 }}
                  />
                  <TextInput
                    value={enrollmentId}
                    onChangeText={setEnrollmentId}
                    placeholder="Enter your Enrollment ID"
                    placeholderTextColor="#9CA3AF"
                    selectionColor="#2563EB"
                    cursorColor="#2563EB"
                    scrollEnabled={true}
                    multiline={false}
                    numberOfLines={1}
                    className="flex-1 text-base text-gray-900 font-semibold py-0 min-h-[20px]"
                    style={{ includeFontPadding: false }}
                  />
                </View>
              </View>

              {/* Email Input */}
              <View>
                <Text
                  numberOfLines={1}
                  className="text-xs font-bold text-gray-500 mb-2 ml-1 uppercase tracking-wide w-full"
                >
                  Student Email*
                </Text>
                <View className="flex-row items-center bg-white border border-gray-200 rounded-2xl px-4 py-3.5 opacity-80">
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color="#9CA3AF"
                    style={{ marginRight: 12 }}
                  />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    scrollEnabled={true}
                    multiline={false}
                    numberOfLines={1}
                    className="flex-1 text-base text-gray-800 font-semibold py-0 min-h-[20px]"
                    style={{ includeFontPadding: false }}
                  />
                </View>
              </View>

              {/* Department Input */}
              <View>
                <Text
                  numberOfLines={1}
                  className="text-xs font-bold text-gray-500 mb-2 ml-1 uppercase tracking-wide w-full"
                >
                  Student Department*
                </Text>

                <TouchableOpacity
                  onPress={() =>
                    setShowDepartmentDropdown(!showDepartmentDropdown)
                  }
                  className="flex-row items-center border border-gray-200 rounded-2xl px-4 py-3.5 bg-white"
                >
                  <Ionicons
                    name="business-outline"
                    size={20}
                    color="#9CA3AF"
                    style={{ marginRight: 12 }}
                  />

                  <Text
                    className={`flex-1 text-base font-semibold ${department ? "text-gray-900" : "text-gray-400"}`}
                  >
                    {department || "Select your Department"}
                  </Text>

                  <Ionicons
                    name={
                      showDepartmentDropdown ? "chevron-up" : "chevron-down"
                    }
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>

                {showDepartmentDropdown && (
                  <View className="mt-2 border border-gray-200 rounded-xl bg-white overflow-hidden">
                    {departments.map((dept) => (
                      <TouchableOpacity
                        key={dept}
                        onPress={() => {
                          setDepartment(dept);
                          setShowDepartmentDropdown(false);
                        }}
                        className="px-4 py-3 border-b border-gray-100"
                      >
                        <Text className="text-gray-900 font-medium">
                          {dept}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Course Input */}
              <View>
                <Text
                  numberOfLines={1}
                  className="text-xs font-bold text-gray-500 mb-2 ml-1 uppercase tracking-wide w-full"
                >
                  Student Course*
                </Text>

                <TouchableOpacity
                  onPress={() => setShowCourseDropdown(!showCourseDropdown)}
                  className="flex-row items-center border border-gray-200 rounded-2xl px-4 py-3.5 bg-white"
                >
                  <Ionicons
                    name="school-outline"
                    size={20}
                    color="#9CA3AF"
                    style={{ marginRight: 12 }}
                  />

                  <Text
                    className={`flex-1 text-base font-semibold ${course ? "text-gray-900" : "text-gray-400"}`}
                  >
                    {course || "Select your Course"}
                  </Text>

                  <Ionicons
                    name={showCourseDropdown ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>

                {showCourseDropdown && (
                  <View className="mt-2 border border-gray-200 rounded-xl bg-white overflow-hidden">
                    {courses.map((c) => (
                      <TouchableOpacity
                        key={c}
                        onPress={() => {
                          setCourse(c);
                          setShowCourseDropdown(false);
                        }}
                        className="px-4 py-3 border-b border-gray-100"
                      >
                        <Text className="text-gray-900 font-medium">{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Semister Dropdown */}
              <View>
                <Text
                  numberOfLines={1}
                  className="text-xs font-bold text-gray-500 mb-2 ml-1 uppercase tracking-wide w-full"
                >
                  Current Semister*
                </Text>

                <TouchableOpacity
                  onPress={() => setShowSemDropdown(!showSemDropdown)}
                  className="flex-row items-center border border-gray-200 rounded-2xl px-4 py-3.5 bg-white"
                >
                  <Ionicons
                    name="school-outline"
                    size={20}
                    color="#9CA3AF"
                    style={{ marginRight: 12 }}
                  />

                  <Text
                    className={`flex-1 text-base font-semibold ${semister ? "text-gray-900" : "text-gray-400"}`}
                  >
                    {semister || "Select your Semister"}
                  </Text>

                  <Ionicons
                    name={showSemDropdown ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>

                {showSemDropdown && (
                  <View className="mt-2 border border-gray-200 rounded-xl bg-white overflow-hidden">
                    {sem.map((c) => (
                      <TouchableOpacity
                        key={c}
                        onPress={() => {
                          setSemister(c);
                          setShowSemDropdown(false);
                        }}
                        className="px-4 py-3 border-b border-gray-100"
                      >
                        <Text className="text-gray-900 font-medium">{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Student Admission No Input */}
              <View>
                <Text
                  numberOfLines={1}
                  className="text-xs font-bold text-gray-500 mb-2 ml-1 uppercase tracking-wide w-full"
                >
                  Year of Admission*
                </Text>
                <View className="flex-row items-center border border-gray-200 rounded-2xl px-4 py-3.5 focus:border-primary bg-white focus:shadow-sm transition-all">
                  <Ionicons
                    name="book-outline"
                    size={20}
                    color="#9CA3AF"
                    style={{ marginRight: 12 }}
                  />
                  <TextInput
                    value={yearOfAdmission}
                    onChangeText={setYearOfAdmission}
                    placeholder="Enter your Student ID"
                    placeholderTextColor="#9CA3AF"
                    selectionColor="#2563EB"
                    cursorColor="#2563EB"
                    scrollEnabled={true}
                    multiline={false}
                    numberOfLines={1}
                    className="flex-1 text-base text-gray-900 font-semibold py-0 min-h-[20px]"
                    style={{ includeFontPadding: false }}
                    keyboardType="numeric"
                  />
                </View>
              </View>

            <View className="my-4 px-2 bg-blue-700 rounded-2xl p-2 text-center">
              <Text className="text-sm text-white text-center">
                Please ensure all your profile details are correct before saving. Fields marked with * are required.
              </Text>
            </View>
            </View>
          </View>
        </ScrollView>

        {/* Floating Action Button */}
        <View className="absolute bottom-8 left-6 right-6">
          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            className={`w-full py-3.5 rounded-2xl flex-row items-center justify-center ${
              loading ? "bg-primary/80" : "bg-primary active:bg-primary-dark"
            } shadow-lg shadow-blue-200`}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text
                numberOfLines={1}
                className="text-white font-bold text-base text-center flex-shrink"
              >
                Save Profile
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

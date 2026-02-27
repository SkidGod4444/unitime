import { useStore } from "@/contexts/store.cntxt";
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PendingEnrollment, useEnrollmentStore } from "../lib/store/enrollment";

const SEMESTER_MAP: Record<string, string> = {
  FIRST_SEMESTER: "Sem I",
  SECOND_SEMESTER: "Sem II",
  THIRD_SEMESTER: "Sem III",
  FOURTH_SEMESTER: "Sem IV",
  FIFTH_SEMESTER: "Sem V",
  SIXTH_SEMESTER: "Sem VI",
  SEVENTH_SEMESTER: "Sem VII",
  EIGHTH_SEMESTER: "Sem VIII",
  NINTH_SEMESTER: "Sem IX",
  TENTH_SEMESTER: "Sem X",
};

export default function ManageRequestsScreen() {
  const { enrollments, loading, updateEnrollmentStatus } = useEnrollmentStore();
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const { refresh } = useStore();

  const loadData = useCallback(async () => {
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAction = async (id: string, status: "APPROVED" | "REJECTED") => {
    try {
      setActionLoadingId(id);
      await updateEnrollmentStatus(id, status);
      Alert.alert(
        "Success", 
        `Enrollment ${status === "APPROVED" ? "approved" : "rejected"}.`
      );
    } catch {
      Alert.alert("Error", "Could not complete the action. Please try again.");
      loadData(); // Re-fetch on error to reset UI
    } finally {
      setActionLoadingId(null);
    }
  };

  const renderItem = ({ item }: { item: PendingEnrollment }) => {
    const courseOrg = item.course.organization;
    const semesterDisplay = courseOrg && (courseOrg as any).semester ? SEMESTER_MAP[(courseOrg as any).semester] || (courseOrg as any).semester : null;
    
    return (
      <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-4">
        {/* Student Header */}
        <View className="flex-row justify-between items-start mb-4">
          <View className="flex-row items-center flex-1">
            <View className="w-10 h-10 bg-indigo-100 rounded-full items-center justify-center mr-3">
              <Text className="text-indigo-700 font-bold text-lg">
                {item.user.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1 pr-2">
              <Text className="text-base font-bold text-gray-900 mb-0.5" numberOfLines={1}>
                {item.user.name}
              </Text>
              <Text className="text-sm font-medium text-gray-500">
                {item.user.studentProfile?.admissionNumber || item.user.email}
              </Text>
            </View>
          </View>
          <View className="bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
            <Text className="text-[10px] font-bold text-amber-700 uppercase">Pending</Text>
          </View>
        </View>

        {/* Course Info Card embedded */}
        <View className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-5">
          <View className="mb-2">
            <Text className="text-sm font-bold text-gray-900 mb-0.5">
              {item.course.name}
            </Text>
            <Text className="text-xs font-semibold text-indigo-600">
              {item.course.code}
            </Text>
          </View>
          
          {courseOrg && (
            <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1 mt-1">
              <View className="flex-row items-center">
                <Ionicons name="business-outline" size={12} color="#6b7280" />
                <Text className="text-xs text-gray-600 ml-1">
                  {courseOrg.departmentName}
                </Text>
              </View>
              <View className="w-1 h-1 rounded-full bg-gray-300" />
              <Text className="text-xs text-gray-600">
                Sec {courseOrg.section}
              </Text>
              {semesterDisplay && (
                <>
                  <View className="w-1 h-1 rounded-full bg-gray-300" />
                  <Text className="text-xs text-gray-600">{semesterDisplay}</Text>
                </>
              )}
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => handleAction(item.id, "REJECTED")}
            disabled={actionLoadingId === item.id}
            className="flex-1 py-3.5 rounded-xl border border-red-200 bg-red-50 flex-row justify-center items-center gap-2"
          >
            <Ionicons name="close-circle" size={18} color="#ef4444" />
            <Text className="text-red-700 font-bold">Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleAction(item.id, "APPROVED")}
            disabled={actionLoadingId === item.id}
            className="flex-1 py-3.5 rounded-xl border border-transparent bg-indigo-600 flex-row justify-center items-center gap-2"
          >
            {actionLoadingId === item.id ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text className="text-white font-bold">Approve</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Stack.Screen
        options={{
          headerTitle: "Enrollment Requests",
          headerTitleStyle: { fontFamily: "Lora-Bold", fontSize: 20 },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "#f9fafb" },
          headerShown: true,
        }}
      />
      
      {loading && !refreshing ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : (
        <FlatList
          data={enrollments}
          keyExtractor={(item) => item.id}
          className="flex-1 px-4 pt-4"
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={() => {
                setRefreshing(true);
                loadData();
              }} 
            />
          }
          ListEmptyComponent={
            <View className="items-center py-20 px-4">
              <View className="h-20 w-20 bg-gray-100 rounded-full justify-center items-center mb-4">
                <Ionicons name="documents-outline" size={40} color="#9ca3af" />
              </View>
              <Text className="text-lg font-bold text-gray-800 text-center mb-2">
                No Pending Requests
              </Text>
              <Text className="text-gray-500 text-center text-sm px-6">
                There are no students awaiting approval for your assigned courses at this time.
              </Text>
            </View>
          }
          renderItem={renderItem}
        />
      )}
    </SafeAreaView>
  );
}

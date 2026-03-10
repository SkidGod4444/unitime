import { useStore } from "@/contexts/store.cntxt";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiFetch } from "../lib/api";
import { useProfilesStore } from "../lib/store";
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
  const router = useRouter();
  const {
    enrollments,
    loading,
    updateEnrollmentStatus,
    approveAllEnrollments,
  } = useEnrollmentStore();
  const { profiles, fetchProfiles } = useProfilesStore();
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const { refresh } = useStore();

  const loadData = useCallback(async () => {
    if (profiles.length === 0) {
      await fetchProfiles();
    }
    await refresh();
    setRefreshing(false);
  }, [refresh, profiles.length, fetchProfiles]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAction = async (id: string, status: "APPROVED" | "REJECTED") => {
    try {
      setActionLoadingId(id);
      await updateEnrollmentStatus(id, status);

      const targetEnrollment = enrollments.find((e) => e.id === id);

      if (status === "APPROVED" && targetEnrollment) {
        // Send a notification to the user that their enrollment was approved
        const userProfile = profiles.find(
          (p) => p.userId === targetEnrollment.user.id,
        );
        const orgId = userProfile?.organizationId || null;

        await apiFetch("/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: targetEnrollment.user.id,
            organizationId: orgId,
            title: "Enrollment Approved",
            body: `Your request to join ${targetEnrollment.course.name} (${targetEnrollment.course.code}) has been approved!`,
            type: "SYSTEM",
          }),
        }).catch(console.error);
      }

      Alert.alert(
        "Success",
        `Enrollment ${status === "APPROVED" ? "approved" : "rejected"}.`,
      );
    } catch {
      Alert.alert("Error", "Could not complete the action. Please try again.");
      loadData(); // Re-fetch on error to reset UI
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleApproveAll = async () => {
    if (enrollments.length === 0) return;

    Alert.alert(
      "Approve All",
      `Are you sure you want to approve all ${enrollments.length} pending requests?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve All",
          style: "default",
          onPress: async () => {
            try {
              setActionLoadingId("bulk");
              await approveAllEnrollments();
              Alert.alert("Success", "All enrollments have been approved.");
            } catch (error: any) {
              Alert.alert(
                "Error",
                error.message || "Failed to approve all enrollments.",
              );
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: PendingEnrollment }) => {
    const courseOrg = item.course.organization;
    const semesterDisplay =
      courseOrg && (courseOrg as any).semester
        ? SEMESTER_MAP[(courseOrg as any).semester] ||
          (courseOrg as any).semester
        : null;

    return (
      <View className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm mb-5">
        {/* Student Header */}
        <TouchableOpacity
          className="flex-row justify-between items-start mb-5"
          onPress={() => setSelectedUser(item.user)}
          activeOpacity={0.7}
        >
          <View className="flex-row items-center flex-1">
            <View className="w-12 h-12 bg-indigo-50 rounded-2xl items-center justify-center mr-3 shadow-sm border border-indigo-50">
              <Text className="text-indigo-700 font-bold text-xl">
                {item.user.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1 pr-2">
              <Text
                className="text-lg font-bold text-gray-900 dark:text-zinc-100 mb-0.5"
                numberOfLines={1}
              >
                {item.user.name}
              </Text>
              <Text className="text-sm font-semibold text-gray-500 dark:text-zinc-400">
                {item.user.studentProfile?.admissionNumber || item.user.email}
              </Text>
            </View>
          </View>
          <View className="bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 mt-1">
            <Text className="text-[10px] font-bold text-amber-700 uppercase">
              Pending
            </Text>
          </View>
        </TouchableOpacity>

        {/* Detailed Grid Info */}
        <View className="bg-gray-50 dark:bg-zinc-800 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800 mb-5 flex-row flex-wrap justify-between items-start gap-y-4">
          <View className="flex-row items-start w-[48%]">
            <View className="w-7 h-7 rounded-full bg-white dark:bg-zinc-900 items-center justify-center mr-2 shadow-sm border border-gray-100 dark:border-zinc-800 mt-0.5">
              <Ionicons name="book" size={12} color="#4b5563" />
            </View>
            <View className="flex-1">
              <Text
                className="text-xs text-gray-700 dark:text-zinc-200 font-bold"
                numberOfLines={1}
              >
                {item.course.name}
              </Text>
              <Text
                className="text-[10px] font-semibold text-indigo-600 mt-0.5"
                numberOfLines={1}
              >
                {item.course.code}
              </Text>
            </View>
          </View>

          <View className="flex-row items-start w-[48%] pl-2">
            <View className="w-7 h-7 rounded-full bg-white dark:bg-zinc-900 items-center justify-center mr-2 shadow-sm border border-gray-100 dark:border-zinc-800 mt-0.5">
              <Ionicons name="business" size={12} color="#4b5563" />
            </View>
            <Text
              className="text-xs text-gray-700 dark:text-zinc-200 font-bold flex-1 mt-1"
              numberOfLines={2}
            >
              {courseOrg ? courseOrg.departmentName : "No Dept"}
            </Text>
          </View>

          <View className="flex-row items-center w-[48%]">
            <View className="w-7 h-7 rounded-full bg-white dark:bg-zinc-900 items-center justify-center mr-2 shadow-sm border border-gray-100 dark:border-zinc-800">
              <Ionicons name="calendar" size={12} color="#4b5563" />
            </View>
            <Text
              className="text-xs text-gray-700 font-bold flex-1"
              numberOfLines={1}
            >
              {semesterDisplay || "N/A"}
            </Text>
          </View>

          <View className="flex-row items-center w-[48%] pl-2">
            <View className="w-7 h-7 rounded-full bg-white items-center justify-center mr-2 shadow-sm border border-gray-100">
              <Ionicons name="grid" size={12} color="#4b5563" />
            </View>
            <Text
              className="text-xs text-gray-700 dark:text-zinc-200 font-bold flex-1"
              numberOfLines={1}
            >
              {courseOrg ? `Sec ${courseOrg.section}` : "N/A"}
            </Text>
          </View>
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
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-zinc-900">
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-row items-center px-6 pt-2 pb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full active:opacity-70 mr-4"
        >
          <Ionicons name="arrow-back-outline" size={24} color="#374151" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-sm font-medium text-gray-500 uppercase tracking-wider">
            User Approvals
          </Text>
          <Text className="text-3xl font-bold text-gray-900 dark:text-white">
            Enrollments
          </Text>
        </View>
        {enrollments.length > 0 && (
          <TouchableOpacity
            onPress={handleApproveAll}
            disabled={actionLoadingId === "bulk"}
            className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex-row items-center gap-1.5 border border-indigo-200 dark:border-indigo-800"
          >
            {actionLoadingId === "bulk" ? (
              <ActivityIndicator size="small" color="#4f46e5" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={16} color="#4f46e5" />
                <Text className="text-indigo-700 dark:text-indigo-300 font-bold text-sm">
                  Approve All
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

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
                There are no students awaiting approval for your assigned
                courses at this time.
              </Text>
            </View>
          }
          renderItem={renderItem}
        />
      )}

      {/* User Info Modal */}
      <Modal
        visible={!!selectedUser}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedUser(null)}
      >
        <SafeAreaView className="flex-1 bg-gray-50 dark:bg-zinc-900">
          <View className="flex-row items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
            <Text className="text-xl font-bold text-gray-900">
              Student Details
            </Text>
            <TouchableOpacity
              onPress={() => setSelectedUser(null)}
              className="p-1 bg-gray-100 rounded-full"
            >
              <Ionicons name="close" size={24} color="#4b5563" />
            </TouchableOpacity>
          </View>
          <ScrollView
            className="flex-1 p-6"
            contentContainerStyle={{ alignItems: "center" }}
          >
            {selectedUser &&
              (() => {
                const matchedProfile =
                  profiles.find((p) => p.userId === selectedUser.id) ||
                  selectedUser.studentProfile;
                return (
                  <>
                    <View className="w-24 h-24 bg-indigo-100 rounded-full items-center justify-center mb-4 shadow-sm">
                      <Text className="text-indigo-700 font-bold text-4xl">
                        {selectedUser.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text className="text-2xl font-bold text-gray-900 text-center">
                      {selectedUser.name}
                    </Text>
                    <Text className="text-base text-gray-500 mb-6">
                      {selectedUser.email}
                    </Text>

                    <View className="w-full bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mt-2">
                      <Text className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-wider">
                        Profile Information
                      </Text>

                      <View className="flex-row items-center mb-3">
                        <View className="w-10 h-10 rounded-xl bg-gray-50 items-center justify-center mr-3 border border-gray-100">
                          <Ionicons
                            name="card-outline"
                            size={18}
                            color="#6b7280"
                          />
                        </View>
                        <View>
                          <Text className="text-xs text-gray-500 font-medium">
                            Admission No.
                          </Text>
                          <Text className="text-sm text-gray-900 font-bold">
                            {matchedProfile?.admissionNumber || "N/A"}
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row items-center">
                        <View className="w-10 h-10 rounded-xl bg-gray-50 items-center justify-center mr-3 border border-gray-100">
                          <Ionicons
                            name="school-outline"
                            size={18}
                            color="#6b7280"
                          />
                        </View>
                        <View>
                          <Text className="text-xs text-gray-500 font-medium">
                            Semester
                          </Text>
                          <Text className="text-sm text-gray-900 font-bold">
                            {matchedProfile?.currentSemester
                              ? SEMESTER_MAP[matchedProfile.currentSemester] ||
                                matchedProfile.currentSemester
                              : "N/A"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </>
                );
              })()}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

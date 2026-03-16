import { useAuth } from "@/contexts/auth.cntxt";
import { useStore } from "@/contexts/store.cntxt";
import { apiFetch } from "@/lib/api";
import {
  useAttendanceStore,
  useCoursesStore,
  useOrgsStore,
  useProfilesStore,
} from "@/lib/store";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
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
import { Course } from "../lib/store/timetable";

const CLASS_TYPE_COLORS: Record<string, string> = {
  LECTURE: "bg-blue-100 text-blue-800",
  LAB: "bg-purple-100 text-purple-800",
  TUTORIAL: "bg-emerald-100 text-emerald-800",
};

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

export default function MyCoursesScreen() {
  const router = useRouter();
  const { loggedInUser } = useAuth();
  const { refresh } = useStore();
  const { orgs } = useOrgsStore();
  const { profiles } = useProfilesStore();
  const { courses, loading, fetchCourses } = useCoursesStore();
  const { summary } = useAttendanceStore();
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(
    new Set(),
  );

  const userProfile = profiles.find((p) => p.userId === loggedInUser?.id);
  const organizationId = userProfile?.organizationId;

  const userEnrollments = React.useMemo(() => {
    return courses.flatMap((c) => {
      const enrollment = (c as any).users?.find(
        (u: any) => u.userId === loggedInUser?.id,
      );
      return enrollment ? [{ ...enrollment, courseId: c.id }] : [];
    });
  }, [courses, loggedInUser?.id]);

  const hasAnyEnrollment = userEnrollments.some(
    (e) => e.status === "APPROVED" || e.status === "PENDING",
  );
  const isExploring = !hasAnyEnrollment;

  const filteredCourses = React.useMemo(() => {
    if (!organizationId) return courses;
    const orgCourses = courses.filter(
      (c) => c.organizationId === organizationId,
    );

    if (isExploring) {
      return orgCourses;
    } else {
      // Only show courses the user has interacted with (Enrolled/Pending/Rejected)
      return orgCourses.filter((c) =>
        (c as any).users?.some((u: any) => u.userId === loggedInUser?.id),
      );
    }
  }, [courses, organizationId, isExploring, loggedInUser?.id]);

  const handleBatchEnroll = async () => {
    if (selectedCourseIds.size === 0) return;

    try {
      setActionLoadingId("batch");
      const res = await apiFetch("/courses/enroll-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: loggedInUser?.id,
          courseIds: Array.from(selectedCourseIds),
          organizationId: organizationId,
        }),
      });
      if (!res.ok) throw new Error("Batch enrollment failed");

      // Notify admins and representatives of the organization
      if (organizationId) {
        try {
          const membersRes = await apiFetch(`/orgs/${organizationId}/members`);
          if (membersRes.ok) {
            const { members } = await membersRes.json();
            const admins = members.filter(
              (m: any) => m.role === "ADMIN" || m.role === "REPRESENTATIVE",
            );

            await Promise.all(
              admins.map((admin: any) =>
                apiFetch("/notifications", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    title: "New Enrollment Request",
                    body: `${loggedInUser?.name || "A student"} sent course enrollment request`,
                    type: "SYSTEM",
                    userId: admin.id,
                    organizationId: organizationId,
                    actionUrl: "/manage-requests",
                  }),
                }),
              ),
            );
          }
        } catch (err) {
          console.warn("Failed to notify admins of enrollment request", err);
        }
      }

      Alert.alert(
        "Success",
        "Enrollment requests sent for all selected courses.",
      );
      setSelectedCourseIds(new Set());
      await fetchCourses();
    } catch {
      Alert.alert("Error", "Could not complete enrollment. Please try again.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const toggleSelection = (courseId: string) => {
    const newSelection = new Set(selectedCourseIds);
    if (newSelection.has(courseId)) {
      newSelection.delete(courseId);
    } else {
      newSelection.add(courseId);
    }
    setSelectedCourseIds(newSelection);
  };

  const handleDeEnroll = async (courseId: string, status?: string) => {
    const isPending = status === "PENDING";
    Alert.alert(
      isPending ? "Cancel Request" : "Remove Course",
      isPending
        ? "Are you sure you want to cancel your enrollment request for this course?"
        : "Are you sure you want to de-enroll from this course?",
      [
        { text: "No", style: "cancel" },
        {
          text: isPending ? "Yes, Cancel" : "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoadingId(courseId);
              const res = await apiFetch(`/courses/${courseId}/enroll`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: loggedInUser?.id }),
              });

              if (!res.ok)
                throw new Error(
                  isPending
                    ? "Failed to cancel request"
                    : "Failed to de-enroll",
                );

              Alert.alert(
                "Success",
                isPending
                  ? "Your enrollment request has been cancelled."
                  : "You have been removed from the course.",
              );
              fetchCourses();
            } catch {
              Alert.alert(
                "Error",
                isPending
                  ? "Could not cancel request. Please try again."
                  : "Could not de-enroll. Please try again.",
              );
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: Course }) => {
    const userEnrollment = (item as any).users?.find(
      (u: any) => u.userId === loggedInUser?.id,
    );
    const org = item.organizationId
      ? orgs.find((o: any) => o.id === item.organizationId)
      : null;

    const isSelected = selectedCourseIds.has(item.id);

    const rawSemester = org?.semester || (item as any).semester;
    const semesterDisplay = rawSemester
      ? SEMESTER_MAP[rawSemester] || rawSemester
      : null;
    const typeLabel = item.classType || "LECTURE";
    const typeColor =
      CLASS_TYPE_COLORS[typeLabel] || "bg-gray-100 text-gray-800";

    return (
      <TouchableOpacity
        activeOpacity={isExploring && !userEnrollment ? 0.7 : 1}
        onPress={() =>
          isExploring && !userEnrollment && toggleSelection(item.id)
        }
        className={`p-5 rounded-3xl border shadow-sm mb-5 ${
          isSelected
            ? "bg-indigo-50/50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800"
            : "bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800"
        }`}
      >
        {/* Course Header */}
        <View className="flex-row items-start justify-between mb-5">
          <View className="flex-row flex-1 mr-3">
            <View
              className={`h-12 w-12 ${isSelected ? "bg-indigo-100" : "bg-indigo-50"} rounded-2xl justify-center items-center mr-3 mt-1`}
            >
              <Ionicons name="book" size={22} color="#4f46e5" />
            </View>
            <View className="flex-1 pr-1">
              <Text
                className="text-lg font-bold text-gray-900 dark:text-zinc-100 mb-1 leading-6"
                numberOfLines={2}
              >
                {item.name}
              </Text>
              <View className="flex-row flex-wrap items-center gap-2">
                <Text className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  {item.code}
                </Text>
                <View className="w-1 h-1 rounded-full bg-gray-300" />
                <View
                  className={`px-2 py-0.5 rounded-md ${typeColor.split(" ")[0]}`}
                >
                  <Text
                    className={`text-[10px] font-bold ${typeColor.split(" ")[1]}`}
                  >
                    {typeLabel}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {isExploring && !userEnrollment ? (
            <View
              className={`h-6 w-6 rounded-full border-2 items-center justify-center ${isSelected ? "bg-indigo-600 border-indigo-600" : "border-gray-300"}`}
            >
              {isSelected && (
                <Ionicons name="checkmark" size={14} color="white" />
              )}
            </View>
          ) : userEnrollment ? (
            <View
              className={`px-2.5 py-1 rounded-lg border ${userEnrollment.status === "APPROVED" ? "bg-green-50 border-green-200" : userEnrollment.status === "PENDING" ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}`}
            >
              <Text
                className={`text-[10px] font-bold uppercase ${userEnrollment.status === "APPROVED" ? "text-green-700" : userEnrollment.status === "PENDING" ? "text-amber-700" : "text-red-700"}`}
              >
                {userEnrollment.status === "APPROVED"
                  ? "Enrolled"
                  : userEnrollment.status}
              </Text>
            </View>
          ) : (
            <View className="bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-lg">
              <Text className="text-[10px] font-bold text-gray-400 uppercase">
                Closed
              </Text>
            </View>
          )}
        </View>

        {/* Detailed Grid Info */}
        <View className="bg-gray-50 dark:bg-zinc-800 p-4 rounded-2xl border border-gray-100 dark:border-zinc-700 mb-5 flex-row flex-wrap justify-between items-center gap-y-3">
          <View className="flex-row items-center w-[48%]">
            <View className="w-7 h-7 rounded-full bg-white items-center justify-center mr-2 shadow-sm border border-gray-100">
              <Ionicons name="business" size={12} color="#4b5563" />
            </View>
            <Text
              className="text-xs text-gray-700 dark:text-zinc-200 font-bold flex-1"
              numberOfLines={1}
            >
              {org ? org.departmentName : "No Dept"}
            </Text>
          </View>

          <View className="flex-row items-center w-[48%] pl-2">
            <View className="w-7 h-7 rounded-full bg-white items-center justify-center mr-2 shadow-sm border border-gray-100">
              <Ionicons name="calendar" size={12} color="#4b5563" />
            </View>
            <Text
              className="text-xs text-gray-700 dark:text-zinc-200 font-bold flex-1"
              numberOfLines={1}
            >
              {semesterDisplay || "N/A"}
            </Text>
          </View>

          <View className="flex-row items-center w-[48%]">
            <View className="w-7 h-7 rounded-full bg-white items-center justify-center mr-2 shadow-sm border border-gray-100">
              <Ionicons name="grid" size={12} color="#4b5563" />
            </View>
            <Text
              className="text-xs text-gray-700 dark:text-zinc-200 font-bold flex-1"
              numberOfLines={1}
            >
              {org ? `Sec ${org.section}` : "N/A"}
            </Text>
          </View>

          <View className="flex-row items-center w-[48%] pl-2">
            <View className="w-7 h-7 rounded-full bg-white items-center justify-center mr-2 shadow-sm border border-gray-100">
              <Ionicons name="star" size={12} color="#4b5563" />
            </View>
            <Text
              className="text-xs text-gray-700 dark:text-zinc-200 font-bold flex-1"
              numberOfLines={1}
            >
              {item.credit ? `${item.credit} Credits` : "No Credits"}
            </Text>
          </View>
        </View>

        {/* Actions / Attendance Bar */}
        <View className="flex-col gap-3">
          {userEnrollment &&
            (userEnrollment.status === "REJECTED" ? (
              <View className="w-full py-3.5 rounded-xl border border-red-200 bg-red-50 flex-row justify-center items-center gap-2">
                <Ionicons
                  name="close-circle-outline"
                  size={18}
                  color="#ef4444"
                />
                <Text className="text-red-700 font-bold">
                  Enrollment Rejected
                </Text>
              </View>
            ) : userEnrollment.status === "PENDING" ? (
              <TouchableOpacity
                onPress={() => handleDeEnroll(item.id, userEnrollment.status)}
                disabled={actionLoadingId === item.id}
                className="w-full py-3.5 rounded-xl border border-amber-200 bg-amber-50 flex-row justify-center items-center gap-2"
              >
                {actionLoadingId === item.id ? (
                  <ActivityIndicator color="#d97706" size="small" />
                ) : (
                  <>
                    <Ionicons
                      name="close-circle-outline"
                      size={18}
                      color="#d97706"
                    />
                    <Text className="text-amber-700 font-bold">
                      Cancel Request
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              /* Approved User - Show Attendance Bar */
              <View className="w-full pt-1">
                {(() => {
                  const summaryItem = summary.find(
                    (s) => s.courseId === item.id,
                  );
                  if (!summaryItem) return null;

                  return (
                    <View className="bg-gray-50 dark:bg-zinc-800 p-3 rounded-2xl border border-gray-100 dark:border-zinc-700">
                      <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                          Total Attendance
                        </Text>
                        <Text
                          className={`text-xs font-bold ${summaryItem.total === 0 ? "text-gray-400" : summaryItem.percentage >= 75 ? "text-green-600" : "text-red-500"}`}
                        >
                          {summaryItem.total === 0 ? 0 : summaryItem.percentage}
                          %
                        </Text>
                      </View>
                      <View className="h-1.5 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden mb-1.5">
                        <View
                          className={`h-full rounded-full ${summaryItem.total === 0 ? "bg-gray-400" : summaryItem.percentage >= 75 ? "bg-green-500" : "bg-red-500"}`}
                          style={{
                            width: `${summaryItem.total === 0 ? 0 : summaryItem.percentage}%`,
                          }}
                        />
                      </View>
                      <Text className="text-[10px] text-gray-400 dark:text-zinc-500 text-right">
                        {summaryItem.attended}/{summaryItem.total} Classes
                      </Text>
                    </View>
                  );
                })()}
              </View>
            ))}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-zinc-900">
      <SafeAreaView className="flex-1" edges={["top"]}>
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
              {isExploring ? "Explore & Enroll" : "My Schedule"}
            </Text>
            <Text className="text-3xl font-bold text-gray-900 dark:text-white">
              My Courses
            </Text>
          </View>
        </View>

        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#4f46e5" />
          </View>
        ) : (
          <FlatList
            data={filteredCourses}
            keyExtractor={(item) => item.id}
            className="flex-1 px-4 pt-4"
            contentContainerStyle={{ paddingBottom: 150 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={async () => {
                  setRefreshing(true);
                  await refresh();
                  setRefreshing(false);
                }}
              />
            }
            ListEmptyComponent={
              <View className="items-center py-20 px-4">
                <View className="h-20 w-20 bg-gray-100 dark:bg-zinc-800 rounded-full justify-center items-center mb-4">
                  <Ionicons name="book-outline" size={40} color="#9ca3af" />
                </View>
                <Text className="text-lg font-bold text-gray-800 dark:text-zinc-100 text-center mb-2">
                  No Courses Found
                </Text>
                <Text className="text-gray-500 dark:text-zinc-400 text-center text-sm px-6">
                  {isExploring
                    ? "There are no courses available for enrollment right now."
                    : "You are not enrolled in any courses yet."}
                </Text>
                {!isExploring && (
                  <TouchableOpacity
                    onPress={async () => {
                      // Temporary way to go back to explore if needed
                      // In real app, we'd have a toggle or better flow
                    }}
                    className="mt-6 px-6 py-3 bg-indigo-600 rounded-full"
                  >
                    <Text className="text-white font-bold">
                      Discover Courses
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            }
            renderItem={renderItem}
          />
        )}
      </SafeAreaView>

      {/* Floating Batch Action Bar */}
      {selectedCourseIds.size > 0 && (
        <View className="absolute bottom-10 left-5 right-5 bg-white dark:bg-zinc-800 p-4 rounded-3xl shadow-2xl border border-gray-100 dark:border-zinc-700 flex-row items-center justify-between">
          <View>
            <Text className="text-gray-900 dark:text-white font-bold text-base">
              {selectedCourseIds.size} Courses Selected
            </Text>
            <Text className="text-gray-500 dark:text-zinc-400 text-xs">
              Waiting for admin approval post-enrollment
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleBatchEnroll}
            disabled={actionLoadingId === "batch"}
            className="bg-indigo-600 px-6 py-3 rounded-2xl flex-row items-center gap-2"
          >
            {actionLoadingId === "batch" ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text className="text-white font-bold">Save & Enroll</Text>
                <Ionicons name="arrow-forward" size={18} color="white" />
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

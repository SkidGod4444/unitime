import { useAuth } from "@/contexts/auth.cntxt";
import { apiFetch } from "@/lib/api";
import { useCoursesStore } from "@/lib/store/courses";
import { useLabGroupsStore } from "@/lib/store/lab-groups";
import { useOrgsStore, useProfilesStore } from "@/lib/store";
import { TimetableEntry, useTimetableStore } from "@/lib/store/timetable";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { SafeAreaView } from "react-native-safe-area-context";

const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];
const SHORT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function ManageTimetableScreen() {
  const router = useRouter();
  const { loggedInUser, refreshJwt } = useAuth();
  const { createTimetableEntry, deleteTimetableEntry, updateTimetableEntry } =
    useTimetableStore();
  const { courses, fetchCourses } = useCoursesStore();
  const { byOrg, fetchOrgLabGroups, createLabGroup } = useLabGroupsStore();
  const { orgs } = useOrgsStore();
  const { profiles } = useProfilesStore();

  const myProfile = profiles.find((p) => p.userId === loggedInUser?.id);

  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [showOrgPicker, setShowOrgPicker] = useState(false);

  // Set initial selected organization when myProfile loads
  useEffect(() => {
    if (myProfile?.organizationId && !selectedOrgId) {
      setSelectedOrgId(myProfile.organizationId);
    }
  }, [myProfile?.organizationId, selectedOrgId]);

  const getOrgDisplayName = (orgId: string | null) => {
    const org = orgs.find((o) => o.id === orgId);
    if (!org) return "Select Organization";

    let sem = org.semester ? org.semester.replace("_SEMESTER", "") : "";
    const semMap: Record<string, string> = {
      FIRST: "1st",
      SECOND: "2nd",
      THIRD: "3rd",
      FOURTH: "4th",
      FIFTH: "5th",
      SIXTH: "6th",
      SEVENTH: "7th",
      EIGHTH: "8th",
      NINTH: "9th",
      TENTH: "10th",
    };
    sem = semMap[sem] || sem;

    return `${org.courseName} - Sem ${sem} - Sec ${org.section}`;
  };

  const [selectedDay, setSelectedDay] = useState(DAYS[0]);
  const [allEntries, setAllEntries] = useState<TimetableEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Edit State
  const [editEntryId, setEditEntryId] = useState<string | null>(null);

  // Create group state
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Add-slot modal
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [formCourseId, setFormCourseId] = useState("");
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null); // null = "All Students"
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [formDay, setFormDay] = useState<string>("MONDAY");
  const [formStartTime, setFormStartTime] = useState<string>("");
  const [formStartPeriod, setFormStartPeriod] = useState<"AM" | "PM">("AM");
  const [formEndTime, setFormEndTime] = useState<string>("");
  const [formEndPeriod, setFormEndPeriod] = useState<"AM" | "PM">("AM");
  const [formLocation, setFormLocation] = useState<string>("");

  const loadAll = async () => {
    try {
      setRefreshing(true);
      const res = await apiFetch("/timetable");
      const data = await res.json();
      if (data.success) {
        setAllEntries(data.timetables || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (
      loggedInUser?.role !== "ADMIN" &&
      loggedInUser?.role !== "REPRESENTATIVE"
    ) {
      router.back();
      return;
    }
    loadAll();
    fetchCourses();
  }, [loggedInUser]);

  useEffect(() => {
    if (formCourseId) {
      const course = courses.find((c) => c.id === formCourseId);
      if (course?.classType === "LAB" && course.organizationId) {
        fetchOrgLabGroups(course.organizationId);
      } else {
        setActiveGroupId(null);
      }
    }
  }, [formCourseId]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !formCourseId) return;
    const course = courses.find((c) => c.id === formCourseId);
    if (!course || !course.organizationId) return;

    setCreatingGroup(true);
    const created = await createLabGroup(
      course.organizationId,
      newGroupName.trim(),
    );
    setCreatingGroup(false);
    if (created) {
      setNewGroupName("");
      setShowCreateGroup(false);
      setActiveGroupId(created.id); // auto-select the new group
    } else {
      Alert.alert("Error", "Could not create lab group.");
    }
  };

  const handleAddSubmit = async () => {
    if (!formCourseId || !formDay || !formStartTime || !formEndTime) {
      Alert.alert("Missing Fields", "Please fill all required fields.");
      return;
    }

    const payload = {
      courseId: formCourseId,
      day: formDay,
      startTime: `${formStartTime} ${formStartPeriod}`,
      endTime: `${formEndTime} ${formEndPeriod}`,
      location: formLocation,
      labGroupId: activeGroupId ?? undefined,
    };

    const token = await refreshJwt();
    if (!token) return;

    if (editEntryId) {
      const success = await updateTimetableEntry(token, editEntryId, payload);
      if (success) {
        Alert.alert("Success", "Timetable entry updated.");
        closeModal();
        loadAll();
      } else {
        Alert.alert("Error", "Could not update entry.");
      }
    } else {
      const success = await createTimetableEntry(token, payload);
      if (success) {
        Alert.alert("Success", "Timetable entry created.");
        closeModal();
        loadAll();
      } else {
        Alert.alert("Error", "Could not create entry.");
      }
    }
  };

  const closeModal = () => {
    setAddModalOpen(false);
    setEditEntryId(null);
    setFormCourseId("");
    setFormStartTime("");
    setFormEndTime("");
    setFormLocation("");
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete Entry", "Are you sure you want to delete this slot?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const token = await refreshJwt();
          const success = await deleteTimetableEntry(token || "", id);
          if (success) {
            loadAll();
          } else {
            Alert.alert("Error", "Could not delete entry.");
          }
        },
      },
    ]);
  };

  const currentDayEntries = allEntries
    .filter((e) => e.day === selectedDay)
    .filter((e) => {
      // Filter by selected organization for Admin
      if (loggedInUser?.role === "ADMIN" && selectedOrgId) {
        const course = e.course || courses.find((c) => c.id === e.courseId);
        return course?.organizationId === selectedOrgId;
      }
      return true;
    })
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );

  const renderItem = ({
    item,
    drag,
    isActive,
  }: RenderItemParams<TimetableEntry>) => {
    const course = item.course || courses.find((c) => c.id === item.courseId);

    const timeStr = `${item.startTime} - ${item.endTime}`;

    return (
      <ScaleDecorator>
        <TouchableOpacity
          onLongPress={drag}
          disabled={isActive}
          className={`flex-row bg-white dark:bg-zinc-900 rounded-2xl p-4 mb-3 mx-6 border shadow-sm ${
            isActive
              ? "border-blue-500 scale-105 opacity-90 shadow-lg"
              : "border-gray-100 dark:border-zinc-800"
          }`}
        >
          <View className="mr-3 justify-center items-center">
            <Ionicons name="menu-outline" size={24} color="#9CA3AF" />
          </View>
          <View className="flex-1">
            <View className="flex-row justify-between items-start gap-2">
              <Text
                className="text-gray-900 dark:text-white font-bold text-base flex-1"
                numberOfLines={2}
              >
                {course?.name || "Unknown Course"}
              </Text>
              <Text className="text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md mt-0.5 shrink-0">
                {course?.code}
              </Text>
            </View>
            <View className="flex-row items-center flex-wrap gap-x-3 gap-y-1 mt-2 pr-2">
              <View className="flex-row items-center gap-1">
                <Ionicons name="time-outline" size={14} color="#6B7280" />
                <Text className="text-sm text-gray-500">{timeStr}</Text>
              </View>
              {item.location ? (
                <View className="flex-row items-center gap-1 flex-shrink">
                  <Ionicons name="location-outline" size={14} color="#6B7280" />
                  <Text
                    className="text-sm text-gray-500 flex-shrink"
                    numberOfLines={1}
                  >
                    {item.location}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
          <View className="flex-row items-center justify-center gap-4 ml-2">
            <TouchableOpacity
              onPress={() => {
                setEditEntryId(item.id);
                setFormCourseId(item.courseId);
                setFormDay(item.day);
                setFormLocation(item.location || "");
                const [sTime, sPeriod] = item.startTime.split(" ");
                const [eTime, ePeriod] = item.endTime.split(" ");
                setFormStartTime(sTime || item.startTime);
                setFormStartPeriod((sPeriod as "AM" | "PM") || "AM");
                setFormEndTime(eTime || item.endTime);
                setFormEndPeriod((ePeriod as "AM" | "PM") || "AM");
                setActiveGroupId((item as any).labGroupId || null);
                setAddModalOpen(true);
              }}
              className="justify-center"
            >
              <Ionicons name="pencil-outline" size={20} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDelete(item.id)}
              className="justify-center"
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <Ionicons
            name="chevron-back"
            size={24}
            color="#18181B"
            className="dark:color-white"
          />
        </TouchableOpacity>
        <Text className="text-xl font-bold font-lora text-zinc-900 dark:text-zinc-100">
          Manage Timetable
        </Text>
        <View className="w-8" />
      </View>

      {/* Admin Organization Dropdown */}
      {loggedInUser?.role === "ADMIN" && (
        <View className="px-6 mb-4">
          <TouchableOpacity
            onPress={() => setShowOrgPicker(true)}
            className="flex-row items-center justify-between bg-white dark:bg-zinc-900 px-4 py-3 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm"
          >
            <View className="flex-row items-center gap-3 flex-1">
              <View className="h-10 w-10 bg-blue-50 dark:bg-blue-900/20 rounded-full items-center justify-center">
                <Ionicons name="business-outline" size={20} color="#2563EB" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-500 dark:text-zinc-400 font-medium mb-0.5">
                  Mapping timetable for
                </Text>
                <Text
                  className="text-sm font-bold text-zinc-900 dark:text-zinc-100"
                  numberOfLines={1}
                >
                  {getOrgDisplayName(selectedOrgId)}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Days Tabs */}
      <View className="px-6 mb-4">
        <View className="flex-row justify-between bg-white dark:bg-zinc-900 p-1.5 rounded-full border border-gray-100 dark:border-zinc-800">
          {DAYS.map((day, idx) => {
            const isSelected = selectedDay === day;
            return (
              <Pressable
                key={day}
                onPress={() => setSelectedDay(day)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 9999,
                  backgroundColor: isSelected ? "#2563EB" : "transparent",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: isSelected ? "#ffffff" : "#6B7280",
                  }}
                >
                  {SHORT_DAYS[idx]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {refreshing ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <DraggableFlatList
          data={currentDayEntries}
          onDragEnd={({ data }) => {
            const others = allEntries.filter((e) => e.day !== selectedDay);
            setAllEntries([...others, ...data]);
          }}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Ionicons name="calendar-outline" size={64} color="#E5E7EB" />
              <Text className="text-gray-400 font-medium mt-4 text-center">
                No slots mapped on{" "}
                {selectedDay.charAt(0) + selectedDay.slice(1).toLowerCase()}.
              </Text>
            </View>
          }
        />
      )}

      {/* Floating Add Button */}
      <TouchableOpacity
        onPress={() => {
          setFormDay(selectedDay);
          closeModal(); // Reset form first before popping open to start fresh
          setAddModalOpen(true);
        }}
        className="absolute bottom-6 right-6 bg-blue-600 h-14 w-14 rounded-full justify-center items-center shadow-lg shadow-blue-500/30 active:scale-95"
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>

      {/* ── Org Picker Modal ── */}
      <Modal
        visible={showOrgPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowOrgPicker(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
          onPress={() => setShowOrgPicker(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View className="bg-white dark:bg-zinc-900 w-full rounded-t-[32px] p-6 pb-10 h-[90%] shadow-2xl">
              <View className="w-12 h-1.5 bg-gray-200 dark:bg-zinc-700 rounded-full mb-5 self-center" />
              <Text className="text-xl font-bold font-lora text-zinc-900 dark:text-white mb-4 text-center">
                Select Organization
              </Text>

              <ScrollView>
                {orgs.map((org) => {
                  const isSelected = selectedOrgId === org.id;
                  const orgName = getOrgDisplayName(org.id);
                  return (
                    <TouchableOpacity
                      key={org.id}
                      onPress={() => {
                        setSelectedOrgId(org.id);
                        setShowOrgPicker(false);
                        // Also clear formCourseId if we switch orgs, to avoid inconsistencies!
                        setFormCourseId("");
                      }}
                      className={`flex-row items-center gap-3 px-4 py-3.5 rounded-2xl border mb-2 ${isSelected ? "bg-blue-50 border-blue-500" : "bg-gray-50 dark:bg-zinc-800 border-gray-100 dark:border-zinc-700"}`}
                    >
                      <Ionicons
                        name="business-outline"
                        size={18}
                        color={isSelected ? "#2563EB" : "#6B7280"}
                      />
                      <Text
                        className={`font-semibold text-base flex-1 ${isSelected ? "text-blue-700" : "text-gray-700 dark:text-zinc-200"}`}
                        numberOfLines={2}
                      >
                        {orgName}
                      </Text>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color="#2563EB"
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Group Picker Modal ── */}
      <Modal
        visible={showGroupPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowGroupPicker(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
          onPress={() => setShowGroupPicker(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View className="bg-white dark:bg-zinc-900 rounded-t-3xl p-6 pb-10">
              <View className="w-12 h-1.5 bg-gray-200 dark:bg-zinc-700 rounded-full mb-5 self-center" />
              <Text className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
                Select Lab Group
              </Text>

              {/* "All Students" option */}
              <TouchableOpacity
                onPress={() => {
                  setActiveGroupId(null);
                  setShowGroupPicker(false);
                }}
                className={`flex-row items-center gap-3 px-4 py-3.5 rounded-2xl border mb-2 ${activeGroupId === null ? "bg-indigo-50 border-indigo-500" : "bg-gray-50 dark:bg-zinc-800 border-gray-100 dark:border-zinc-700"}`}
              >
                <Ionicons
                  name="people"
                  size={18}
                  color={activeGroupId === null ? "#4f46e5" : "#6B7280"}
                />
                <Text
                  className={`font-semibold text-base ${activeGroupId === null ? "text-indigo-700" : "text-gray-700 dark:text-zinc-200"}`}
                >
                  All Students
                </Text>
                {activeGroupId === null && (
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color="#4f46e5"
                    style={{ marginLeft: "auto" }}
                  />
                )}
              </TouchableOpacity>

              {(() => {
                const orgId = courses.find(
                  (c) => c.id === formCourseId,
                )?.organizationId;
                const courseLabGroups = orgId ? (byOrg[orgId] ?? []) : [];
                return (
                  <>
                    {courseLabGroups.map((g) => (
                      <TouchableOpacity
                        key={g.id}
                        onPress={() => {
                          setActiveGroupId(g.id);
                          setShowGroupPicker(false);
                        }}
                        className={`flex-row items-center gap-3 px-4 py-3.5 rounded-2xl border mb-2 ${activeGroupId === g.id ? "bg-indigo-50 border-indigo-500" : "bg-gray-50 dark:bg-zinc-800 border-gray-100 dark:border-zinc-700"}`}
                      >
                        <Ionicons
                          name="flask-outline"
                          size={18}
                          color={activeGroupId === g.id ? "#4f46e5" : "#6B7280"}
                        />
                        <Text
                          className={`font-semibold text-base ${activeGroupId === g.id ? "text-indigo-700" : "text-gray-700 dark:text-zinc-200"}`}
                        >
                          {g.name}
                        </Text>
                        {activeGroupId === g.id && (
                          <Ionicons
                            name="checkmark-circle"
                            size={18}
                            color="#4f46e5"
                            style={{ marginLeft: "auto" }}
                          />
                        )}
                      </TouchableOpacity>
                    ))}

                    {courseLabGroups.length === 0 && (
                      <Text className="text-gray-400 text-center py-4">
                        No groups yet. Tap &quot;+ New Group&quot; to create
                        one.
                      </Text>
                    )}
                  </>
                );
              })()}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Create New Group Modal ── */}
      <Modal
        visible={showCreateGroup}
        animationType="fade"
        transparent
        onRequestClose={() => setShowCreateGroup(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
          onPress={() => setShowCreateGroup(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View className="bg-white dark:bg-zinc-900 rounded-3xl p-6">
              <Text className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
                Create New Lab Group
              </Text>
              <TextInput
                value={newGroupName}
                onChangeText={setNewGroupName}
                placeholder="e.g. Lab Batch A"
                placeholderTextColor="#9CA3AF"
                className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-2xl px-4 py-3 text-gray-900 dark:text-white font-medium mb-4"
                autoFocus
              />
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setShowCreateGroup(false)}
                  className="flex-1 py-3 rounded-2xl bg-gray-100 dark:bg-zinc-800 items-center"
                >
                  <Text className="font-bold text-gray-700 dark:text-zinc-300">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCreateGroup}
                  disabled={creatingGroup || !newGroupName.trim()}
                  className={`flex-1 py-3 rounded-2xl items-center ${newGroupName.trim() ? "bg-indigo-600" : "bg-indigo-300"}`}
                >
                  {creatingGroup ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="font-bold text-white">Create</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={isAddModalOpen}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "flex-end",
          }}
          onPress={closeModal}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View className="bg-white dark:bg-zinc-900 w-full rounded-t-[32px] p-6 shadow-2xl">
              <View className="items-center mb-6">
                <View className="w-12 h-1.5 bg-gray-200 dark:bg-zinc-700 rounded-full mb-4" />
                <Text className="text-xl font-bold font-lora text-zinc-900 dark:text-white">
                  {editEntryId ? "Edit Slot" : "Add Slot"}
                </Text>
              </View>

              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                  Select Course
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {courses
                    .filter((c) =>
                      loggedInUser?.role === "ADMIN" && selectedOrgId
                        ? c.organizationId === selectedOrgId
                        : true,
                    )
                    .map((course) => (
                      <TouchableOpacity
                        key={course.id}
                        onPress={() => setFormCourseId(course.id)}
                        className={`px-3 py-2 rounded-xl border ${
                          formCourseId === course.id
                            ? "bg-blue-50 border-blue-500"
                            : "bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700"
                        }`}
                      >
                        <Text
                          className={`text-sm font-semibold ${
                            formCourseId === course.id
                              ? "text-blue-700"
                              : "text-gray-700 dark:text-zinc-300"
                          }`}
                        >
                          {course.code}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </View>
              </View>

              {/* Lab Group Picker Logic - Show only if selected course is LAB */}
              {(() => {
                const selectedCourse = courses.find(
                  (c) => c.id === formCourseId,
                );
                if (selectedCourse?.classType === "LAB") {
                  const orgId = selectedCourse.organizationId;
                  const courseLabGroups = orgId ? byOrg[orgId] || [] : [];
                  const activeGroupName = activeGroupId
                    ? (courseLabGroups.find((g) => g.id === activeGroupId)
                        ?.name ?? "Unknown Group")
                    : "All Students";

                  return (
                    <View className="mb-4">
                      <Text className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                        Select Lab Group
                      </Text>
                      <View className="flex-row items-center justify-between border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 bg-gray-50 dark:bg-zinc-800">
                        <TouchableOpacity
                          onPress={() => setShowGroupPicker(true)}
                          className="flex-row items-center gap-2 flex-1"
                        >
                          <Ionicons
                            name="people-outline"
                            size={16}
                            color="#4f46e5"
                          />
                          <Text className="flex-1 font-semibold text-zinc-900 dark:text-zinc-100">
                            {activeGroupName}
                          </Text>
                          <Ionicons
                            name="chevron-down"
                            size={16}
                            color="#6B7280"
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setShowCreateGroup(true)}
                          className="ml-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg px-2 py-1"
                        >
                          <Text className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold px-1">
                            + NEW
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }
                return null;
              })()}

              <View className="flex-row gap-4 mb-4">
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                    Start Time
                  </Text>
                  <View className="flex-row items-center bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden pr-1">
                    <TextInput
                      value={formStartTime}
                      onChangeText={setFormStartTime}
                      placeholder="09:00"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numbers-and-punctuation"
                      className="flex-1 px-4 py-3 text-gray-900 dark:text-white font-medium"
                    />
                    <TouchableOpacity
                      onPress={() =>
                        setFormStartPeriod(
                          formStartPeriod === "AM" ? "PM" : "AM",
                        )
                      }
                      className="bg-indigo-100 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg ml-1"
                    >
                      <Text className="text-indigo-700 dark:text-indigo-400 font-bold text-xs">
                        {formStartPeriod}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                    End Time
                  </Text>
                  <View className="flex-row items-center bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden pr-1">
                    <TextInput
                      value={formEndTime}
                      onChangeText={setFormEndTime}
                      placeholder="10:00"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numbers-and-punctuation"
                      className="flex-1 px-4 py-3 text-gray-900 dark:text-white font-medium"
                    />
                    <TouchableOpacity
                      onPress={() =>
                        setFormEndPeriod(formEndPeriod === "AM" ? "PM" : "AM")
                      }
                      className="bg-indigo-100 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg ml-1"
                    >
                      <Text className="text-indigo-700 dark:text-indigo-400 font-bold text-xs">
                        {formEndPeriod}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View className="mb-6">
                <Text className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                  Location (Room No.)
                </Text>
                <TextInput
                  value={formLocation}
                  onChangeText={setFormLocation}
                  placeholder="e.g. A-101"
                  placeholderTextColor="#9CA3AF"
                  className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white font-medium"
                />
              </View>

              <View className="flex-row gap-3 mb-5">
                {editEntryId && (
                  <TouchableOpacity
                    onPress={closeModal}
                    className="flex-1 bg-gray-100 dark:bg-zinc-800 rounded-2xl py-4 items-center shadow-sm"
                  >
                    <Text className="text-gray-700 dark:text-zinc-300 font-bold text-base tracking-wide">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={handleAddSubmit}
                  className="flex-1 bg-blue-600 rounded-2xl py-4 items-center shadow-lg shadow-blue-500/20"
                >
                  <Text className="text-white font-bold text-base tracking-wide">
                    {editEntryId ? "Update Slot" : "Save Slot"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

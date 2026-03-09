import { useAuth } from "@/contexts/auth.cntxt";
import { useCoursesStore } from "@/lib/store/courses";
import { useLabGroupsStore } from "@/lib/store/lab-groups";
import { TimetableEntry, useTimetableStore } from "@/lib/store/timetable";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
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
  const { createTimetableEntry, deleteTimetableEntry } = useTimetableStore();
  const { courses, fetchCourses } = useCoursesStore();
  const { byOrg, fetchOrgLabGroups, createLabGroup } = useLabGroupsStore();

  const [selectedDay, setSelectedDay] = useState(DAYS[0]);
  const [allEntries, setAllEntries] = useState<TimetableEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

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
  const [formEndTime, setFormEndTime] = useState<string>("");
  const [formLocation, setFormLocation] = useState<string>("");

  const loadAll = async () => {
    try {
      setRefreshing(true);
      const origin =
        process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/v1";
      const res = await fetch(`${origin}/timetable`);
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

    const entry = {
      courseId: formCourseId,
      day: formDay,
      startTime: formStartTime,
      endTime: formEndTime,
      location: formLocation,
      // auto-attach the currently selected lab group (or undefined for all students)
      labGroupId: activeGroupId ?? undefined,
    };

    const token = await refreshJwt();
    const success = await createTimetableEntry(token || "", entry);
    if (success) {
      Alert.alert("Success", "Timetable entry created.");
      setAddModalOpen(false);
      setFormCourseId("");
      setFormStartTime("");
      setFormEndTime("");
      setFormLocation("");
      loadAll();
    } else {
      Alert.alert("Error", "Could not create entry.");
    }
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
            <View className="flex-row justify-between">
              <Text className="text-gray-900 dark:text-white font-bold text-base">
                {course?.name || "Unknown Course"}
              </Text>
              <Text className="text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                {course?.code}
              </Text>
            </View>
            <View className="flex-row items-center gap-3 mt-2">
              <View className="flex-row items-center gap-1">
                <Ionicons name="time-outline" size={14} color="#6B7280" />
                <Text className="text-sm text-gray-500">{timeStr}</Text>
              </View>
              {item.location ? (
                <View className="flex-row items-center gap-1">
                  <Ionicons name="location-outline" size={14} color="#6B7280" />
                  <Text className="text-sm text-gray-500">{item.location}</Text>
                </View>
              ) : null}
            </View>
          </View>
          <TouchableOpacity
            onPress={() => handleDelete(item.id)}
            className="ml-3 justify-center"
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
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
          setAddModalOpen(true);
        }}
        className="absolute bottom-6 right-6 bg-blue-600 h-14 w-14 rounded-full justify-center items-center shadow-lg shadow-blue-500/30 active:scale-95"
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>

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

      {/* ── Add Slot Modal ── */}
      <Modal
        visible={isAddModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setAddModalOpen(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "flex-end",
          }}
          onPress={() => setAddModalOpen(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View className="bg-white dark:bg-zinc-900 w-full rounded-t-[32px] p-6 shadow-2xl">
              <View className="items-center mb-6">
                <View className="w-12 h-1.5 bg-gray-200 dark:bg-zinc-700 rounded-full mb-4" />
                <Text className="text-xl font-bold font-lora text-zinc-900 dark:text-white">
                  Add Slot
                </Text>
              </View>

              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                  Select Course
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {courses.map((course) => (
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
                  <TextInput
                    value={formStartTime}
                    onChangeText={setFormStartTime}
                    placeholder="09:00"
                    placeholderTextColor="#9CA3AF"
                    className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white font-medium"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                    End Time
                  </Text>
                  <TextInput
                    value={formEndTime}
                    onChangeText={setFormEndTime}
                    placeholder="10:00"
                    placeholderTextColor="#9CA3AF"
                    className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white font-medium"
                  />
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

              <TouchableOpacity
                onPress={handleAddSubmit}
                className="bg-blue-600 rounded-2xl py-4 items-center mb-5 shadow-lg shadow-blue-500/20"
              >
                <Text className="text-white font-bold text-base tracking-wide">
                  Save Slot
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

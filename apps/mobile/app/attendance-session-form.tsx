import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/auth.cntxt";
import { useCoursesStore, useOrgsStore, useLabGroupsStore } from "@/lib/store";
import * as Location from "expo-location";
import { router, Stack } from "expo-router";
import React, { useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Switch,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { SafeAreaView } from "react-native-safe-area-context";

interface Student {
  id: string;
  name: string;
  image?: string;
  studentProfile?: {
    labGroupId: string | null;
  };
}

interface Course {
  id: string;
  name: string;
  code: string;
  classType: string;
  organizationId?: string;
}

const ATTENDANCE_LIMITS = [5, 10, 15, 20, 30, 45, 60];
const GEOFENCE_LIMITS = [10, 50, 100, 200, 500];

const AttendanceSessionForm = () => {
  const { loggedInUser } = useAuth();
  const { fetchCourses } = useCoursesStore();
  const allCourses = useCoursesStore((s) => s.courses);
  const { fetchOrgs } = useOrgsStore();
  const orgs = useOrgsStore((s) => s.orgs);
  const { fetchOrgLabGroups } = useLabGroupsStore();

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [absentIndices, setAbsentIndices] = useState<number[]>([]);

  const [labGroups, setLabGroups] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [selectedLabGroupId, setSelectedLabGroupId] = useState<string | null>(
    null,
  );
  const [loadingLabGroups, setLoadingLabGroups] = useState(false);

  const [timerValue, setTimerValue] = useState("10");
  const [geofenceRadius, setGeofenceRadius] = useState(75);
  const [creating, setCreating] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [generateWebLink, setGenerateWebLink] = useState(false);

  useEffect(() => {
    fetchCourses();
    fetchOrgs();
  }, [fetchCourses, fetchOrgs]);

  useEffect(() => {
    (async () => {
      setLoadingLocation(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission to access location was denied");
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setLocation(loc);
      } catch (err) {
        console.error("Location error:", err);
      } finally {
        setLoadingLocation(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (loggedInUser?.role === "ADMIN") {
      const filtered = selectedOrgId
        ? allCourses.filter((c: any) => c.organizationId === selectedOrgId)
        : allCourses;
      setCourses(filtered as any);

      // Auto-select first course if current selected course is not in the new list
      if (filtered.length > 0) {
        if (!selectedCourse || !filtered.find((c) => c.id === selectedCourse.id)) {
          setSelectedCourse(filtered[0] as any);
        }
      } else {
        setSelectedCourse(null);
      }
    } else {
      const userAny = loggedInUser as any;

      const userCourseIds = Array.isArray(userAny.courses)
        ? userAny.courses.map((c: any) => c.courseId)
        : [];
      const userCourses = (allCourses as any).filter((c: Course) =>
        userCourseIds.includes(c.id),
      );
      setCourses(userCourses);
      if (userCourses.length > 0) setSelectedCourse(userCourses[0]);
    }
  }, [allCourses, loggedInUser, selectedOrgId, selectedCourse]);

  const fetchStudents = React.useCallback(async (courseId: string) => {
    setLoadingStudents(true);
    try {
      const res = await apiFetch(`/courses/${courseId}/students`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.students)) {
          setStudents(data.students);
        } else {
          setStudents([]);
        }
        setSelectedIndices([]);
        setAbsentIndices([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  const fetchLabGroups = React.useCallback(
    async (course: Course) => {
      if (course.classType !== "LAB" || !course.organizationId) {
        setLabGroups([]);
        setSelectedLabGroupId(null);
        return;
      }

      setLoadingLabGroups(true);
      try {
        const groups = await fetchOrgLabGroups(course.organizationId);
        setLabGroups(groups);
        setSelectedLabGroupId(null);
      } catch (err) {
        console.error("Failed to fetch lab groups:", err);
      } finally {
        setLoadingLabGroups(false);
      }
    },
    [fetchOrgLabGroups],
  );

  useEffect(() => {
    if (selectedCourse) {
      fetchStudents(selectedCourse.id);
      fetchLabGroups(selectedCourse);
    }
  }, [selectedCourse, fetchStudents, fetchLabGroups]);

  const filteredStudents = useMemo(() => {
    if (!selectedLabGroupId) return students;
    return students.filter(
      (s) => s.studentProfile?.labGroupId === selectedLabGroupId,
    );
  }, [students, selectedLabGroupId]);

  const handleCreateSession = async () => {
    if (!selectedCourse || !timerValue) {
      Alert.alert("Error", "Please select a course and set a timer.");
      return;
    }
    setCreating(true);

    try {
      const startTime = new Date();
      const endTime = new Date(
        startTime.getTime() + parseInt(timerValue) * 60000,
      );
      const coords = location
        ? `${location.coords.latitude},${location.coords.longitude}`
        : null;

      const res = await apiFetch("/attendance/qr/session/create", {
        method: "POST",
        body: JSON.stringify({
          courseId: selectedCourse.id,
          startTime,
          endTime,
          manualPresentIds: selectedIndices.map((i) => filteredStudents[i].id),
          manualAbsentIds: absentIndices.map((i) => filteredStudents[i].id),
          labGroupId: selectedLabGroupId || undefined,
          geofenceRadius: geofenceRadius,
          coordinates: coords || undefined,
          generateWebLink,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const qrSession = data.qrSession;

        if (generateWebLink && qrSession?.webLink) {
          Alert.alert(
            "Session Created",
            "Scanner web link generated successfully.",
            [
              {
                text: "Copy Link",
                onPress: async () => {
                  try {
                    await Clipboard.setStringAsync(qrSession.webLink);
                    Alert.alert("Copied!", "Link copied to clipboard.", [
                      {
                        text: "OK",
                        onPress: () => router.push("/(tabs)/" as any),
                      },
                    ]);
                  } catch {
                    router.push("/(tabs)/" as any);
                  }
                },
              },
              {
                text: "Done",
                style: "cancel",
                onPress: () => router.push("/(tabs)/" as any),
              },
            ],
          );
        } else {
          Alert.alert("Success", "Attendance session created successfully.");
          router.push("/(tabs)/" as any);
        }
      } else {
        const err = await res.json();
        Alert.alert("Error", err.error || "Failed to create session");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-zinc-900">
      <Stack.Screen
        options={{ title: "New Attendance", headerShadowVisible: false }}
      />
      <ScrollView className="flex-1 px-4 pt-4">
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">
            Create Session
          </Text>
          <Text className="text-sm text-gray-500 mt-1">
            Configure details and manage attendance.
          </Text>
        </View>

        <View className="bg-white dark:bg-zinc-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-zinc-700 mb-6">
          <Text className="text-lg font-semibold text-gray-800 dark:text-zinc-200 mb-4">
            Course & Timer
          </Text>

          {loggedInUser?.role === "ADMIN" && (
            <View className="mb-4">
              <Text className="text-sm text-gray-500 mb-2">Organization</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  onPress={() => setSelectedOrgId(null)}
                  className={`mr-2 px-4 py-2 rounded-full border ${
                    selectedOrgId === null
                      ? "bg-indigo-600 border-indigo-600"
                      : "bg-gray-100 border-gray-200 dark:bg-zinc-700 dark:border-zinc-600"
                  }`}
                >
                  <Text
                    className={`${selectedOrgId === null ? "text-white" : "text-gray-600 dark:text-zinc-300"}`}
                  >
                    All Orgs
                  </Text>
                </TouchableOpacity>
                {orgs.map((org) => (
                  <TouchableOpacity
                    key={org.id}
                    onPress={() => setSelectedOrgId(org.id)}
                    className={`mr-2 px-4 py-2 rounded-full border ${
                      selectedOrgId === org.id
                        ? "bg-indigo-600 border-indigo-600"
                        : "bg-gray-100 border-gray-200 dark:bg-zinc-700 dark:border-zinc-600"
                    }`}
                  >
                    <Text
                      className={`${selectedOrgId === org.id ? "text-white" : "text-gray-600 dark:text-zinc-300"}`}
                    >
                      {`${org.departmentName} - ${org.courseName} (${org.section})`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <Text className="text-sm text-gray-500 mb-2">Course</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-4"
          >
            {courses.map((c) => (
              <TouchableOpacity
                key={c.id}
                onPress={() => setSelectedCourse(c)}
                className={`mr-2 px-4 py-2 rounded-full border ${
                  selectedCourse?.id === c.id
                    ? "bg-indigo-600 border-indigo-600"
                    : "bg-gray-100 border-gray-200 dark:bg-zinc-700 dark:border-zinc-600"
                }`}
              >
                <Text
                  className={`${selectedCourse?.id === c.id ? "text-white" : "text-gray-600 dark:text-zinc-300"}`}
                >
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {selectedCourse?.classType === "LAB" && (
            <View className="mb-4">
              <Text className="text-sm text-gray-500 mb-2">
                Lab Group (Optional)
              </Text>
              {loadingLabGroups ? (
                <ActivityIndicator size="small" color="#6366f1" />
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedLabGroupId(null);
                      setSelectedIndices([]);
                      setAbsentIndices([]);
                    }}
                    className={`mr-2 px-4 py-2 rounded-lg border ${
                      selectedLabGroupId === null
                        ? "bg-indigo-600 border-indigo-600"
                        : "bg-gray-100 border-gray-200 dark:bg-zinc-700 dark:border-zinc-600"
                    }`}
                  >
                    <Text
                      className={`${selectedLabGroupId === null ? "text-white" : "text-gray-600 dark:text-zinc-300"}`}
                    >
                      All Groups
                    </Text>
                  </TouchableOpacity>
                  {labGroups.map((g) => (
                    <TouchableOpacity
                      key={g.id}
                      onPress={() => {
                        setSelectedLabGroupId(g.id);
                        setSelectedIndices([]);
                        setAbsentIndices([]);
                      }}
                      className={`mr-2 px-4 py-2 rounded-lg border ${
                        selectedLabGroupId === g.id
                          ? "bg-indigo-600 border-indigo-600"
                          : "bg-gray-100 border-gray-200 dark:bg-zinc-700 dark:border-zinc-600"
                      }`}
                    >
                      <Text
                        className={`${selectedLabGroupId === g.id ? "text-white" : "text-gray-600 dark:text-zinc-300"}`}
                      >
                        {g.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          <Text className="text-sm text-gray-500 mb-2">Duration (minutes)</Text>
          <View className="flex-row flex-wrap mb-4">
            {ATTENDANCE_LIMITS.map((limit) => (
              <TouchableOpacity
                key={limit}
                onPress={() => setTimerValue(limit.toString())}
                className={`mr-2 mb-2 px-4 py-2 rounded-lg border ${
                  timerValue === limit.toString()
                    ? "bg-indigo-600 border-indigo-600"
                    : "bg-gray-100 border-gray-200 dark:bg-zinc-700 dark:border-zinc-600"
                }`}
              >
                <Text
                  className={`${timerValue === limit.toString() ? "text-white" : "text-gray-600 dark:text-zinc-300"}`}
                >
                  {limit}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-sm text-gray-500 mb-1">
            Geofence Radius (meters)
          </Text>
          <View className="flex-row flex-wrap mt-1">
            {GEOFENCE_LIMITS.map((limit) => (
              <TouchableOpacity
                key={limit}
                onPress={() => setGeofenceRadius(limit)}
                className={`mr-2 mb-2 px-4 py-2 rounded-lg border ${
                  geofenceRadius === limit
                    ? "bg-indigo-600 border-indigo-600"
                    : "bg-gray-100 border-gray-200 dark:bg-zinc-700 dark:border-zinc-600"
                }`}
              >
                <Text
                  className={`${geofenceRadius === limit ? "text-white" : "text-gray-600 dark:text-zinc-300"}`}
                >
                  {limit}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View className="flex-row items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-zinc-700">
            <View className="flex-1 pr-4">
              <Text className="text-base font-medium text-gray-800 dark:text-zinc-200">
                Scanner Web Link
              </Text>
              <Text className="text-xs text-gray-500 mt-1">
                Generate a link to display the QR code on a larger screen
              </Text>
            </View>
            <Switch
              value={generateWebLink}
              onValueChange={setGenerateWebLink}
              trackColor={{ false: "#d1d5db", true: "#818cf8" }}
              thumbColor={generateWebLink ? "#4f46e5" : "#f3f4f6"}
            />
          </View>
        </View>

        <View className="bg-white dark:bg-zinc-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-zinc-700 mb-6">
          <Text className="text-lg font-semibold text-gray-800 dark:text-zinc-200 mb-4">
            Manual Attendance
          </Text>
          {loadingStudents ? (
            <ActivityIndicator color="#6366f1" />
          ) : (
            filteredStudents.map((student, index) => (
              <View
                key={student.id}
                className="flex-row items-center justify-between py-3 border-b border-gray-50 dark:border-zinc-700 last:border-0"
              >
                <Text className="text-gray-700 dark:text-zinc-300">
                  {student.name}
                </Text>
                <View className="flex-row">
                  <TouchableOpacity
                    onPress={() => {
                      if (selectedIndices.includes(index)) {
                        setSelectedIndices(
                          selectedIndices.filter((i) => i !== index),
                        );
                      } else {
                        setSelectedIndices([...selectedIndices, index]);
                        setAbsentIndices(
                          absentIndices.filter((i) => i !== index),
                        );
                      }
                    }}
                    className={`px-3 py-1 rounded-full mr-2 ${selectedIndices.includes(index) ? "bg-green-100" : "bg-gray-100 dark:bg-zinc-700"}`}
                  >
                    <Text
                      className={
                        selectedIndices.includes(index)
                          ? "text-green-700"
                          : "text-gray-500"
                      }
                    >
                      Present
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      if (absentIndices.includes(index)) {
                        setAbsentIndices(
                          absentIndices.filter((i) => i !== index),
                        );
                      } else {
                        setAbsentIndices([...absentIndices, index]);
                        setSelectedIndices(
                          selectedIndices.filter((i) => i !== index),
                        );
                      }
                    }}
                    className={`px-3 py-1 rounded-full ${absentIndices.includes(index) ? "bg-red-100" : "bg-gray-100 dark:bg-zinc-700"}`}
                  >
                    <Text
                      className={
                        absentIndices.includes(index)
                          ? "text-red-700"
                          : "text-gray-500"
                      }
                    >
                      Absent
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity
          onPress={handleCreateSession}
          disabled={creating || loadingLocation}
          className={`bg-indigo-600 p-4 rounded-2xl items-center mb-10 ${creating || loadingLocation ? "opacity-50" : ""}`}
        >
          {creating ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">Start Session</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AttendanceSessionForm;

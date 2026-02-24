import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Status = "present" | "absent" | null;

type Student = { id: string; name: string; rollNo: string; status: Status };

const StudentRow = React.memo(
  ({
    student,
    onStatusChange,
  }: {
    student: Student;
    onStatusChange: (id: string, status: Status) => void;
  }) => (
    <View className="flex-row items-center justify-between py-3.5 border-b border-gray-100">
      {/* User Info */}
      <View className="flex-1">
        <Text className="text-base font-semibold text-gray-800">
          {student.name}
        </Text>
        <Text className="text-xs text-gray-500 font-medium mt-0.5">
          {student.rollNo}
        </Text>
      </View>

      {/* Status Toggles */}
      <View className="flex-row gap-x-2">
        <Pressable
          onPress={() =>
            onStatusChange(
              student.id,
              student.status === "present" ? null : "present",
            )
          }
          className={`px-3 py-1.5 rounded-md border flex-row items-center gap-x-1 ${
            student.status === "present"
              ? "bg-green-100 border-green-200"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          {student.status === "present" && (
            <Ionicons name="checkmark" size={12} color="#15803d" />
          )}
          <Text
            className={`text-xs font-semibold ${student.status === "present" ? "text-green-700" : "text-gray-500"}`}
          >
            Present
          </Text>
        </Pressable>

        <Pressable
          onPress={() =>
            onStatusChange(
              student.id,
              student.status === "absent" ? null : "absent",
            )
          }
          className={`px-3 py-1.5 rounded-md border flex-row items-center gap-x-1 ${
            student.status === "absent"
              ? "bg-red-100 border-red-200"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          {student.status === "absent" && (
            <Ionicons name="close" size={12} color="#b91c1c" />
          )}
          <Text
            className={`text-xs font-semibold ${student.status === "absent" ? "text-red-700" : "text-gray-500"}`}
          >
            Absent
          </Text>
        </Pressable>
      </View>
    </View>
  ),
);
StudentRow.displayName = "StudentRow";

const COURSES = [
  { id: "1", name: "Data Structures", code: "CS201" },
  { id: "2", name: "Operating Systems", code: "CS301" },
  { id: "3", name: "Computer Networks", code: "CS401" },
];

const CLASSES = [
  { id: "1", name: "B.Tech CSE", sec: "A" },
  { id: "2", name: "B.Tech CSE", sec: "B" },
  { id: "3", name: "B.Tech IT", sec: "A" },
];

const INIT_STUDENTS = [
  { id: "101", name: "Alice Smith", rollNo: "CS20101", status: null as Status },
  { id: "102", name: "Bob Johnson", rollNo: "CS20102", status: null as Status },
  {
    id: "103",
    name: "Charlie Brown",
    rollNo: "CS20103",
    status: null as Status,
  },
  {
    id: "104",
    name: "Diana Prince",
    rollNo: "CS20104",
    status: null as Status,
  },
  { id: "105", name: "Evan Davis", rollNo: "CS20105", status: null as Status },
  {
    id: "106",
    name: "Fiona Gallagher",
    rollNo: "CS20106",
    status: null as Status,
  },
  {
    id: "107",
    name: "George Miller",
    rollNo: "CS20107",
    status: null as Status,
  },
];

export default function AttendanceSessionForm() {
  const router = useRouter();

  const [selectedCourse, setSelectedCourse] = useState(COURSES[0]);
  const [selectedClass, setSelectedClass] = useState(CLASSES[0]);
  const [selectedTime, setSelectedTime] = useState(5);
  const [students, setStudents] = useState(INIT_STUDENTS);

  const [isCourseDropdownOpen, setCourseDropdownOpen] = useState(false);
  const [isClassDropdownOpen, setClassDropdownOpen] = useState(false);

  // Location state
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(
    null,
  );
  const [locationStatus, setLocationStatus] = useState<
    "loading" | "ok" | "denied"
  >("loading");

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationStatus("denied");
        return;
      }
      const coords = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation({
        lat: coords.coords.latitude,
        lon: coords.coords.longitude,
      });
      setLocationStatus("ok");
    })();
  }, []);

  const handleStatusChange = useCallback(
    (studentId: string, status: Status) => {
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, status } : s)),
      );
    },
    [],
  );

  const handleCreateSession = () => {
    if (locationStatus !== "ok") {
      Alert.alert(
        "Location Required",
        "Please wait for location to be determined before creating the session.",
      );
      return;
    }
    // Log for simulation purposes
    console.log("Creating Session with data:");
    console.log({
      selectedCourse,
      selectedClass,
      selectedTime,
      location,
      students,
    });

    Alert.alert(
      "Session Created",
      "The attendance session has been successfully initiated.",
      [{ text: "OK", onPress: () => router.back() }],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Stack.Screen
        options={{
          title: "New Attendance",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "#f9fafb" },
        }}
      />

      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900">
            Create Attendance Session
          </Text>
          <Text className="text-sm text-gray-500 mt-1">
            Configure details and manage attendance instances.
          </Text>
        </View>

        {/* Configuration Card */}
        <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-4">
            Session Details
          </Text>

          {/* Course Selector Dropdown (Accordion) */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1.5 shrink-0">
              Course
            </Text>
            <Pressable
              onPress={() => {
                setCourseDropdownOpen(!isCourseDropdownOpen);
                setClassDropdownOpen(false); // Close other dropdown
              }}
              className="flex-row items-center justify-between bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl"
            >
              <Text className="text-gray-800 font-medium">
                {selectedCourse.code} - {selectedCourse.name}
              </Text>
              <Ionicons
                name={isCourseDropdownOpen ? "chevron-up" : "chevron-down"}
                size={20}
                color="#6b7280"
              />
            </Pressable>

            {isCourseDropdownOpen && (
              <View className="mt-2 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                {COURSES.map((course, index) => (
                  <Pressable
                    key={course.id}
                    onPress={() => {
                      setSelectedCourse(course);
                      setCourseDropdownOpen(false);
                    }}
                    className={`px-4 py-3 flex-row justify-between items-center ${
                      index !== COURSES.length - 1
                        ? "border-b border-gray-100"
                        : ""
                    } ${selectedCourse.id === course.id ? "bg-indigo-50/50" : "bg-white"}`}
                  >
                    <Text
                      className={`font-medium flex-1 ${
                        selectedCourse.id === course.id
                          ? "text-indigo-600"
                          : "text-gray-700"
                      }`}
                    >
                      {course.code} - {course.name}
                    </Text>
                    {selectedCourse.id === course.id && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#4f46e5"
                      />
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Class Selector Dropdown (Accordion) */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1.5 shrink-0">
              Class & Section
            </Text>
            <Pressable
              onPress={() => {
                setClassDropdownOpen(!isClassDropdownOpen);
                setCourseDropdownOpen(false); // Close other dropdown
              }}
              className="flex-row items-center justify-between bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl"
            >
              <Text className="text-gray-800 font-medium">
                {selectedClass.name} (Sec {selectedClass.sec})
              </Text>
              <Ionicons
                name={isClassDropdownOpen ? "chevron-up" : "chevron-down"}
                size={20}
                color="#6b7280"
              />
            </Pressable>

            {isClassDropdownOpen && (
              <View className="mt-2 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                {CLASSES.map((cls, index) => (
                  <Pressable
                    key={cls.id}
                    onPress={() => {
                      setSelectedClass(cls);
                      setClassDropdownOpen(false);
                    }}
                    className={`px-4 py-3 flex-row justify-between items-center ${
                      index !== CLASSES.length - 1
                        ? "border-b border-gray-100"
                        : ""
                    } ${selectedClass.id === cls.id ? "bg-indigo-50/50" : "bg-white"}`}
                  >
                    <Text
                      className={`font-medium flex-1 ${
                        selectedClass.id === cls.id
                          ? "text-indigo-600"
                          : "text-gray-700"
                      }`}
                    >
                      {cls.name} (Sec {cls.sec})
                    </Text>
                    {selectedClass.id === cls.id && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#4f46e5"
                      />
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Duration */}
          <View className="mb-2">
            <Text className="text-sm font-medium text-gray-700 mb-2 shrink-0">
              Valid Duration
            </Text>
            <View className="flex-row gap-x-3">
              {[5, 10, 15].map((time) => (
                <Pressable
                  key={time}
                  onPress={() => setSelectedTime(time)}
                  className={`flex-1 items-center justify-center py-2.5 rounded-lg border flex-row gap-x-1 ${
                    selectedTime === time
                      ? "bg-indigo-600 border-indigo-600"
                      : "bg-white border-gray-200"
                  }`}
                >
                  {selectedTime === time && (
                    <Ionicons name="time-outline" size={16} color="#fff" />
                  )}
                  <Text
                    className={`font-semibold ${
                      selectedTime === time ? "text-white" : "text-gray-600"
                    }`}
                  >
                    {time} min
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Location (read-only, auto-fetched) */}
          <View className="mt-4">
            <Text className="text-sm font-medium text-gray-700 mb-1.5">
              Session Location
            </Text>
            <View className="flex-row items-center bg-gray-100 border border-gray-200 px-4 py-3 rounded-xl gap-x-2">
              <Ionicons
                name={
                  locationStatus === "denied"
                    ? "location-outline"
                    : locationStatus === "loading"
                      ? "time-outline"
                      : "location"
                }
                size={18}
                color={locationStatus === "ok" ? "#4f46e5" : "#9ca3af"}
              />
              <Text
                className={`flex-1 font-medium ${
                  locationStatus === "loading"
                    ? "text-gray-400 italic"
                    : locationStatus === "denied"
                      ? "text-red-400"
                      : "text-gray-700"
                }`}
              >
                {locationStatus === "loading"
                  ? "Fetching coordinates…"
                  : locationStatus === "denied"
                    ? "Location permission denied"
                    : `${location?.lat.toFixed(6)}, ${location?.lon.toFixed(6)}`}
              </Text>
              {locationStatus === "ok" && (
                <View className="bg-indigo-100 px-2 py-0.5 rounded-full">
                  <Text className="text-indigo-600 text-xs font-semibold">
                    Live
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-xs text-gray-400 mt-1 ml-1">
              Auto-detected · Read only
            </Text>
          </View>
        </View>

        {/* Students List Card */}
        <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-8">
          <View className="flex-row justify-between items-end mb-4 pr-1">
            <View>
              <Text className="text-lg font-semibold text-gray-800">
                Manage Students
              </Text>
              <Text className="text-xs text-gray-500 mt-1">
                Manual overrides for this session
              </Text>
            </View>
            <Text className="text-sm text-indigo-600 font-medium">
              {students.filter((s) => s.status === "present").length}/
              {students.length} Present
            </Text>
          </View>

          {/* Virtualized Student List — handles 60-100 students efficiently */}
          <FlatList
            data={students}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            removeClippedSubviews={false}
            renderItem={({ item }) => (
              <StudentRow student={item} onStatusChange={handleStatusChange} />
            )}
          />
        </View>
      </ScrollView>

      {/* Footer Floating Action */}
      <View className="px-4 py-4 bg-white border-t border-gray-100 pb-8 rounded-t-3xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <TouchableOpacity
          onPress={handleCreateSession}
          activeOpacity={0.8}
          className="bg-indigo-600 rounded-xl py-4 flex-row items-center justify-center gap-x-2 shadow-sm"
        >
          <Text className="text-white font-bold text-lg">Initiate Session</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

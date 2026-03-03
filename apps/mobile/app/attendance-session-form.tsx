import { useAuth } from "@/contexts/auth.cntxt";
import { useCoursesStore, useOrgsStore } from "@/lib/store";
import { Course } from "@/lib/store/timetable";
import { Ionicons } from "@expo/vector-icons";
import { OrgT } from "@unitime/types";
import { withAuth } from "@/lib/api";
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
      <View className="flex-1">
        <Text className="text-base font-semibold text-gray-800">
          {student.name}
        </Text>
        <Text className="text-xs text-gray-500 font-medium mt-0.5">
          {student.rollNo}
        </Text>
      </View>

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

export default function AttendanceSessionForm() {
  const router = useRouter();
  const { loggedInUser } = useAuth();
  const { courses: allCourses } = useCoursesStore();
  const { orgs: allOrgs } = useOrgsStore();

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedClass, setSelectedClass] = useState<OrgT | null>(null);
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [classesList, setClassesList] = useState<OrgT[]>([]);

  const [selectedTime, setSelectedTime] = useState(5);
  // Optional: keep students empty or load dynamically based on selected class
  const [students, setStudents] = useState<Student[]>([]);

  const [isCourseDropdownOpen, setCourseDropdownOpen] = useState(false);
  const [isClassDropdownOpen, setClassDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"loading" | "ok" | "denied">("loading");

  useEffect(() => {
    if (loggedInUser?.role === "ADMIN") {
      setCourses(allCourses);
      setClassesList(allOrgs);
      if (allCourses.length > 0) setSelectedCourse(allCourses[0]);
      if (allOrgs.length > 0) setSelectedClass(allOrgs[0]);
    } else if (loggedInUser?.role === "REPRESENTATIVE" || loggedInUser?.role === "PROFESSOR") {
      const userAny = loggedInUser as any;
      const userOrgId = userAny.studentProfile?.organizationId;
      const userOrg = allOrgs.find((o) => o.id === userOrgId) || null;
      setSelectedClass(userOrg);
      setClassesList(userOrg ? [userOrg] : []);

      const userEnrolledCourseIds = Array.isArray(userAny.courses) ? userAny.courses.map((c: any) => c.courseId) : [];
      const userCourses = allCourses.filter((c: Course) => userEnrolledCourseIds.includes(c.id));
      setCourses(userCourses);
      if (userCourses.length > 0) setSelectedCourse(userCourses[0]);
    }
  }, [loggedInUser, allCourses, allOrgs]);

  // Handle filtering courses when a specific organization (class/section) is selected
  useEffect(() => {
    if (selectedClass) {
      if (loggedInUser?.role === "ADMIN") {
         const filteredCourses = allCourses.filter(c => c.organizationId === selectedClass.id);
         setCourses(filteredCourses);
         
         // If current selectedCourse is not in the new filtered list, reset it.
         if (filteredCourses.length > 0) {
            if (!selectedCourse || !filteredCourses.find(c => c.id === selectedCourse.id)) {
               setSelectedCourse(filteredCourses[0]);
            }
         } else {
            setSelectedCourse(null);
         }
      } else {
         // For REPRESENTATIVE and PROFESSOR, we also ensure enrolled courses match the org
         const userAny = loggedInUser as any;
         const userEnrolledCourseIds = Array.isArray(userAny.courses) ? userAny.courses.map((c: any) => c.courseId) : [];
         const filteredCourses = allCourses.filter(
            (c: Course) => userEnrolledCourseIds.includes(c.id) && c.organizationId === selectedClass.id
         );
         setCourses(filteredCourses);
         
         if (filteredCourses.length > 0) {
            if (!selectedCourse || !filteredCourses.find(c => c.id === selectedCourse.id)) {
               setSelectedCourse(filteredCourses[0]);
            }
         } else {
            setSelectedCourse(null);
         }
      }
    } else {
        // If no class selected, clear courses
        setCourses([]);
        setSelectedCourse(null);
    }
  }, [selectedClass, allCourses, loggedInUser, selectedCourse]);

  // Load students belonging to the selected course and class
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedCourse) {
        setStudents([]);
        return;
      }
      try {
        const origin = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/v1";
        const res = await fetch(`${origin}/courses/${selectedCourse.id}/students`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.students)) {
            let filteredStudents = data.students.filter((s: any) => s.id !== loggedInUser?.id);
            if (selectedClass) {
              filteredStudents = filteredStudents.filter(
                (s: any) => s.studentProfile?.organizationId === selectedClass.id
              );
            }
            setStudents(
              filteredStudents.map((s: any) => ({
                id: s.id,
                name: s.name,
                rollNo: s.studentProfile?.admissionNumber || s.email,
                status: null,
              }))
            );
          }
        }
      } catch (err) {
        console.warn("Failed to natively load students for session form", err);
      }
    };
    fetchStudents();
  }, [selectedCourse, selectedClass, loggedInUser]);

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

  const handleCreateSession = async () => {
    if (locationStatus !== "ok") {
      Alert.alert(
        "Location Required",
        "Please wait for location to be determined before creating the session.",
      );
      return;
    }
    if (!selectedCourse) {
       Alert.alert("Missing Details", "Please select a course to start a session.");
       return;
    }

    setIsSubmitting(true);
    try {
      const origin = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/v1";
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + selectedTime * 60000);

      // Create Session
      const manualPresentIds = students.filter(s => s.status === "present").map(s => s.id);
      
      const res = await fetch(
        `${origin}/attendance/qr/session/create`,
        withAuth({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId: selectedCourse.id,
            creatorId: loggedInUser?.id,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            manualPresentIds,
          }),
        }),
      );
      const data = await res.json();

      if (res.status === 401) {
        Alert.alert("Not Authenticated", "Session expired. Please sign in again.");
        setIsSubmitting(false);
        return;
      }
      if (res.status === 403) {
        Alert.alert("Insufficient permissions", "You do not have access to create sessions.");
        setIsSubmitting(false);
        return;
      }

      if (res.ok && data.success) {
        
        // Push notification logic from frontend:
        try {
          // Fetch enrolled students for the created session's course
          const studentsRes = await fetch(`${origin}/courses/${selectedCourse.id}/students`);
          
          if (studentsRes.ok) {
            const studentsData = await studentsRes.json();
            
            if (studentsData.success && Array.isArray(studentsData.students)) {
                // Filter out the professor themselves
                let targetStudents = studentsData.students.filter((s: any) => s.id !== loggedInUser?.id);
                
                // If a specific section/class is selected (e.g by Admin), ensure we only notify those students.
                // OrganizationId usually resides inside the studentProfile.
                if (selectedClass) {
                  targetStudents = targetStudents.filter(
                    (s: any) => s.studentProfile?.organizationId === selectedClass.id
                  );
                }

                // Skip sending ping/actionUrls into those who received manual attendance marks.
                const manualAbsentIds = students.filter(s => s.status === "absent").map(s => s.id);
                targetStudents = targetStudents.filter(
                  (s: any) => !manualPresentIds.includes(s.id) && !manualAbsentIds.includes(s.id)
                );

                // Gather Expo tokens
                const tokens = targetStudents
                  .map((s: any) => s.expoPushToken)
                  .filter(Boolean);

                if (tokens.length > 0) {
                  console.log(`Sending explicit frontend notifications to ${tokens.length} devices...`);

                  const pushPayload = tokens.map((token: string) => ({
                    to: token,
                    sound: 'default',
                    title: 'Attendance Started',
                    body: `Attendance for ${selectedCourse.name} is now open! Please open the app or tap here to check in.`,
                    data: { courseId: selectedCourse.id, sessionId: data.qrSession.id }
                  }));

                  // Dispatch to Expo
                  await fetch('https://exp.host/--/api/v2/push/send', {
                    method: 'POST',
                    headers: {
                      Accept: 'application/json',
                      'Accept-encoding': 'gzip, deflate',
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(pushPayload),
                  });
                }
                
                // Dispatch native in-app notification
                try {
                  const notifPayload = {
                    title: 'Attendance Started',
                    body: `Attendance for ${selectedCourse.name} is now open! Tap here to check in.`,
                    type: 'ATTENDANCE',
                    userId: null,
                    organizationId: selectedClass ? selectedClass.id : null,
                    actionUrl: '/tap-to-mark'
                  };

                  // If no specific class is selected, creating notifications one-by-one
                  if (!selectedClass && targetStudents.length > 0) {
                     await Promise.all(
                       targetStudents.map((s: any) => 
                         fetch(`${origin}/notifications`, {
                           method: "POST",
                           headers: { "Content-Type": "application/json" },
                           body: JSON.stringify({ ...notifPayload, userId: s.id, organizationId: null })
                         })
                       )
                     );
                  } else if (selectedClass) {
                     // Create one Organization-level notification
                     await fetch(`${origin}/notifications`, {
                       method: "POST",
                       headers: { "Content-Type": "application/json" },
                       body: JSON.stringify(notifPayload)
                     });
                  }
                } catch (notifErr) {
                   console.log("Failed to create in-app notifications:", notifErr);
                }
            }
          }
        } catch (pushErr) {
          console.warn("Frontend fallback push notifications failed:", pushErr);
        }

        Alert.alert(
          "Session Created",
          "The attendance session has been successfully initiated and students notified.",
          [{ text: "OK", onPress: () => router.back() }],
        );
      } else {
        throw new Error(data.message || "Failed to create session");
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error", e.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
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
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900">
            Create Attendance Session
          </Text>
          <Text className="text-sm text-gray-500 mt-1">
            Configure details and manage attendance instances.
          </Text>
        </View>

        <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-4">
            Session Details
          </Text>

          {/* Course Selector Dropdown (Classes user is enrolled in) */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1.5 shrink-0">
              Classes (Subjects)
            </Text>
            {courses.length === 0 ? (
               <Text className="text-gray-500 italic my-2">No enrolled classes found.</Text>
            ) : (
              <Pressable
                onPress={() => {
                  setCourseDropdownOpen(!isCourseDropdownOpen);
                  setClassDropdownOpen(false);
                }}
                className="flex-row items-center justify-between bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl"
              >
                <Text className="text-gray-800 font-medium">
                  {selectedCourse ? `${selectedCourse.code} - ${selectedCourse.name} (${selectedCourse.classType})` : "Select Class..."}
                </Text>
                <Ionicons
                  name={isCourseDropdownOpen ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#6b7280"
                />
              </Pressable>
            )}

            {isCourseDropdownOpen && (
              <View className="mt-2 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                {courses.map((course, index) => (
                  <Pressable
                    key={course.id}
                    onPress={() => {
                      setSelectedCourse(course);
                      setCourseDropdownOpen(false);
                    }}
                    className={`px-4 py-3 flex-row justify-between items-center ${
                      index !== courses.length - 1
                        ? "border-b border-gray-100"
                        : ""
                    } ${selectedCourse?.id === course.id ? "bg-indigo-50/50" : "bg-white"}`}
                  >
                    <Text
                      className={`font-medium flex-1 ${
                        selectedCourse?.id === course.id
                          ? "text-indigo-600"
                          : "text-gray-700"
                      }`}
                    >
                      {course.code} - {course.name} ({course.classType})
                    </Text>
                    {selectedCourse?.id === course.id && (
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

          {/* Orgs Selector Dropdown (Organizations/Sections) */}
          {loggedInUser?.role === "ADMIN" && (
            <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-1.5 shrink-0">
                  Course & Section
                </Text>
                <Pressable
                  onPress={() => {
                    setClassDropdownOpen(!isClassDropdownOpen);
                    setCourseDropdownOpen(false); 
                  }}
                  className="flex-row items-center justify-between bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl"
                >
                  <Text className="text-gray-800 font-medium">
                    {selectedClass ? `${selectedClass.courseName} (Sec ${selectedClass.section})` : "Select Course..."}
                  </Text>
                  <Ionicons
                    name={isClassDropdownOpen ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#6b7280"
                  />
                </Pressable>

                {isClassDropdownOpen && (
                  <View className="mt-2 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    {classesList.map((cls, index) => (
                      <Pressable
                        key={cls.id}
                        onPress={() => {
                          setSelectedClass(cls);
                          setClassDropdownOpen(false);
                        }}
                        className={`px-4 py-3 flex-row justify-between items-center ${
                          index !== classesList.length - 1
                            ? "border-b border-gray-100"
                            : ""
                        } ${selectedClass?.id === cls.id ? "bg-indigo-50/50" : "bg-white"}`}
                      >
                        <Text
                          className={`font-medium flex-1 ${
                            selectedClass?.id === cls.id
                              ? "text-indigo-600"
                              : "text-gray-700"
                          }`}
                        >
                          {cls.courseName} (Sec {cls.section})
                        </Text>
                        {selectedClass?.id === cls.id && (
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
          )}

          {/* For Representative, statically show their org without dropdown */}
          {loggedInUser?.role !== "ADMIN" && selectedClass && (
             <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-1.5 shrink-0">
                  Course & Section
                </Text>
                <View className="bg-gray-100 border border-gray-200 px-4 py-3 rounded-xl">
                   <Text className="text-gray-800 font-medium opacity-60">
                     {selectedClass.courseName} (Sec {selectedClass.section})
                   </Text>
                </View>
             </View>
          )}

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

        {students.length > 0 && (
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
        )}
      </ScrollView>

      <View className="px-4 py-4 bg-white border-t border-gray-100 pb-8 rounded-t-3xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <TouchableOpacity
          onPress={handleCreateSession}
          disabled={isSubmitting}
          activeOpacity={0.8}
          className={`rounded-xl py-4 flex-row items-center justify-center gap-x-2 shadow-sm ${isSubmitting ? 'bg-indigo-400' : 'bg-indigo-600'}`}
        >
          <Text className="text-white font-bold text-lg">
            {isSubmitting ? "Initiating..." : "Initiate Session"}
          </Text>
          {!isSubmitting && <Ionicons name="arrow-forward" size={20} color="#fff" />}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

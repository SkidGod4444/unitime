import { useAuth } from "@/contexts/auth.cntxt";
import { useOrgsStore, useProfilesStore, useUsersStore } from "@/lib/store";
import { useCoursesStore } from "@/lib/store/courses";
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    Switch,
    Text,
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

export default function ManageOrgCoursesScreen() {
  const { loggedInUser } = useAuth();
  const { profiles, fetchProfiles } = useProfilesStore();
  const { users } = useUsersStore();
  const { courses, updateCourse } = useCoursesStore();
  const { orgs, fetchOrgs } = useOrgsStore();
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);

  const loadData = useCallback(async () => {
    if (!loggedInUser) return;
    try {
      // Data should ideally be loaded by the main layouts before hitting here, 
      // but if not, we can ensure profiles are ready for organization matching
      if (profiles.length === 0) {
        await fetchProfiles();
      }
      if (orgs.length === 0) {
        await fetchOrgs();
      }
      
      const currentProfiles = useProfilesStore.getState().profiles;
      const userProfile = currentProfiles.find((p) => p.userId === loggedInUser.id);
      const organizationId = userProfile?.organizationId || null;

      // We read from the zustand store so the data flow remains central
      const currentCourses = useCoursesStore.getState().courses;
      
      let orgCourses = currentCourses;
      if (organizationId) {
        orgCourses = currentCourses.filter((c: any) => c.organizationId === organizationId);
      } else if (loggedInUser.role !== 'ADMIN') {
        // Representatives without an org shouldn't see anything. Super Admins see all.
        orgCourses = [];
      }
      
      setFilteredCourses(orgCourses);
    } catch (e) {
      console.error("Failed to load generic org courses:", e);
    } finally {
      setRefreshing(false);
    }
  }, [loggedInUser, fetchProfiles, profiles.length, fetchOrgs, orgs.length]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleEnrollment = async (courseId: string, currentStatus: boolean) => {
    try {
      setActionLoadingId(courseId + "_toggle");
      
      const course = courses.find((c) => c.id === courseId);
      if(!course) return;

      // The store's updateCourse requires multiple fields so we pull from the course object.
      // We pass the negated enrollmentEnabled.
      await updateCourse(courseId, {
         // @ts-ignore
         ...course, 
         enrollmentEnabled: !currentStatus
      });
      
      // Update local state directly for snappy optimistic response
      setFilteredCourses(prev => prev.map(c => 
        c.id === courseId ? { ...c, enrollmentEnabled: !currentStatus } as Course : c
      ));
      
      Alert.alert("Success", `Enrollment is now ${!currentStatus ? 'open' : 'closed'} for ${course.code}.`);
    } catch {
      Alert.alert("Error", "Could not update course settings. Please try again.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const renderItem = ({ item }: { item: Course }) => {
    // Type casting because the base Course type from timetable.ts might not have this field declared depending on earlier edits
    const isEnrollmentOpen = (item as any).enrollmentEnabled ?? true;
    
    const professor = item.professorId ? users.find(u => u.id === item.professorId) : null;
    const org = item.organizationId ? orgs.find((o: any) => o.id === item.organizationId) : null;
    const rawSemester = org ? org.semester : (item as any).semester; // Fallback to item.semester just in case it's populated from backend
    const semesterDisplay = rawSemester ? (SEMESTER_MAP[rawSemester] || rawSemester) : "N/A";

    const typeLabel = item.classType || "LECTURE";
    const typeColor = CLASS_TYPE_COLORS[typeLabel] || "bg-gray-100 text-gray-800";

    return (
      <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-4">
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1 pr-4">
            <Text className="text-lg font-bold text-gray-900 mb-1" numberOfLines={2}>
              {item.name}
            </Text>
            <View className="flex-row items-center gap-2 mb-2">
              <Text className="text-sm font-semibold text-indigo-600">
                {item.code}
              </Text>
              <View className="w-1 h-1 rounded-full bg-gray-300" />
              <View className={`px-2 py-0.5 rounded-md ${typeColor.split(' ')[0]}`}>
                <Text className={`text-[10px] font-bold ${typeColor.split(' ')[1]}`}>
                  {typeLabel}
                </Text>
              </View>
              <View className="w-1 h-1 rounded-full bg-gray-300" />
              <Text className="text-xs font-medium text-gray-500">
                  {semesterDisplay}
              </Text>
            </View>
          </View>
        </View>

        <View className="flex-row flex-wrap gap-4 mb-4">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="person-outline" size={14} color="#6b7280" />
            <Text className="text-sm font-medium text-gray-700">
              {professor ? professor.name : "Unassigned"}
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="star-outline" size={14} color="#6b7280" />
            <Text className="text-sm font-medium text-gray-700">
              {item.credit ? `${item.credit} Credits` : "N/A"}
            </Text>
          </View>
        </View>

        <View className={`p-4 rounded-2xl border flex-row justify-between items-center ${isEnrollmentOpen ? 'bg-indigo-50 border-indigo-100' : 'bg-gray-50 border-gray-100'}`}>
           <View className="flex-1 pr-4">
             <Text className="text-sm font-bold text-gray-800 mb-0.5">Enrollment</Text>
             <Text className="text-xs text-gray-500">
               {isEnrollmentOpen ? 'Students can request to join this course.' : 'Enrollment is currently closed.'}
             </Text>
           </View>
           <View className="items-end">
             {actionLoadingId === item.id + "_toggle" ? (
               <ActivityIndicator color="#4f46e5" size="small" className="mr-2" />
             ) : (
               <Switch
                  value={isEnrollmentOpen}
                  onValueChange={() => toggleEnrollment(item.id, isEnrollmentOpen)}
                  trackColor={{ false: "#d1d5db", true: "#c7d2fe" }}
                  thumbColor={isEnrollmentOpen ? "#4f46e5" : "#fbfbfc"}
                />
             )}
             <Text className={`text-[10px] font-bold mt-1 uppercase ${isEnrollmentOpen ? 'text-indigo-600' : 'text-gray-400'}`}>
               {isEnrollmentOpen ? 'Open' : 'Closed'}
             </Text>
           </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Stack.Screen
        options={{
          headerTitle: "Organization Courses",
          headerTitleStyle: { fontFamily: "Lora-Bold", fontSize: 20 },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "#f9fafb" },
        }}
      />
      
      <FlatList
        data={filteredCourses}
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
            <View className="items-center py-20 px-4 flex-1 justify-center">
              <View className="h-20 w-20 bg-gray-100 rounded-full justify-center items-center mb-4">
                <Ionicons name="school-outline" size={40} color="#9ca3af" />
              </View>
              <Text className="text-lg font-bold text-gray-800 text-center mb-2">
                No Courses Found
              </Text>
              <Text className="text-gray-500 text-center text-sm px-6">
                Your organization does not have any courses set up yet.
              </Text>
            </View>
          }
          renderItem={renderItem}
        />
    </SafeAreaView>
  );
}

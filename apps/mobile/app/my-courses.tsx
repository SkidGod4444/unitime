import { useAuth } from "@/contexts/auth.cntxt";
import { useStore } from "@/contexts/store.cntxt";
import { useCoursesStore, useOrgsStore, useProfilesStore } from "@/lib/store";
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
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const userProfile = profiles.find((p) => p.userId === loggedInUser?.id);
  const organizationId = userProfile?.organizationId;

  const filteredCourses = React.useMemo(() => {
    if (!organizationId) return [];
    return courses.filter((c) => c.organizationId === organizationId);
  }, [courses, organizationId]);

  const handleEnroll = async (courseId: string) => {
    try {
      setActionLoadingId(courseId);
      const origin = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
      const res = await fetch(`${origin}/courses/${courseId}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: loggedInUser?.id }),
      });
      
      if (!res.ok) throw new Error("Failed to enroll");
      
      Alert.alert("Success", "Enrollment request sent. Waiting for approval.");
      fetchCourses();
    } catch {
      Alert.alert("Error", "Could not enroll. Please try again.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeEnroll = async (courseId: string, status?: string) => {
    const isPending = status === 'PENDING';
    Alert.alert(
      isPending ? "Cancel Request" : "Remove Course",
      isPending ? "Are you sure you want to cancel your enrollment request for this course?" : "Are you sure you want to de-enroll from this course?",
      [
        { text: "No", style: "cancel" },
        {
          text: isPending ? "Yes, Cancel" : "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoadingId(courseId);
              const origin = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
              const res = await fetch(`${origin}/courses/${courseId}/enroll`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: loggedInUser?.id }),
              });
              
              if (!res.ok) throw new Error(isPending ? "Failed to cancel request" : "Failed to de-enroll");
              
              Alert.alert("Success", isPending ? "Your enrollment request has been cancelled." : "You have been removed from the course.");
              fetchCourses();
            } catch {
              Alert.alert("Error", isPending ? "Could not cancel request. Please try again." : "Could not de-enroll. Please try again.");
            } finally {
              setActionLoadingId(null);
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: Course }) => {
    const userEnrollment = (item as any).users?.find((u: any) => u.userId === loggedInUser?.id);
    const org = item.organizationId ? orgs.find((o: any) => o.id === item.organizationId) : null;
    
    const isEnrollmentOpen = item.enrollmentEnabled ?? true;

    const rawSemester = org?.semester || (item as any).semester;
    const semesterDisplay = rawSemester ? (SEMESTER_MAP[rawSemester] || rawSemester) : null;
    const typeLabel = item.classType || "LECTURE";
    const typeColor = CLASS_TYPE_COLORS[typeLabel] || "bg-gray-100 text-gray-800";

    return (
      <View className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-5">
        {/* Course Header */}
        <View className="flex-row items-start justify-between mb-5">
          <View className="flex-row flex-1 mr-3">
             <View className="h-12 w-12 bg-indigo-50 rounded-2xl justify-center items-center mr-3 mt-1">
               <Ionicons name="book" size={22} color="#4f46e5" />
             </View>
             <View className="flex-1 pr-1">
               <Text className="text-lg font-bold text-gray-900 mb-1 leading-6" numberOfLines={2}>
                 {item.name}
               </Text>
               <View className="flex-row flex-wrap items-center gap-2">
                 <Text className="text-sm font-bold text-indigo-600">
                   {item.code}
                 </Text>
                 <View className="w-1 h-1 rounded-full bg-gray-300" />
                 <View className={`px-2 py-0.5 rounded-md ${typeColor.split(' ')[0]}`}>
                   <Text className={`text-[10px] font-bold ${typeColor.split(' ')[1]}`}>
                     {typeLabel}
                   </Text>
                 </View>
               </View>
             </View>
          </View>
          
          {userEnrollment ? (
            <View className={`px-2.5 py-1 rounded-lg border ${userEnrollment.status === 'APPROVED' ? 'bg-green-50 border-green-200' : userEnrollment.status === 'PENDING' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
              <Text className={`text-[10px] font-bold uppercase ${userEnrollment.status === 'APPROVED' ? 'text-green-700' : userEnrollment.status === 'PENDING' ? 'text-amber-700' : 'text-red-700'}`}>
                {userEnrollment.status === 'APPROVED' ? 'Enrolled' : userEnrollment.status}
              </Text>
            </View>
          ) : isEnrollmentOpen ? (
            <View className="bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg">
              <Text className="text-[10px] font-bold text-gray-500 uppercase">Available</Text>
            </View>
          ) : (
            <View className="bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-lg">
              <Text className="text-[10px] font-bold text-gray-400 uppercase">Closed</Text>
            </View>
          )}
        </View>

        {/* Detailed Grid Info */}
        <View className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-5 flex-row flex-wrap justify-between items-center gap-y-3">
            <View className="flex-row items-center w-[48%]">
              <View className="w-7 h-7 rounded-full bg-white items-center justify-center mr-2 shadow-sm border border-gray-100">
                <Ionicons name="business" size={12} color="#4b5563" />
              </View>
              <Text className="text-xs text-gray-700 font-bold flex-1" numberOfLines={1}>
                {org ? org.departmentName : 'No Dept'}
              </Text>
            </View>
            
            <View className="flex-row items-center w-[48%] pl-2">
              <View className="w-7 h-7 rounded-full bg-white items-center justify-center mr-2 shadow-sm border border-gray-100">
                <Ionicons name="calendar" size={12} color="#4b5563" />
              </View>
              <Text className="text-xs text-gray-700 font-bold flex-1" numberOfLines={1}>
                {semesterDisplay || 'N/A'}
              </Text>
            </View>

            <View className="flex-row items-center w-[48%]">
              <View className="w-7 h-7 rounded-full bg-white items-center justify-center mr-2 shadow-sm border border-gray-100">
                <Ionicons name="grid" size={12} color="#4b5563" />
              </View>
              <Text className="text-xs text-gray-700 font-bold flex-1" numberOfLines={1}>
                {org ? `Sec ${org.section}` : 'N/A'}
              </Text>
            </View>
            
            <View className="flex-row items-center w-[48%] pl-2">
              <View className="w-7 h-7 rounded-full bg-white items-center justify-center mr-2 shadow-sm border border-gray-100">
                <Ionicons name="star" size={12} color="#4b5563" />
              </View>
              <Text className="text-xs text-gray-700 font-bold flex-1" numberOfLines={1}>
                {item.credit ? `${item.credit} Credits` : 'No Credits'}
              </Text>
            </View>
        </View>

        {/* Actions */}
        <View className="flex-row gap-3">
          {userEnrollment ? (
            userEnrollment.status === 'REJECTED' ? (
              <View className="flex-1 py-3.5 rounded-xl border border-red-200 bg-red-50 flex-row justify-center items-center gap-2">
                <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
                <Text className="text-red-700 font-bold">Enrollment Rejected</Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => handleDeEnroll(item.id, userEnrollment.status)}
                disabled={actionLoadingId === item.id}
                className="flex-1 py-3.5 rounded-xl border border-red-200 bg-red-50 flex-row justify-center items-center gap-2"
              >
                {actionLoadingId === item.id ? (
                  <ActivityIndicator color="#ef4444" size="small" />
                ) : (
                  <>
                    <Ionicons name={userEnrollment.status === 'PENDING' ? "close-circle-outline" : "log-out-outline"} size={18} color="#ef4444" />
                    <Text className="text-red-600 font-bold">
                      {userEnrollment.status === 'PENDING' ? "Cancel Request" : "Opt-Out"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )
          ) : isEnrollmentOpen ? (
            <TouchableOpacity
              onPress={() => handleEnroll(item.id)}
              disabled={actionLoadingId === item.id}
              className="flex-1 py-3.5 rounded-xl border border-transparent bg-indigo-600 flex-row justify-center items-center gap-2"
            >
              {actionLoadingId === item.id ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={18} color="#fff" />
                  <Text className="text-white font-bold">Enroll in Course</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View className="flex-1 py-3.5 rounded-xl border border-gray-200 bg-gray-50 flex-row justify-center items-center gap-2">
              <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" />
              <Text className="text-gray-500 font-bold">Enrollment Closed</Text>
            </View>
          )}
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
            Explore & Enroll
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
          contentContainerStyle={{ paddingBottom: 100 }}
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
              <View className="h-20 w-20 bg-gray-100 rounded-full justify-center items-center mb-4">
                <Ionicons name="book-outline" size={40} color="#9ca3af" />
              </View>
              <Text className="text-lg font-bold text-gray-800 text-center mb-2">
                No Courses Found
              </Text>
              <Text className="text-gray-500 text-center text-sm px-6">
                There are no courses available for enrollment right now.
              </Text>
            </View>
          }
          renderItem={renderItem}
        />
      )}
    </SafeAreaView>
  );
}

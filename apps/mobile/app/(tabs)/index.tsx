import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Index() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView 
        className="flex-1 px-5" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100, gap: 32 }}
      >
        {/* Header Section */}
        <View className="flex-row justify-between items-center mt-4">
          <View className="flex-row items-center gap-3">
            <View className="h-12 w-12 rounded-full bg-gray-200 justify-center items-center overflow-hidden">
                <Image 
                    source={{ uri: "https://i.pravatar.cc/150?img=68" }} 
                    className="h-full w-full"
                />
            </View>
            <View>
              <Text className="text-gray-500 font-medium text-sm">Welcome back,</Text>
              <Text className="text-dark font-lora font-bold text-xl">Alex Johnson</Text>
            </View>
          </View>
          <TouchableOpacity className="bg-white p-2.5 rounded-full shadow-sm border border-gray-100">
            <Ionicons name="notifications-outline" size={24} color="#18181B" />
            <View className="absolute top-2 right-2.5 h-2 w-2 bg-red-500 rounded-full border border-white" />
          </TouchableOpacity>
        </View>

        {/* Status Overview Cards */}
        <View className="flex-row justify-between gap-4">
          {/* Attendance Card */}
          <View className="flex-1 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
             <View className="absolute right-0 top-0 opacity-5">
                <Ionicons name="school" size={80} color="#2563EB" />
             </View>
             <View className="flex-row items-center mb-2">
                <View className="bg-blue-50 p-1.5 rounded-lg mr-2">
                    <Ionicons name="pie-chart-outline" size={18} color="#2563EB" />
                </View>
                <Text className="text-gray-600 font-medium text-xs uppercase tracking-wider">Attendance</Text>
             </View>
             <Text className="text-3xl font-bold text-dark mb-1">85%</Text>
             <View className="flex-row items-center">
                <View className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                    <View className="h-full w-[85%] bg-blue-600 rounded-full" />
                </View>
             </View>
             <Text className="text-xs text-gray-400 mt-2">Target: 75%</Text>
          </View>

          {/* Assignments Card */}
          <View className="flex-1 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
             <View className="absolute right-0 top-0 opacity-5">
                <Ionicons name="document-text" size={80} color="#EA580C" />
             </View>
             <View className="flex-row items-center mb-2">
                <View className="bg-orange-50 p-1.5 rounded-lg mr-2">
                    <Ionicons name="alert-circle-outline" size={18} color="#EA580C" />
                </View>
                <Text className="text-gray-600 font-medium text-xs uppercase tracking-wider">Pending</Text>
             </View>
             <Text className="text-3xl font-bold text-dark mb-1">3</Text>
             <Text className="text-xs text-gray-500 mb-2">Assignments due</Text>
             <TouchableOpacity className="flex-row items-center gap-1">
                <Text className="text-orange-600 font-medium text-xs">View all</Text>
                <Feather name="arrow-right" size={12} color="#EA580C" />
             </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions Grid */}
        <View>
            <Text className="text-lg font-bold text-dark mb-4 font-lora">Quick Actions</Text>
            <View className="flex-row flex-wrap justify-between gap-y-4">
                {[
                    { icon: "scan-outline", label: "Scan QR", color: "text-blue-600", bg: "bg-blue-50", route: "/qr-scanner" },
                    { icon: "calendar-outline", label: "Timetable", color: "text-purple-600", bg: "bg-purple-50", route: "/auth" },
                    { icon: "trophy-outline", label: "Results", color: "text-yellow-600", bg: "bg-yellow-50", route: "/results" },
                    { icon: "calendar-number-outline", label: "Events", color: "text-rose-600", bg: "bg-rose-50", route: "/events" },
                ].map((action, index) => (
                    <TouchableOpacity 
                        key={index} 
                        className="w-[48%] bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex-row items-center gap-3"
                        onPress={() => action.route && router.push(action.route as any)}
                    >
                        <View className={`h-10 w-10 ${action.bg} rounded-full justify-center items-center`}>
                            <Ionicons name={action.icon as any} size={20} className={action.color} style={{color: action.color === 'text-blue-600' ? '#2563EB' : action.color === 'text-purple-600' ? '#9333EA' : action.color === 'text-yellow-600' ? '#CA8A04' : '#E11D48'}} />
                        </View>
                        <Text className="font-semibold text-gray-700">{action.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>

        {/* Today's Schedule */}
        <View>
            <View className="flex-row justify-between items-center mb-4">
                <Text className="text-lg font-bold text-dark font-lora">Today&apos;s Schedule</Text>
                <TouchableOpacity>
                    <Text className="text-primary text-sm font-medium">See All</Text>
                </TouchableOpacity>
            </View>
            
            <View className="gap-4">
                {[
                    { time: "09:00 AM", subject: "Mathematics", room: "Room 302", status: "Upcoming", color: "border-l-blue-500" },
                    { time: "10:30 AM", subject: "Physics", room: "Lab 2", status: "Upcoming", color: "border-l-green-500" },
                    { time: "01:00 PM", subject: "Computer Science", room: "Lab 1", status: "Upcoming", color: "border-l-purple-500" },
                ].map((item, index) => (
                    <View key={index} className={`bg-white p-4 rounded-xl border-l-4 ${item.color} shadow-sm flex-row justify-between items-center border border-gray-100`}>
                        <View className="flex-1">
                            <Text className="text-xs text-gray-500 font-medium mb-1">{item.time}</Text>
                            <Text className="text-base font-bold text-dark">{item.subject}</Text>
                            <View className="flex-row items-center mt-1 gap-1">
                                <Ionicons name="location-outline" size={12} color="#6B7280" />
                                <Text className="text-xs text-gray-500">{item.room}</Text>
                            </View>
                        </View>
                        <View className="bg-gray-50 px-3 py-1 rounded-full">
                            <Text className="text-xs font-medium text-gray-600">{item.status}</Text>
                        </View>
                    </View>
                ))}
            </View>
        </View>
      </ScrollView>
    </SafeAreaView>  );
}

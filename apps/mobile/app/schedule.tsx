import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
    FlatList,
    Modal,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import Animated, {
    FadeInDown,
    Layout,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

// --- Types ---

type ClassSession = {
  id: string;
  courseCode: string;
  courseName: string;
  startTime: string;
  endTime: string;
  location: string;
  professor: string;
  type: "Lecture" | "Lab" | "Tutorial";
  color: string;
};

// --- Dummy Data ---

const SAMPLE_CLASSES: ClassSession[] = [
  {
    id: "1",
    courseCode: "CS101",
    courseName: "Intro to Computer Science",
    startTime: "09:00",
    endTime: "10:30",
    location: "Hall A",
    professor: "Dr. Smith",
    type: "Lecture",
    color: "#6366f1", // Indigo
  },
  {
    id: "2",
    courseCode: "MATH202",
    courseName: "Linear Algebra",
    startTime: "11:00",
    endTime: "12:30",
    location: "Room 304",
    professor: "Prof. Johnson",
    type: "Lecture",
    color: "#ec4899", // Pink
  },
  {
    id: "3",
    courseCode: "PHY101",
    courseName: "Physics Lab",
    startTime: "14:00",
    endTime: "16:00",
    location: "Lab 2",
    professor: "Dr. Brown",
    type: "Lab",
    color: "#10b981", // Emerald
  },
];

// --- Date Utilities (Native) ---

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatDate = (date: Date, formatStr: string) => {
  if (formatStr === "MMMM yyyy") {
    return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
  }
  if (formatStr === "EEE") {
    return DAY_NAMES[date.getDay()];
  }
  if (formatStr === "d") {
    return date.getDate().toString();
  }
  if (formatStr === "EEE, MMMM d") {
      return `${DAY_NAMES[date.getDay()]}, ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
  }
  return date.toDateString();
};

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const isSameDay = (d1: Date, d2: Date) => {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

const getDaysInMonth = (month: number, year: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (month: number, year: number) => {
  return new Date(year, month, 1).getDay();
};

const generateDates = (startDate: Date, days: number = 14) => {
  const dates = [];
  for (let i = 0; i < days; i++) {
    dates.push(addDays(startDate, i));
  }
  return dates;
};

// --- Components ---

const Header = ({
  onCalendarPress,
  selectedDate,
}: {
  onCalendarPress: () => void;
  selectedDate: Date;
}) => {
  return (
    <View className="flex-row items-center justify-between px-6 pt-2 pb-4">
      <View>
        <Text className="text-sm font-medium text-gray-500 uppercase tracking-wider">
          {formatDate(selectedDate, "MMMM yyyy")}
        </Text>
        <Text className="text-3xl font-bold text-gray-900 dark:text-white">
          Schedule
        </Text>
      </View>
      <TouchableOpacity
        onPress={onCalendarPress}
        className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full active:opacity-70"
      >
        <Ionicons name="calendar-outline" size={24} color="#374151" />
      </TouchableOpacity>
    </View>
  );
};

const DateItem = ({
  date,
  isSelected,
  onSelect,
}: {
  date: Date;
  isSelected: boolean;
  onSelect: (date: Date) => void;
}) => {
  return (
    <TouchableOpacity
      onPress={() => onSelect(date)}
      className={`mr-3 items-center justify-center rounded-2xl ${
        isSelected ? "bg-black dark:bg-white" : "bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800"
      } shadow-sm`}
      style={{
           width: 70,
           height: 85,
      }}
    >
      <Text
        className={`text-xs font-medium mb-1 ${
          isSelected ? "text-gray-300 dark:text-gray-600" : "text-gray-400"
        }`}
      >
        {formatDate(date, "EEE")}
      </Text>
      <Text
        className={`text-xl font-bold ${
          isSelected ? "text-white dark:text-black" : "text-gray-900 dark:text-white"
        }`}
      >
        {formatDate(date, "d")}
      </Text>
      {isSelected && (
          <View className="mt-1 w-1 h-1 rounded-full bg-white dark:bg-black" />
      )}
    </TouchableOpacity>
  );
};

const ClassCard = ({ session, index }: { session: ClassSession; index: number }) => {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100)}
      layout={Layout.springify()}
      className="mb-4"
    >
      <View className="flex-row">
        {/* Time Column */}
        <View className="w-20 items-end pr-3 pt-1">
          <Text className="text-gray-900 dark:text-white font-bold text-base">
            {session.startTime}
          </Text>
          <Text className="text-gray-400 text-xs">{session.endTime}</Text>
          {/* Vertical Line */}
           <View className="absolute right-[-6px] top-8 bottom-[-20px] w-[2px] bg-gray-100 dark:bg-gray-800 rounded-full" />
           <View
              className="absolute right-[-10px] top-2 w-[10px] h-[10px] rounded-full border-2 border-white dark:border-black"
              style={{ backgroundColor: session.color }}
           />
        </View>

        {/* Card Content */}
        <View className="flex-1">
          <View
            className="p-4 rounded-3xl bg-white dark:bg-gray-900 shadow-sm border-l-4 active:scale-95 transition-transform"
            style={{ borderLeftColor: session.color }}
          >
            <View className="flex-row justify-between items-start mb-2">
              <View className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">
                <Text style={{ color: session.color }} className="text-xs font-bold uppercase tracking-wider">
                  {session.courseCode} • {session.type}
                </Text>
              </View>
              <Ionicons name="ellipsis-horizontal" size={20} color="#9ca3af" />
            </View>
            
            <Text className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              {session.courseName}
            </Text>

            <View className="flex-row items-center gap-4 mt-2">
              <View className="flex-row items-center gap-1">
                <Ionicons name="location-outline" size={14} color="#6b7280" />
                <Text className="text-gray-500 text-sm">{session.location}</Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Ionicons name="person-outline" size={14} color="#6b7280" />
                <Text className="text-gray-500 text-sm">{session.professor}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const CustomCalendar = ({
  selectedDate,
  onSelect,
  onClose,
}: {
  selectedDate: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));

  const daysInMonth = getDaysInMonth(currentMonth.getMonth(), currentMonth.getFullYear());
  const firstDay = getFirstDayOfMonth(currentMonth.getMonth(), currentMonth.getFullYear());

  const daysResult = [];
  // Empty slots for previous month
  for (let i = 0; i < firstDay; i++) {
    daysResult.push(null);
  }
  // Days of current month
  for (let i = 1; i <= daysInMonth; i++) {
    daysResult.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
  }

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  return (
      <View className="p-6">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
            <Text className="text-xl font-bold dark:text-white">Select Date</Text>
            <TouchableOpacity onPress={onClose} className="p-1">
                <Ionicons name="close-circle" size={28} color="#d1d5db" />
            </TouchableOpacity>
        </View>

        {/* Month Navigation */}
        <View className="flex-row justify-between items-center mb-4 px-2">
            <TouchableOpacity onPress={handlePrevMonth} className="p-2">
                <Ionicons name="chevron-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="text-lg font-semibold dark:text-white">
                {formatDate(currentMonth, "MMMM yyyy")}
            </Text>
            <TouchableOpacity onPress={handleNextMonth} className="p-2">
                <Ionicons name="chevron-forward" size={24} color="#374151" />
            </TouchableOpacity>
        </View>

        {/* Days Header */}
        <View className="flex-row justify-around mb-2">
            {DAY_NAMES.map((day) => (
                <Text key={day} className="text-gray-400 font-medium w-10 text-center">
                    {day}
                </Text>
            ))}
        </View>

        {/* Grid */}
        <View className="flex-row flex-wrap">
            {daysResult.map((date, index) => {
                if (!date) {
                    return <View key={`empty-${index}`} className="w-[14.28%] h-12" />;
                }
                const isSelected = isSameDay(date, selectedDate);
                // Check if date is today (optional visual cue)
                const isToday = isSameDay(date, new Date());

                return (
                    <TouchableOpacity
                        key={date.toISOString()}
                        className="w-[14.28%] h-12 items-center justify-center"
                        onPress={() => onSelect(date)}
                    >
                        <View className={`w-10 h-10 items-center justify-center rounded-full ${isSelected ? "bg-black dark:bg-white" : isToday ? "bg-gray-100 dark:bg-gray-800" : ""}`}>
                            <Text className={`font-medium ${isSelected ? "text-white dark:text-black" : isToday ? "text-black dark:text-white font-bold" : "text-gray-900 dark:text-white"}`}>
                                {date.getDate()}
                            </Text>
                        </View>
                    </TouchableOpacity>
                );
            })}
        </View>
    </View>
  );
};


// --- Main Screen ---

export default function ScheduleScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dates, setDates] = useState(generateDates(new Date(), 14));
  const [isCalendarOpen, setCalendarOpen] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Filter classes for selected date (Mock logic: just show sample classes for today/any selected date for now)
  // In a real app, you'd filter `classes.filter(c => isSameDay(c.date, selectedDate))`
  const todaysClasses = SAMPLE_CLASSES; 

  // Ensure scrolling works reliably
  const getItemLayout = (data: any, index: number) => ({
    length: 82, // width 70 + margin 12 (approx)
    offset: 82 * index,
    index,
  });

  useEffect(() => {
    // Sync Scroll
    const index = dates.findIndex((d) => isSameDay(d, selectedDate));
    if (index !== -1 && flatListRef.current) {
        flatListRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    }
  }, [selectedDate, dates]);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleCalendarSelect = (date: Date) => {
    setSelectedDate(date);
    setCalendarOpen(false);
    
    // Check if new date is visible in current strip
    const index = dates.findIndex(d => isSameDay(d, date));
    
    // If not found or near edge, regenerate strip
    // Let's just always center the new date for better UX
    // generate 14 days, starting 3 days before selected
    const newStartDate = addDays(date, -3);
    setDates(generateDates(newStartDate, 14));
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black">
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View>
          <Header
            selectedDate={selectedDate}
            onCalendarPress={() => setCalendarOpen(true)} 
          />
      </View>

      {/* Date Strip */}
      <View className="mb-6">
        <FlatList
          ref={flatListRef}
          data={dates}
          keyExtractor={(item) => item.toISOString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24 }}
          getItemLayout={getItemLayout}
          onScrollToIndexFailed={(info) => {
              // Fallback if scroll fails (e.g. data reference issues)
              flatListRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
          }}
          renderItem={({ item }) => (
            <DateItem
              date={item}
              isSelected={isSameDay(item, selectedDate)}
              onSelect={handleDateSelect}
            />
          )}
        />
      </View>

      {/* Class List (Timeline) */}
      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <Text className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            {isSameDay(selectedDate, new Date()) ? "Today's Schedule" : `${formatDate(selectedDate, "EEE, MMMM d")}`}
        </Text>
        
        {todaysClasses.map((session, index) => (
          <ClassCard key={session.id} session={session} index={index} />
        ))}
        
        {/* Start of Empty/End State */}
        <View className="items-center py-10 opacity-50">
            <Ionicons name="bed-outline" size={48} color="#9ca3af" />
            <Text className="text-gray-400 mt-2">No more classes</Text>
        </View>

      </ScrollView>

      {/* Calendar Modal Overlay */}
      <Modal
        visible={isCalendarOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setCalendarOpen(false)}
      >
        <TouchableOpacity 
            className="flex-1 bg-black/50 justify-center items-center px-6" 
            activeOpacity={1} 
            onPress={() => setCalendarOpen(false)}
        >
            <TouchableOpacity 
                activeOpacity={1} 
                onPress={(e) => e.stopPropagation()}
                className="w-full bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl"
                style={{ zIndex: 10, maxHeight: '70%' }}
            >
               <CustomCalendar 
                    selectedDate={selectedDate} 
                    onSelect={handleCalendarSelect} 
                    onClose={() => setCalendarOpen(false)} 
               />
            </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

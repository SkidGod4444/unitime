import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// Define the API types based on what the Hono backend returns
export type Course = {
  id: string;
  code: string;
  name: string;
  credit: number;
  description: string | null;
  professorId: string | null;
  type: string;
  status: string;
  semester: string;
  classType: string;
};

export type TimetableEntry = {
  id: string;
  courseId: string;
  day: string;
  startTime: string; // ISO Date String
  endTime: string; // ISO Date String
  location: string | null;
  course?: Course;
};

type TimetablesState = {
  timetables: TimetableEntry[];
  setTimetables: (timetables: TimetableEntry[]) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  fetchTimetable: (userId: string, day?: string) => Promise<void>;
};

export const useTimetableStore = create<TimetablesState>()(
  persist(
    (set) => ({
      timetables: [],
      loading: false,
      error: null,
      setTimetables: (timetables) => set({ timetables }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      fetchTimetable: async (userId, day) => {
        set({ loading: true, error: null });
        try {
          const origin = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/v1";
          let url = `${origin}/timetable/${userId}`;
          if (day) {
            url += `?day=${encodeURIComponent(day)}`;
          }
          
          const res = await fetch(url);
          const data = await res.json();
          
          if (res.ok && data.success) {
            set({ timetables: data.timetables });
          } else {
            console.error("Failed to fetch timetable:", data);
            set({ error: "Failed to fetch timetable" });
          }
        } catch (error) {
           console.error("Error fetching timetable:", error);
           set({ error: "Network error fetching timetable" });
        } finally {
          set({ loading: false });
        }
      }
    }),
    {
      name: "timetable-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

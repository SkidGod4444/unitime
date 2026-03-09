import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

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
  organizationId: string | null;
  enrollmentEnabled?: boolean;
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
  weekTimetable: Record<string, TimetableEntry[]>;
  setTimetables: (timetables: TimetableEntry[]) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  fetchTimetable: (userId: string, day?: string) => Promise<void>;
  fetchWeekTimetable: (userId: string) => Promise<void>;
  createTimetableEntry: (
    token: string,
    entry: Omit<TimetableEntry, "id" | "course"> & { labGroupId?: string },
  ) => Promise<boolean>;
  deleteTimetableEntry: (token: string, id: string) => Promise<boolean>;
};

export const useTimetableStore = create<TimetablesState>()(
  persist(
    (set) => ({
      timetables: [],
      weekTimetable: {},
      loading: false,
      error: null,
      setTimetables: (timetables) => set({ timetables }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      fetchTimetable: async (userId, day) => {
        set({ loading: true, error: null });
        try {
          const origin =
            process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/v1";
          let url = `${origin}/timetable/${userId}`;
          if (day) {
            url += `?day=${encodeURIComponent(day)}`;
          }

          const res = await fetch(url);
          const data = await res.json();

          if (res.ok && data.success) {
            set({ timetables: data.timetables });
          } else if (res.status === 404 || data?.status_code === 404) {
            set({ timetables: [] });
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
      },
      fetchWeekTimetable: async (userId) => {
        set({ loading: true, error: null });
        try {
          const origin =
            process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/v1";
          const res = await fetch(`${origin}/timetable/week/${userId}`);
          const data = await res.json();

          if (res.ok && data.success) {
            set({ weekTimetable: data.week });
          } else if (res.status === 404 || data?.status_code === 404) {
            set({ weekTimetable: {} });
          } else {
            set({ error: "Failed to fetch weekly timetable" });
          }
        } catch (error) {
          console.error("Error fetching weekly timetable:", error);
          set({ error: "Network error fetching weekly timetable" });
        } finally {
          set({ loading: false });
        }
      },
      createTimetableEntry: async (token, entry) => {
        set({ loading: true, error: null });
        try {
          const origin =
            process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/v1";
          const res = await fetch(`${origin}/timetable`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(entry),
          });
          const data = await res.json();
          set({ loading: false });
          return res.ok && data.success;
        } catch (error) {
          console.error("Error creating timetable entry:", error);
          set({ loading: false, error: "Network error creating entry" });
          return false;
        }
      },
      deleteTimetableEntry: async (token, id) => {
        set({ loading: true, error: null });
        try {
          const origin =
            process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/v1";
          const res = await fetch(`${origin}/timetable/${id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          const data = await res.json();
          set({ loading: false });
          return res.ok && data.success;
        } catch (error) {
          console.error("Error deleting timetable entry:", error);
          set({ loading: false, error: "Network error deleting entry" });
          return false;
        }
      },
    }),
    {
      name: "timetable-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

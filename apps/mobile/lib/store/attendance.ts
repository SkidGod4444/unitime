import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { withAuth } from "@/lib/api";
import { createJSONStorage, persist } from "zustand/middleware";
import { getAuthToken } from "@/lib/auth.token";

export type AttendanceSummary = {
  courseId: string;
  courseName: string;
  courseCode: string;
  attended: number;
  total: number;
  percentage: number;
};

export type AttendanceSession = {
  id: string;
  date: string;
  courseCode: string;
  courseName: string;
  classId: string;
  className: string;
  section: string;
  durationMin: number;
  students: {
    id: string;
    name: string;
    rollNo: string;
    status: "present" | "absent";
  }[];
};

type AttendanceState = {
  // Summary for student home view
  summary: AttendanceSummary[];
  setSummary: (summary: AttendanceSummary[]) => void;
  fetchSummary: (userId: string) => Promise<void>;
  summaryLoading: boolean;

  // Sessions for professor admin view
  sessions: AttendanceSession[];
  setSessions: (sessions: AttendanceSession[]) => void;
  fetchSessions: () => Promise<void>;
  sessionsLoading: boolean;

  // Mutation
  updateSessionAttendance: (
    sessionId: string,
    updates: { id: string; status: "present" | "absent" | null }[],
  ) => Promise<boolean>;

  markAttendance: (
    sessionId: string,
    coordinates: { lat: number; lng: number }
  ) => Promise<{ success: boolean; message?: string }>;
};

export const useAttendanceStore = create<AttendanceState>()(
  persist(
    (set, get) => ({
      summary: [],
      summaryLoading: false,
      sessions: [],
      sessionsLoading: false,

      setSummary: (summary) => set({ summary }),
      setSessions: (sessions) => set({ sessions }),

      fetchSummary: async (userId) => {
        set({ summaryLoading: true });
        try {
          const origin =
            process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/v1";
          const res = await fetch(`${origin}/attendance/summary/${userId}`);
          const data = await res.json();
          if (res.ok && data.success) {
            set({ summary: data.summary });
          } else if (res.status === 404 || data?.status_code === 404) {
            set({ summary: [] });
          }
        } catch (error) {
          console.error("Error fetching attendance summary:", error);
        } finally {
          set({ summaryLoading: false });
        }
      },

      fetchSessions: async () => {
        set({ sessionsLoading: true });
        try {
          const origin =
            process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/v1";
          const res = await fetch(
            `${origin}/attendance/sessions/all`,
          );
          const data = await res.json();
          if (res.ok && data.success) {
            set({ sessions: data.sessions });
          } else if (res.status === 404 || data?.status_code === 404) {
            set({ sessions: [] });
          }
        } catch (error) {
          console.error("Error fetching attendance sessions:", error);
        } finally {
          set({ sessionsLoading: false });
        }
      },

      updateSessionAttendance: async (sessionId, updates) => {
        try {
          const origin =
            process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/v1";
          const res = await fetch(
            `${origin}/attendance/sessions/${sessionId}/students`,
            withAuth({
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ students: updates }),
            }),
          );
          const data = await res.json();

          if (res.status === 401) {
            console.warn("Not authenticated while updating session attendance");
            return false;
          }
          if (res.status === 403) {
            console.warn("Insufficient permissions to update session attendance");
            return false;
          }

          if (res.ok && data.success) {
            // Optimistic cache update locally
            const currentSessions = get().sessions;
            const updatedSessions = currentSessions.map((s) => {
              if (s.id === sessionId) {
                const newStudents = s.students.map((stu) => {
                  const update = updates.find((u) => u.id === stu.id);
                  if (update && update.status) {
                    return { ...stu, status: update.status };
                  }
                  return stu;
                });
                return { ...s, students: newStudents };
              }
              return s;
            });
            set({ sessions: updatedSessions });
            return true;
          }
          return false;
        } catch (error) {
          console.error("Error updating session attendance:", error);
          return false;
        }
      },

      markAttendance: async (sessionId, coordinates) => {
        try {
          const origin = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/v1";
          const token = getAuthToken();
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (token) headers["Authorization"] = `Bearer ${token}`;
          const res = await fetch(`${origin}/attendance/checkin`, {
            method: "POST",
            headers,
            body: JSON.stringify({ sessionId, coordinates })
          });
          const data = await res.json();
          return { success: res.ok && data.success, message: data.message };
        } catch (error: any) {
          console.error("Error marking attendance:", error);
          return { success: false, message: error.message || "Failed to mark attendance" };
        }
      },
    }),
    {
      name: "attendance-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

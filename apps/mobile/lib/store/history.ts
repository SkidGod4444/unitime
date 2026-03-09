import { apiFetch } from "@/lib/api";
import { create } from "zustand";

export interface HistoryLog {
  id: string;
  title: string;
  description: string;
  type: "ATTENDANCE" | "SYSTEM";
  userId: string | null;
  organizationId: string | null;
  createdAt: string;
}

interface HistoryState {
  logs: HistoryLog[];
  loading: boolean;
  error: string | null;
  fetchHistoryLogs: (userId: string) => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  logs: [],
  loading: false,
  error: null,
  fetchHistoryLogs: async (userId: string) => {
    try {
      set({ loading: true, error: null });
      const [historyRes, attendanceRes] = await Promise.all([
        apiFetch(`/history/${userId}`),
        apiFetch(`/attendance/all-history/${userId}`),
      ]);

      const historyData = await historyRes.json();
      const attendanceData = await attendanceRes.json();

      let combinedLogs: HistoryLog[] = [];

      if (historyRes.ok && historyData.success) {
        combinedLogs = [...historyData.data];
      }

      if (attendanceRes.ok && attendanceData.success) {
        const mappedSessions: HistoryLog[] = attendanceData.data.map(
          (session: any) => ({
            id: session.id,
            title: "Attendance Session",
            description: `Session tracking configured for ${session.course?.name || "a course"}`,
            type: "ATTENDANCE" as const,
            userId: session.createdBy,
            organizationId: session.course?.organizationId || null,
            createdAt: session.createdAt,
          }),
        );

        combinedLogs = [...combinedLogs, ...mappedSessions];
      }

      // Sort combined array securely natively descending
      combinedLogs.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      if (
        (historyRes.ok && historyData.success) ||
        (attendanceRes.ok && attendanceData.success)
      ) {
        set({ logs: combinedLogs, loading: false });
      } else {
        set({ error: "Failed to fetch history logs", loading: false });
      }
    } catch (err: any) {
      set({
        error: err.message || "An error occurred",
        loading: false,
      });
    }
  },
}));

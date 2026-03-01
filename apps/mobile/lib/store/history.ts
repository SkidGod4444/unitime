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
      const origin = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/v1";
      const res = await fetch(`${origin}/history/${userId}`);
      const data = await res.json();
      
      if (res.ok && data.success) {
        set({ logs: data.data, loading: false });
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

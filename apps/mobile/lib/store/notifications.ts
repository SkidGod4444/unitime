import { create } from "zustand";

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: "ATTENDANCE" | "SYSTEM";
  readBy: string[];
  userId: string | null;
  organizationId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface NotificationsState {
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  fetchNotifications: (userId: string) => Promise<void>;
  markAsRead: (notificationId: string, userId: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  loading: false,
  error: null,

  fetchNotifications: async (userId: string) => {
    try {
      set({ loading: true, error: null });
      const origin = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/v1";
      const res = await fetch(`${origin}/notifications/${userId}`);
      const data = await res.json();

      if (res.ok && data.success) {
        set({ notifications: data.data, loading: false });
      } else {
        set({ error: "Failed to fetch notifications", loading: false });
      }
    } catch (err: any) {
      set({
        error: err.message || "An error occurred",
        loading: false,
      });
    }
  },

  markAsRead: async (notificationId: string, userId: string) => {
    try {
      // Optimistic update
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, readBy: [...n.readBy, userId] } : n
        ),
      }));

      const origin = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/v1";
      await fetch(`${origin}/notifications/${notificationId}/read`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
    } catch (err: any) {
      console.error("Failed to mark notification as read", err);
    }
  },

  markAllAsRead: async (userId: string) => {
    try {
      // Optimistic update
      set((state) => ({
        notifications: state.notifications.map((n) => ({
          ...n,
          readBy: n.readBy.includes(userId) ? n.readBy : [...n.readBy, userId],
        })),
      }));

      const origin = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/v1";
      await fetch(`${origin}/notifications/user/${userId}/read-all`, {
          method: "PUT",
      });
    } catch (err: any) {
      console.error("Failed to mark all notifications as read", err);
    }
  },
}));

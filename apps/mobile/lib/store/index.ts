import AsyncStorage from "@react-native-async-storage/async-storage";
import { OrgT, ProfileT, Theme, UserT } from "@unitime/types";
import type { FeedbackT, SupportTicketT } from "@unitime/types";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { apiFetch } from "@/lib/api";

type ThemeState = {
  theme: Theme;
  toggleTheme: () => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "dark",
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
    }),
    {
      name: "theme-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

type UsersState = {
  users: UserT[];
  addUser: (user: UserT) => void;
  updateUser: (id: string, updates: Partial<UserT>) => void;
  removeUser: (user_id: string) => void;
  setUsers: (users: UserT[]) => void;
  loading: boolean;
  fetchUsers: () => Promise<void>;
};

export const useUsersStore = create<UsersState>()(
  persist(
    (set) => ({
      users: [],
      loading: false,
      setUsers: (users) => set({ users }),
      fetchUsers: async () => {
        set({ loading: true });
        try {
          const origin =
            process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
          const res = await fetch(`${origin}/users/all`);
          const data = await res.json();
          if (res.ok && data.success && data.users) {
            set({ users: data.users });
          } else if (res.status === 404 || data?.status_code === 404) {
            set({ users: [] });
          }
        } catch (error) {
          console.error("Failed to fetch users:", error);
        } finally {
          set({ loading: false });
        }
      },
      addUser: (user) => set((state) => ({ users: [...state.users, user] })),
      updateUser: (id, updates) =>
        set((state) => ({
          users: state.users.map((user) =>
            user.id === id ? { ...user, ...updates } : user,
          ),
        })),
      removeUser: (userId) =>
        set((state) => ({
          users: state.users.filter((user) => user.id !== userId),
        })),
    }),
    {
      name: "users-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

type ProfilesState = {
  profiles: ProfileT[];
  addProfile: (profile: ProfileT) => void;
  removeProfile: (profile_id: string) => void;
  setProfiles: (profiles: ProfileT[]) => void;
  loading: boolean;
  fetchProfiles: () => Promise<void>;
};

export const useProfilesStore = create<ProfilesState>()(
  persist(
    (set) => ({
      profiles: [],
      loading: false,
      setProfiles: (profiles) => set({ profiles }),
      fetchProfiles: async () => {
        set({ loading: true });
        try {
          const origin =
            process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
          const res = await fetch(`${origin}/profiles/all`);
          const data = await res.json();
          if (res.ok && data.success && data.profiles) {
            set({ profiles: data.profiles });
          } else if (res.status === 404 || data?.status_code === 404) {
            set({ profiles: [] });
          }
        } catch (error) {
          console.error("Failed to fetch profiles:", error);
        } finally {
          set({ loading: false });
        }
      },
      addProfile: (profile) =>
        set((state) => ({ profiles: [...state.profiles, profile] })),
      removeProfile: (profileId) =>
        set((state) => ({
          profiles: state.profiles.filter(
            (profile) => profile.userId !== profileId,
          ),
        })),
    }),
    {
      name: "profiles-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

type OrgsState = {
  orgs: OrgT[];
  setOrgs: (orgs: OrgT[]) => void;
  loading: boolean;
  fetchOrgs: () => Promise<void>;
  createOrg: (data: Omit<OrgT, "id" | "createdAt" | "updatedAt" | "students">) => Promise<void>;
  updateOrg: (id: string, data: Partial<Omit<OrgT, "id" | "createdAt" | "updatedAt" | "students">>) => Promise<void>;
  deleteOrg: (id: string) => Promise<void>;
};

export const useOrgsStore = create<OrgsState>()(
  persist(
    (set) => ({
      orgs: [],
      loading: false,
      setOrgs: (orgs) => set({ orgs }),
      createOrg: async (orgData) => {
        try {
          const origin = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/v1";
          const res = await fetch(`${origin}/orgs/create`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(orgData),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            useOrgsStore.getState().fetchOrgs();
          } else {
            throw new Error(data.message || "Failed to create class");
          }
        } catch (error) {
          console.error("Error creating class:", error);
          throw error;
        }
      },
      updateOrg: async (id, orgData) => {
        try {
          const origin = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/v1";
          const res = await fetch(`${origin}/orgs/${id}/update`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(orgData),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            useOrgsStore.getState().fetchOrgs();
          } else {
            throw new Error(data.message || "Failed to update class");
          }
        } catch (error) {
          console.error("Error updating class:", error);
          throw error;
        }
      },
      deleteOrg: async (id) => {
        try {
          const origin = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/v1";
          const res = await fetch(`${origin}/orgs/${id}`, {
            method: "DELETE",
          });
          const data = await res.json();
          if (res.ok && data.success) {
            useOrgsStore.getState().fetchOrgs();
          } else {
            throw new Error(data.message || "Failed to delete class");
          }
        } catch (error) {
          console.error("Error deleting class:", error);
          throw error;
        }
      },
      fetchOrgs: async () => {
        set({ loading: true });
        try {
          const origin =
            process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
          const res = await fetch(`${origin}/orgs/all`);
          const data = await res.json();
          if (res.ok && data.success && data.orgs) {
            set({ orgs: data.orgs });
          } else if (res.status === 404 || data?.status_code === 404) {
            set({ orgs: [] });
          }
        } catch (error) {
          console.error("Failed to fetch orgs:", error);
        } finally {
          set({ loading: false });
        }
      },
    }),
    {
      name: "orgs-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export * from "./attendance";
export * from "./courses";
export * from "./history";
export * from "./notifications";
export * from "./timetable";

// ---------------------------------------------
// Feedbacks Store
// ---------------------------------------------

type FeedbacksState = {
  myFeedbacks: FeedbackT[];
  adminFeedbacks: Array<FeedbackT & { user?: { id: string; name: string; email: string } | null }>;
  loading: boolean;
  fetchMyFeedbacks: () => Promise<void>;
  createFeedback: (message: string, category?: FeedbackT["category"]) => Promise<FeedbackT | null>;
  fetchAdminFeedbacks: (organizationId?: string) => Promise<void>;
  updateFeedbackStatus: (id: string, status: "ACKNOWLEDGED" | "RESOLVED") => Promise<void>;
};

export const useFeedbacksStore = create<FeedbacksState>()(
  persist(
    (set, get) => ({
      myFeedbacks: [],
      adminFeedbacks: [],
      loading: false,
      fetchMyFeedbacks: async () => {
        set({ loading: true });
        try {
          const res = await apiFetch("/feedbacks/my");
          if (!res.ok) return;
          const data = await res.json();
          set({ myFeedbacks: data.feedbacks ?? [] });
        } finally {
          set({ loading: false });
        }
      },
      createFeedback: async (message, category) => {
        try {
          const res = await apiFetch("/feedbacks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, category }),
          });
          if (!res.ok) return null;
          const data = await res.json();
          const fb = data.feedback as FeedbackT;
          set({ myFeedbacks: [fb, ...get().myFeedbacks] });
          return fb;
        } catch {
          return null;
        }
      },
      fetchAdminFeedbacks: async (organizationId?: string) => {
        set({ loading: true });
        try {
          const url = organizationId ? `/feedbacks/admin?organizationId=${organizationId}` : "/feedbacks/admin";
          const res = await apiFetch(url);
          if (!res.ok) return;
          const data = await res.json();
          set({ adminFeedbacks: data.feedbacks ?? [] });
        } finally {
          set({ loading: false });
        }
      },
      updateFeedbackStatus: async (id, status) => {
        try {
          const res = await apiFetch(`/feedbacks/${id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          });
          if (!res.ok) return;
          const data = await res.json();
          const updated = data.feedback as FeedbackT;
          set({
            adminFeedbacks: get().adminFeedbacks.map((f) => (f.id === id ? { ...f, ...updated } : f)),
          });
        } catch {}
      },
    }),
    {
      name: "feedbacks-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ myFeedbacks: s.myFeedbacks }),
    },
  ),
);

// ---------------------------------------------
// Tickets Store
// ---------------------------------------------

type TicketsState = {
  myTickets: SupportTicketT[];
  adminTickets: Array<SupportTicketT & { user?: { id: string; name: string; email: string } | null }>;
  loading: boolean;
  fetchMyTickets: () => Promise<void>;
  createTicket: (title: string, description: string) => Promise<SupportTicketT | null>;
  fetchAdminTickets: (organizationId?: string) => Promise<void>;
  setTicketStatus: (id: string, status: SupportTicketT["status"], assigneeId?: string) => Promise<void>;
  resolveTicket: (id: string, note: string) => Promise<void>;
};

export const useTicketsStore = create<TicketsState>()(
  persist(
    (set, get) => ({
      myTickets: [],
      adminTickets: [],
      loading: false,
      fetchMyTickets: async () => {
        set({ loading: true });
        try {
          const res = await apiFetch("/tickets/my");
          if (!res.ok) return;
          const data = await res.json();
          set({ myTickets: data.tickets ?? [] });
        } finally {
          set({ loading: false });
        }
      },
      createTicket: async (title, description) => {
        try {
          const res = await apiFetch("/tickets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, description }),
          });
          if (!res.ok) return null;
          const data = await res.json();
          const t = data.ticket as SupportTicketT;
          set({ myTickets: [t, ...get().myTickets] });
          return t;
        } catch {
          return null;
        }
      },
      fetchAdminTickets: async (organizationId?: string) => {
        set({ loading: true });
        try {
          const url = organizationId ? `/tickets/admin?organizationId=${organizationId}` : "/tickets/admin";
          const res = await apiFetch(url);
          if (!res.ok) return;
          const data = await res.json();
          set({ adminTickets: data.tickets ?? [] });
        } finally {
          set({ loading: false });
        }
      },
      setTicketStatus: async (id, status, assigneeId) => {
        try {
          const res = await apiFetch(`/tickets/${id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status, ...(assigneeId ? { assigneeId } : {}) }),
          });
          if (!res.ok) return;
          const data = await res.json();
          const updated = data.ticket as SupportTicketT;
          set({
            adminTickets: get().adminTickets.map((t) => (t.id === id ? { ...t, ...updated } : t)),
          });
        } catch {}
      },
      resolveTicket: async (id, note) => {
        try {
          const res = await apiFetch(`/tickets/${id}/resolve`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resolutionNote: note }),
          });
          if (!res.ok) return;
          const data = await res.json();
          const updated = data.ticket as SupportTicketT;
          set({
            adminTickets: get().adminTickets.map((t) => (t.id === id ? { ...t, ...updated } : t)),
          });
        } catch {}
      },
    }),
    {
      name: "tickets-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ myTickets: s.myTickets }),
    },
  ),
);

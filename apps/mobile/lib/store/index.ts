import AsyncStorage from "@react-native-async-storage/async-storage";
import { OrgT, ProfileT, Theme, UserT } from "@unitime/types";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

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


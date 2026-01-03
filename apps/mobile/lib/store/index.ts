import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Theme, UserT } from "@unitime/types";

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
  removeUser: (user_id: string) => void;
  setUsers: (users: UserT[]) => void;
};

export const useUsersStore = create<UsersState>()(
  persist(
    (set) => ({
      users: [],
      setUsers: (users) => set({ users }),
      addUser: (user) => set((state) => ({ users: [...state.users, user] })),
      removeUser: (userId) =>
        set((state) => ({
          users: state.users.filter((user) => user.$user_id !== userId),
        })),
    }),
    {
      name: "users-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
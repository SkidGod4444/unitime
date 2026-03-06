import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { withAuth } from "@/lib/api";

export type LabGroup = { id: string; name: string };
export type LabGroupMember = {
  id: string;
  name: string;
  email?: string | null;
  studentProfile?: any;
  joinedAt?: string;
};

type LabGroupsState = {
  byCourse: Record<string, LabGroup[]>;
  myGroups: Record<string, string | null>;
  membersByGroup: Record<string, LabGroupMember[]>;
  fetchLabGroups: (courseId: string) => Promise<LabGroup[]>;
  joinLabGroup: (groupId: string, courseId: string) => Promise<boolean>;
  createLabGroup: (courseId: string, name: string) => Promise<LabGroup | null>;
  deleteLabGroup: (groupId: string, courseId: string) => Promise<boolean>;
  fetchLabGroupMembers: (groupId: string) => Promise<LabGroupMember[]>;
};

export const useLabGroupsStore = create<LabGroupsState>()(
  persist(
    (set, get) => ({
      byCourse: {},
      myGroups: {},
      membersByGroup: {},

      fetchLabGroups: async (courseId) => {
        const origin = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/v1";
        const res = await fetch(`${origin}/courses/${courseId}/lab-groups`);
        if (!res.ok) return [];
        const data = await res.json();
        const groups: LabGroup[] = data.groups || [];
        set((s) => ({ byCourse: { ...s.byCourse, [courseId]: groups } }));
        return groups;
      },

      joinLabGroup: async (groupId, courseId) => {
        try {
          const origin = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/v1";
          const res = await fetch(
            `${origin}/lab-groups/${groupId}/join`,
            withAuth({
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ courseId }),
            }),
          );
          const data = await res.json();
          if (res.ok && data.success) {
            set((s) => ({ myGroups: { ...s.myGroups, [courseId]: groupId } }));
            return true;
          }
          return false;
        } catch (e) {
          console.warn("Failed to join lab group", e);
          return false;
        }
      },

      createLabGroup: async (courseId, name) => {
        try {
          const origin = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/v1";
          const res = await fetch(
            `${origin}/courses/${courseId}/lab-groups`,
            withAuth({
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name }),
            }),
          );
          const data = await res.json();
          if (res.ok && data.success) {
            // refresh list
            await get().fetchLabGroups(courseId);
            return data.group as LabGroup;
          }
          return null;
        } catch (e) {
          console.warn("Failed to create lab group", e);
          return null;
        }
      },

      deleteLabGroup: async (groupId, courseId) => {
        try {
          const origin = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/v1";
          const res = await fetch(
            `${origin}/lab-groups/${groupId}`,
            withAuth({ method: "DELETE" }),
          );
          if (res.ok) {
            await get().fetchLabGroups(courseId);
            return true;
          }
          return false;
        } catch (e) {
          console.warn("Failed to delete lab group", e);
          return false;
        }
      },

      fetchLabGroupMembers: async (groupId) => {
        const origin = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/v1";
        const res = await fetch(
          `${origin}/lab-groups/${groupId}/members`,
          withAuth({ method: "GET" }),
        );
        if (!res.ok) return [];
        const data = await res.json();
        const members: LabGroupMember[] = data.members || [];
        set((s) => ({ membersByGroup: { ...s.membersByGroup, [groupId]: members } }));
        return members;
      },
    }),
    {
      name: "lab-groups-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);


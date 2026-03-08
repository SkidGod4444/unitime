import { withAuth } from "@/lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type LabGroup = { id: string; name: string; courseId: string };
export type LabGroupMember = {
  id: string;
  name: string;
  email?: string | null;
  studentProfile?: any;
  joinedAt?: string;
};

type LabGroupsState = {
  byCourse: Record<string, LabGroup[]>;
  myLabGroupId: string | null;
  membersByGroup: Record<string, LabGroupMember[]>;
  /** Fetch all groups for a given course */
  fetchCourseLabGroups: (courseId: string) => Promise<LabGroup[]>;
  /** ADMIN/REP: Create a new lab group for a course */
  createLabGroup: (courseId: string, name: string) => Promise<LabGroup | null>;
  /** ADMIN/REP: Delete an empty lab group */
  deleteLabGroup: (groupId: string, courseId: string) => Promise<boolean>;
  /** STUDENT: Join (or switch) their global lab group */
  joinLabGroup: (groupId: string) => Promise<boolean>;
  /** ADMIN/REP: View group members */
  fetchLabGroupMembers: (groupId: string) => Promise<LabGroupMember[]>;
};

export const useLabGroupsStore = create<LabGroupsState>()(
  persist(
    (set, get) => ({
      byCourse: {},
      myLabGroupId: null,
      membersByGroup: {},

      fetchCourseLabGroups: async (courseId) => {
        const origin = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/v1";
        const res = await fetch(`${origin}/lab-groups?courseId=${encodeURIComponent(courseId)}`);
        if (!res.ok) return [];
        const data = await res.json();
        const groups: LabGroup[] = data.groups || [];
        set((s) => ({ byCourse: { ...s.byCourse, [courseId]: groups } }));
        return groups;
      },

      joinLabGroup: async (groupId) => {
        try {
          const origin = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/v1";
          const res = await fetch(`${origin}/lab-groups/${groupId}/join`, withAuth({ method: "POST" }));
          const data = await res.json();
          if (res.ok && data.success) {
            set({ myLabGroupId: groupId });
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
            `${origin}/lab-groups`,
            withAuth({
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name, courseId }),
            }),
          );
          const data = await res.json();
          if (res.ok && data.success) {
            await get().fetchCourseLabGroups(courseId);
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
          const res = await fetch(`${origin}/lab-groups/${groupId}`, withAuth({ method: "DELETE" }));
          if (res.ok) {
            await get().fetchCourseLabGroups(courseId);
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
        const res = await fetch(`${origin}/lab-groups/${groupId}/members`, withAuth({ method: "GET" }));
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

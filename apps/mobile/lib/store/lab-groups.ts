import { apiFetch } from "@/lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type LabGroup = { id: string; name: string; organizationId: string };
export type LabGroupMember = {
  id: string;
  name: string;
  email?: string | null;
  studentProfile?: any;
  joinedAt?: string;
};

type LabGroupsState = {
  byOrg: Record<string, LabGroup[]>;
  myLabGroupId: string | null;
  membersByGroup: Record<string, LabGroupMember[]>;
  /** Fetch all groups for a given org */
  fetchOrgLabGroups: (organizationId: string) => Promise<LabGroup[]>;
  /** ADMIN/REP: Create a new lab group for an org */
  createLabGroup: (
    organizationId: string,
    name: string,
  ) => Promise<LabGroup | null>;
  /** ADMIN/REP: Delete an empty lab group */
  deleteLabGroup: (groupId: string, organizationId: string) => Promise<boolean>;
  /** ADMIN/REP: View group members */
  fetchLabGroupMembers: (groupId: string) => Promise<LabGroupMember[]>;
};

export const useLabGroupsStore = create<LabGroupsState>()(
  persist(
    (set, get) => ({
      byOrg: {},
      myLabGroupId: null,
      membersByGroup: {},

      fetchOrgLabGroups: async (organizationId) => {
        const res = await apiFetch(
          `/lab-groups?organizationId=${encodeURIComponent(organizationId)}`,
        );
        if (!res.ok) return [];
        const data = await res.json();
        const groups: LabGroup[] = data.groups || [];
        set((s) => ({ byOrg: { ...s.byOrg, [organizationId]: groups } }));
        return groups;
      },

      createLabGroup: async (organizationId, name) => {
        try {
          const res = await apiFetch("/lab-groups", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, organizationId }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            await get().fetchOrgLabGroups(organizationId);
            return data.group as LabGroup;
          }
          return null;
        } catch (e) {
          console.warn("Failed to create lab group", e);
          return null;
        }
      },

      deleteLabGroup: async (groupId, organizationId) => {
        try {
          const res = await apiFetch(`/lab-groups/${groupId}`, {
            method: "DELETE",
          });
          if (res.ok) {
            await get().fetchOrgLabGroups(organizationId);
            return true;
          }
          return false;
        } catch (e) {
          console.warn("Failed to delete lab group", e);
          return false;
        }
      },

      fetchLabGroupMembers: async (groupId) => {
        const res = await apiFetch(`/lab-groups/${groupId}/members`);
        if (!res.ok) return [];
        const data = await res.json();
        const members: LabGroupMember[] = data.members || [];
        set((s) => ({
          membersByGroup: { ...s.membersByGroup, [groupId]: members },
        }));
        return members;
      },
    }),
    {
      name: "lab-groups-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

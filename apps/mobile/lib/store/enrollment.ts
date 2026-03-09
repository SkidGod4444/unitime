import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuthToken } from "@/lib/auth.token";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type PendingEnrollment = {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    studentProfile?: { admissionNumber: string } | null;
  };
  course: {
    id: string;
    name: string;
    code: string;
    organization: {
      departmentName: string;
      courseName: string;
      section: number;
    } | null;
  };
};

type EnrollmentState = {
  enrollments: PendingEnrollment[];
  loading: boolean;
  fetchEnrollments: (organizationId?: string | null) => Promise<void>;
  updateEnrollmentStatus: (
    enrollmentId: string,
    status: "APPROVED" | "REJECTED",
  ) => Promise<void>;
};

export const useEnrollmentStore = create<EnrollmentState>()(
  persist(
    (set, get) => ({
      enrollments: [],
      loading: false,
      fetchEnrollments: async (organizationId) => {
        set({ loading: true });
        try {
          const origin =
            process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

          let url = `${origin}/admin/enrollments/pending`;
          if (organizationId) {
            url += `?organizationId=${organizationId}`;
          }

          const headers: Record<string, string> = {};
          const token = getAuthToken();
          if (token) headers["Authorization"] = `Bearer ${token}`;

          const res = await fetch(url, { headers });
          const data = await res.json();
          if (res.ok && data.success) {
            set({ enrollments: data.enrollments });
          } else {
            set({ enrollments: [] });
          }
        } catch (error) {
          console.error("Error fetching enrollments:", error);
        } finally {
          set({ loading: false });
        }
      },
      updateEnrollmentStatus: async (enrollmentId, status) => {
        try {
          const origin =
            process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
          const token = getAuthToken();
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
          };
          if (token) headers["Authorization"] = `Bearer ${token}`;
          const res = await fetch(
            `${origin}/admin/enrollments/${enrollmentId}/status`,
            {
              method: "PATCH",
              headers,
              body: JSON.stringify({ status }),
            },
          );
          const data = await res.json();
          if (res.status === 401) {
            throw new Error("Session expired. Please sign in again.");
          }
          if (res.status === 403) {
            throw new Error(
              "Insufficient permissions to moderate enrollments.",
            );
          }
          if (res.ok && data.success) {
            // Optimistically remove the enrollment from the list
            set({
              enrollments: get().enrollments.filter(
                (e) => e.id !== enrollmentId,
              ),
            });
          } else {
            throw new Error(
              data.message || "Failed to update enrollment status",
            );
          }
        } catch (error) {
          console.error("Error updating enrollment status:", error);
          throw error;
        }
      },
    }),
    {
      name: "enrollment-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

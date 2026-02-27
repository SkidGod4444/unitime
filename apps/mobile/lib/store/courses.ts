import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { Course } from "./timetable";

type CoursesState = {
  courses: Course[];
  setCourses: (courses: Course[]) => void;
  loading: boolean;
  fetchCourses: () => Promise<void>;
  createCourse: (
    data: Omit<Course, "id"> & {
      classType: string;
      professorId: string;
      organizationId: string;
      userId: string;
      description?: string;
    },
  ) => Promise<void>;
  updateCourse: (
    id: string,
    data: Partial<
      Omit<Course, "id"> & {
        classType: string;
        professorId: string;
        organizationId: string;
        description?: string;
      }
    >,
  ) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
};

export const useCoursesStore = create<CoursesState>()(
  persist(
    (set) => ({
      courses: [],
      loading: false,
      setCourses: (courses) => set({ courses }),
      fetchCourses: async () => {
        set({ loading: true });
        try {
          const origin =
            process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/v1";
          const res = await fetch(`${origin}/courses`);
          const data = await res.json();
          if (res.ok && data.success) {
            set({ courses: data.courses });
          } else if (res.status === 404 || data?.status_code === 404) {
            set({ courses: [] });
          }
        } catch (error) {
          console.error("Error fetching courses:", error);
        } finally {
          set({ loading: false });
        }
      },
      createCourse: async (courseData) => {
        try {
          const origin =
            process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/v1";
          const res = await fetch(`${origin}/courses`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(courseData),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            // Re-fetch courses immediately after creation
            useCoursesStore.getState().fetchCourses();
          } else {
            throw new Error(data.message || "Failed to create course");
          }
        } catch (error) {
          console.error("Error creating course:", error);
          throw error;
        }
      },
      updateCourse: async (id, courseData) => {
        try {
          const origin =
            process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/v1";
          const res = await fetch(`${origin}/courses/${id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(courseData),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            useCoursesStore.getState().fetchCourses();
          } else {
            throw new Error(data.message || "Failed to update course");
          }
        } catch (error) {
          console.error("Error updating course:", error);
          throw error;
        }
      },
      deleteCourse: async (id) => {
        try {
          const origin =
            process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/v1";
          const res = await fetch(`${origin}/courses/${id}`, {
            method: "DELETE",
          });
          const data = await res.json();
          if (res.ok && data.success) {
            useCoursesStore.getState().fetchCourses();
          } else {
            throw new Error(data.message || "Failed to delete course");
          }
        } catch (error) {
          console.error("Error deleting course:", error);
          throw error;
        }
      },
    }),
    {
      name: "courses-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

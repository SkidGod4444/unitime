import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { Course } from "./timetable";

type CoursesState = {
  courses: Course[];
  setCourses: (courses: Course[]) => void;
  loading: boolean;
  fetchCourses: () => Promise<void>;
  createCourse: (data: Omit<Course, "id"> & { classType: string; professorId: string; userId: string; description?: string }) => Promise<void>;
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
          const origin = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/v1";
          const res = await fetch(`${origin}/courses`);
          const data = await res.json();
          if (res.ok && data.success) {
            set({ courses: data.courses });
          }
        } catch (error) {
           console.error("Error fetching courses:", error);
        } finally {
          set({ loading: false });
        }
      },
      createCourse: async (courseData) => {
        try {
          const origin = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/v1";
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
      }
    }),
    {
      name: "courses-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

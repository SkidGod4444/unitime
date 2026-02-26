import { useAttendanceStore, useCoursesStore, useOrgsStore, useProfilesStore, useTimetableStore, useUsersStore } from "@/lib/store";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./auth.cntxt";

type StoreContextType = {
  refresh: () => Promise<void>;
  loading: boolean;
};

const StoreContext = createContext<StoreContextType>({
  refresh: async () => {},
  loading: false,
});

export const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(false);
  const { loggedInUser } = useAuth();

  const { setUsers } = useUsersStore();
  const { setProfiles } = useProfilesStore();
  const { setOrgs } = useOrgsStore();
  
  const { fetchTimetable } = useTimetableStore();
  const { fetchSummary, fetchSessions } = useAttendanceStore();
  const { fetchCourses } = useCoursesStore();

  const origin = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

  const fetchUsers = React.useCallback(async () => {
    try {
      const response = await fetch(`${origin}/users/all`);
      const data = await response.json();
      // console.log("Fetched users:", data);
      if (data.success && data.users) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  }, [origin, setUsers]);

  const fetchProfiles = React.useCallback(async () => {
    try {
      const response = await fetch(`${origin}/profiles/all`);
      const data = await response.json();
      // console.log("Fetched profiles:", data);
      if (data.success && data.profiles) {
        setProfiles(data.profiles);
      }
    } catch (error) {
      console.error("Failed to fetch profiles:", error);
    }
  }, [origin, setProfiles]);

  const fetchOrgs = React.useCallback(async () => {
    try {
      const response = await fetch(`${origin}/orgs/all`);
      const data = await response.json();
      // console.log("Fetched orgs:", data);
      if (data.success && data.orgs) {
        setOrgs(data.orgs);
      }
    } catch (error) {
      console.error("Failed to fetch orgs:", error);
    }
  }, [origin, setOrgs]);

    const refresh = React.useCallback(async () => {
      setLoading(true);
      await Promise.allSettled([
        fetchUsers(),
        fetchProfiles(),
        fetchOrgs(),
        fetchCourses(),
        ...(loggedInUser?.id ? [fetchTimetable(loggedInUser.id)] : []),
        ...(loggedInUser?.id ? [fetchSummary(loggedInUser.id)] : []),
        ...(loggedInUser?.id && loggedInUser.role === "PROFESSOR" ? [fetchSessions(loggedInUser.id)] : []),
      ]);
      setLoading(false);
    }, [fetchUsers, fetchProfiles, fetchOrgs, fetchCourses, fetchTimetable, fetchSummary, fetchSessions, loggedInUser?.id, loggedInUser?.role]);

    useEffect(() => {
      if (loggedInUser) {
        refresh();
      }

      if (loggedInUser) {
        const interval = setInterval(async () => {
          console.log("Refreshing secondary data (attendance/timetable)...");
          if (loggedInUser.id) {
            fetchSummary(loggedInUser.id);
            fetchTimetable(loggedInUser.id);
            if (loggedInUser.role === "PROFESSOR") {
              fetchSessions(loggedInUser.id);
            }
          }
        }, 30 * 1000); // Wait 30s instead of 10s for intensive DB calls


        return () => clearInterval(interval);
      }
    }, [loggedInUser, refresh]);

  return (
    <StoreContext.Provider value={{ refresh, loading }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => useContext(StoreContext);

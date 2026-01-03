import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./auth.cntxt";
import { useUsersStore } from "@/lib/store";


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
  const { user } = useAuth();

  const { setUsers } = useUsersStore();

  const origin = process.env.EXPO_PUBLIC_ORIGIN;

//   const fetchTeams = React.useCallback(async () => {
//     try {
//       const teams = await getTeams();
//       if (teams) {
//         setTeams(teams.teams as TeamT[]);
//       }
//     } catch (error) {
//       console.error("Failed to fetch teams:", error);
//     }
//   }, [setTeams]);

  const fetchUsers = React.useCallback(async () => {
    try {
      const response = await fetch(`${origin}/v1/user/all`);
      const data = await response.json();
      if (data.status === 200) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  }, [origin, setUsers]);

//   const fetchCourses = React.useCallback(async () => {
//     try {
//       const response = await fetch(`${origin}/v1/course/all`);
//       const data = await response.json();
//       if (data.status === 200) {
//         setCourses(data.data);
//       }
//     } catch (error) {
//       console.error("Failed to fetch courses:", error);
//     }
//   }, [origin, setCourses]);

//   const fetchHistories = React.useCallback(async () => {
//     try {
//       const response = await fetch(`${origin}/v1/history/all`);
//       const data = await response.json();
//       if (data.status === 200) {
//         setHistories(data.data);
//       }
//     } catch (error) {
//       console.error("Failed to fetch histories:", error);
//     }
//   }, [origin, setHistories]);

//   const fetchAttendance = React.useCallback(async () => {
//     try {
//       const response = await fetch(`${origin}/v1/attendance/all`);
//       const data = await response.json();
//       if (data.status === 200) {
//         setAttendances(data.data);
//       }
//     } catch (error) {
//       console.error("Failed to fetch attendance:", error);
//     }
//   }, [origin, setAttendances]);

//   const refresh = React.useCallback(async () => {
//     setLoading(true);
//     await Promise.allSettled([
//     //   fetchTeams(),
//       fetchUsers(),
//     //   fetchCourses(),
//     //   fetchHistories(),
//     //   fetchAttendance(),
//     ]);
//     setLoading(false);
//   }, [fetchTeams, fetchUsers, fetchCourses, fetchHistories, fetchAttendance]);

//   useEffect(() => {
//     if (loggedInUser) {
//       refresh();
//     }

//     if (loggedInUser) {
//       const interval = setInterval(async () => {
//         console.log("Refreshing attendance data...");
//         // Prevent overlapping fetches
//         await fetchAttendance();
//       }, 10 * 1000); // Refresh every 10 seconds

//       return () => clearInterval(interval);
//     }
//   }, [loggedInUser, refresh, fetchAttendance]);

  return (
    <StoreContext.Provider value={{ refresh, loading }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => useContext(StoreContext);
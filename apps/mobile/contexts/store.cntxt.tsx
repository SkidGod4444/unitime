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
  const { loggedInUser } = useAuth();

  const { setUsers } = useUsersStore();

  const origin = process.env.EXPO_PUBLIC_ORIGIN;

  const fetchUsers = React.useCallback(async () => {
    try {
      const response = await fetch(`${origin}/users/all`);
      const data = await response.json();
      if (data.status === 200) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  }, [origin, setUsers]);

    const refresh = React.useCallback(async () => {
      setLoading(true);
      await Promise.allSettled([
        fetchUsers(),
      ]);
      setLoading(false);
    }, [fetchUsers]);

    useEffect(() => {
      if (loggedInUser) {
        refresh();
      }

      if (loggedInUser) {
        const interval = setInterval(async () => {
          console.log("Refreshing attendance data...");
          // Prevent overlapping fetches
          // await fetchAttendance();

        }, 10 * 1000); // Refresh every 10 seconds

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

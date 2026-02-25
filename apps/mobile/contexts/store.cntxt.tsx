import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./auth.cntxt";
import { useOrgsStore, useProfilesStore, useUsersStore } from "@/lib/store";

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
      ]);
      setLoading(false);
    }, [fetchUsers, fetchProfiles, fetchOrgs]);

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

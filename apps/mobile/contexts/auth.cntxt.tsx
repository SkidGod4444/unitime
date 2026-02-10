"use client";
// import {
//   useApiKeyStore,
//   useMyProfileStore,
//   useProjectsStore,
// } from "@prexo/store";
import { useRoutes } from "@/contexts/routes.cntxt";
import { authClient } from "@unitime/auth/client";
import { UserT } from "@unitime/types";
import { usePathname, useRouter } from "expo-router";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

interface AuthContextType {
  user: UserT | null;
  loading: boolean;
  setUser: (user: UserT | null) => void;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserT | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { setIsLoading } = useRoutes(); // Only use setIsLoading, not showLoader/hideLoader

  // Refs to prevent duplicate checks
  const isInitialMount = useRef(true);
  const isChecking = useRef(false);
  const previousPath = useRef<string | null>(null);
  const currentPath = useRef<string | null>(pathname); // Track current path

  // Reusable auth check function
  const checkAuth = useCallback(async (showLoading = true) => {
    // Prevent concurrent checks
    if (isChecking.current) {
      console.log("[Auth] Check already in progress, skipping");
      return;
    }

    isChecking.current = true;

    if (showLoading) {
      setLoading(true);
      setIsLoading(true); // Show loader overlay
    }
    try {
      const session = await authClient.getSession();
      const sessionUser = session?.data?.user ?? null;

      if (sessionUser) {
        setUser(sessionUser);
        console.log("[Auth Check] User authenticated:", sessionUser.email);
      } else {
        setUser(null);
        // Only redirect to auth if not already on auth page
        const current = currentPath.current;
        console.log("[Auth Check] Current path:", current);
        if (current !== "/auth") {
          router.replace("/auth" as any);
          console.log("[Auth Check] No user, redirecting to /auth");
        } else {
          console.log("[Auth Check] Already on /auth, skipping redirect");
        }
      }
    } catch (error) {
      console.error("[Auth Check] Error:", error);
    } finally {
      if (showLoading) {
        setLoading(false);
        setIsLoading(false); // Hide loader overlay
      }
      isChecking.current = false;
    }
  }, [router, setIsLoading]);

  // Keep currentPath ref in sync with pathname
  useEffect(() => {
    currentPath.current = pathname;
  }, [pathname]);

  // Initial mount check - run only once
  useEffect(() => {
    console.log("[Auth] Initial mount - checking auth");
    checkAuth(true);
    isInitialMount.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once!

  // Route change monitoring - skip initial mount
  useEffect(() => {
    // Skip on initial mount
    if (isInitialMount.current) {
      previousPath.current = pathname;
      return;
    }

    // Skip if path hasn't actually changed
    if (pathname === previousPath.current) {
      return;
    }

    previousPath.current = pathname;
    console.log("[Auth] Route changed to:", pathname);
    checkAuth(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]); // Only pathname in deps

  // Interval monitoring (every 10 seconds) - silent checks
  useEffect(() => {
    console.log("[Auth] Starting 10-second interval checks");
    const interval = setInterval(() => {
      console.log("[Auth] Background interval check");
      if (!isChecking.current) {
        checkAuth(false);
      }
    }, 10000);

    return () => {
      console.log("[Auth] Clearing interval checks");
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - set up once!

  // Add logout logic here, inbuilt removeMyProfile
  const logout = async () => {
    try {
      await authClient.signOut();
      setUser(null);
      // if (myProfile && myProfile.id) {
      //   removeMyProfile(myProfile.id);
      //   console.log("User profile removed on logout:", myProfile.id);
      // }
      // router.push(landingPage);
      console.log("User logged out.");
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the user context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within a AuthProvider");
  }
  return context;
};

"use client";
import { useRoutes } from "@/contexts/routes.cntxt";
import { authClient } from "@unitime/auth/client";
import { UserT } from "@unitime/types";
import { router, useSegments } from "expo-router";
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
  const segments = useSegments();
  const { setIsLoading } = useRoutes();

  // Refs to prevent duplicate checks
  const isInitialMount = useRef(true);
  const isChecking = useRef(false);
  const hasRedirected = useRef(false);
  const previousSegments = useRef<string[]>([]);

  // Derive current path from segments
  const currentPath = segments.length > 0 ? `/${segments.join("/")}` : "/";

  // Reusable auth check function — accepts currentSegments to avoid stale closures
  const checkAuth = useCallback(async (currentSegments: string[], showLoading = true) => {
    // Prevent concurrent checks
    if (isChecking.current) {
      console.log("[Auth] Check already in progress, skipping");
      return;
    }

    isChecking.current = true;

    if (showLoading) {
      setLoading(true);
      setIsLoading(true);
    }
    try {
      const session = await authClient.getSession();
      const sessionUser = session?.data?.user ?? null;

      if (sessionUser) {
        setUser(sessionUser);
        hasRedirected.current = false;
        console.log("[Auth Check] User authenticated:", sessionUser.email);
      } else {
        setUser(null);
        // Check if we're already on auth page using the passed-in segments
        const isOnAuthPage = currentSegments.includes("auth");
        console.log("[Auth Check] On auth page:", isOnAuthPage);
        if (!isOnAuthPage && !hasRedirected.current) {
          hasRedirected.current = true;
          try {
            router.replace("/auth" as any);
            console.log("[Auth Check] No user, redirecting to /auth");
          } catch (navError) {
            hasRedirected.current = false;
            console.warn("[Auth Check] Navigation failed (likely not ready):", navError);
          }
        } else {
          console.log("[Auth Check] Already on /auth, skipping redirect");
        }
      }
    } catch (error) {
      console.error("[Auth Check] Error:", error);
    } finally {
      if (showLoading) {
        setLoading(false);
        setIsLoading(false);
      }
      isChecking.current = false;
    }
  }, [setIsLoading]);

  // Initial mount check - run only once
  useEffect(() => {
    console.log("[Auth] Initial mount - checking auth");
    checkAuth(segments, true);
    isInitialMount.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Route change monitoring - skip initial mount
  useEffect(() => {
    if (isInitialMount.current) {
      previousSegments.current = [...segments];
      return;
    }

    // Skip if segments haven't actually changed
    const segStr = segments.join("/");
    const prevStr = previousSegments.current.join("/");
    if (segStr === prevStr) {
      return;
    }

    previousSegments.current = [...segments];
    console.log("[Auth] Route changed to:", currentPath);

    // Don't re-check auth if we just redirected to the auth page
    if (segments.includes("auth")) {
      console.log("[Auth] On auth page, skipping re-check");
      setLoading(false);
      setIsLoading(false);
      return;
    }

    checkAuth(segments, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments]);

  // Interval monitoring (every 10 seconds) - silent checks
  useEffect(() => {
    console.log("[Auth] Starting 10-second interval checks");
    const interval = setInterval(() => {
      console.log("[Auth] Background interval check");
      if (!isChecking.current) {
        checkAuth(previousSegments.current, false);
      }
    }, 10000);

    return () => {
      console.log("[Auth] Clearing interval checks");
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = async () => {
    try {
      await authClient.signOut();
      setUser(null);
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

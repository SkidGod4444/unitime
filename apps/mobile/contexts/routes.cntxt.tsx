"use client";
import { account } from "@/lib/auth";
import { usePathname, useRouter } from "expo-router";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "./auth.cntxt";
import { usePerms } from "./perms.cntxt";

// Combined Interface covering both new constraints and legacy loader support
interface RoutesContextType {
  // Legacy Loader logic
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  showLoader: () => void;
  hideLoader: (path?: string) => void;

  // New Route Guard logic
  isProtectedRoute: boolean;
  isCheckingAuth: boolean;
}

const RoutesContext = createContext<RoutesContextType | undefined>(undefined);

// Rename to RoutesProvider to maintain backward compatibility, or alias it
export const RoutesProvider = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { isOnline } = usePerms();

  // Manual loading state (legacy support)
  const [manualLoading, setManualLoading] = useState(false);

  // Constants from new implementation
  const ProtectedRoutes = ["/profile", "/dash", "/history", "/admin", "/"];
  const isProtectedRoute = ProtectedRoutes.includes(pathname);

  // Combineauth loading with manual loading state
  // If either is true, the app is considered "loading" for consumers like <Loader />
  const isCheckingAuth = authLoading || (isProtectedRoute && !isAuthenticated);
  const isLoading = manualLoading || isCheckingAuth;

  // Legacy showLoader
  const showLoader = useCallback(() => {
    setManualLoading(true);
  }, []);

  // Legacy hideLoader with navigation support
  const hideLoader = useCallback(
    (path?: string) => {
      setManualLoading(false);
      if (path) {
        try {
          router.replace(path as any);
        } catch (e) {
          console.warn("[Routes] Navigation failed:", e);
        }
      } else {
        try {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace("/");
          }
        } catch (e) {
          console.warn("[Routes] Navigation failed:", e);
        }
      }
    },
    [router],
  );

  // New Route Guard Effect Logic
  useEffect(() => {
    if (!isOnline) {
      // User code specified "/offline", but existing file is "no-net.tsx".
      // Keeping user's code as requested:
      // router.replace("/offline");
      return;
    }

    if (!isProtectedRoute || authLoading) return;

    if (!isAuthenticated) {
      console.log("User not authenticated — redirecting to /auth");
      router.replace("/auth");
      return;
    }

    // Only check onboarding if user is authenticated and at root route
    // if (pathname === "/") {
    //   account
    //     .getPrefs()
    //     .then((prefs) => {
    //       console.log("User preferences:", prefs);
    //       if (prefs?.isOnboarded === "false") {
    //         console.log("User not onboarded — redirecting to /onboarding");
    //         // router.replace("/onboarding");
    //       }
    //     })
    //     .catch((err) => {
    //       console.error("Error fetching user preferences:", err);
    //     });
    // }
  }, [
    pathname,
    isAuthenticated,
    authLoading,
    router,
    isProtectedRoute,
    isOnline,
  ]);

  return (
    <RoutesContext.Provider
      value={{
        isLoading,
        setIsLoading: setManualLoading,
        showLoader,
        hideLoader,
        isProtectedRoute,
        isCheckingAuth,
      }}
    >
      {children}
    </RoutesContext.Provider>
  );
};

// Legacy hook export
export const useRoutes = () => {
  const context = useContext(RoutesContext);
  if (!context) {
    throw new Error("useRoutes must be used within a RoutesProvider");
  }
  return context;
};

// New hook alias for compatibility with new code
export const useRouteGuard = useRoutes;
// RouteProvider alias
export const RouteProvider = RoutesProvider;

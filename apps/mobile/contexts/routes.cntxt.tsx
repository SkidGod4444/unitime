"use client";
import { router } from "expo-router";
import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useState
} from "react";

interface RoutesContextType {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  showLoader: () => void;
  hideLoader: (path?: string) => void;
}

const RoutesContext = createContext<RoutesContextType | undefined>(undefined);

export const RoutesProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(false);

  // Show loader by setting state to true
  const showLoader = useCallback(() => {
    setIsLoading(true);
  }, []);

  // Hide loader and either navigate to custom path or go back
  const hideLoader = useCallback((path?: string) => {
    setIsLoading(false);
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
  }, []);

  return (
    <RoutesContext.Provider
      value={{ isLoading, setIsLoading, showLoader, hideLoader }}
    >
      {children}
    </RoutesContext.Provider>
  );
};

// Custom hook to use the routes context
export const useRoutes = (): RoutesContextType => {
  const context = useContext(RoutesContext);
  if (!context) {
    throw new Error("useRoutes must be used within a RoutesProvider");
  }
  return context;
};

"use client";
import { useRouter } from "expo-router";
import {
    createContext,
    ReactNode,
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
  const router = useRouter();

  // Show loader by setting state to true
  const showLoader = () => {
    setIsLoading(true);
  };

  // Hide loader and either navigate to custom path or go back
  const hideLoader = (path?: string) => {
    setIsLoading(false);
    if (path) {
      // If a custom path is provided, navigate to it
      router.replace(path as any);
    } else {
      // If no path provided, go back or to home
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/"); // Fallback to home if no history
      }
    }
  };

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

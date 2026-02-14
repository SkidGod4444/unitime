import { account, getUser } from "@/lib/auth";
import { isInstitutionalEmail } from "@/utils/email.validator";
import { UserT } from "@unitime/types";
import { router } from "expo-router";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { ID } from "react-native-appwrite";

type AuthContextType = {
  isAuthenticated: boolean;
  loading: boolean;
  loggedInUser: UserT | null;
  setLoggedInUser: (user: UserT | null) => void;
  error: string;
  setError: (error: string) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  loading: true,
  loggedInUser: null,
  setLoggedInUser: () => {},
  error: "",
  setError: () => {},
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loggedInUser, setLoggedInUser] = useState<UserT | null>(null);
  const [error, setError] = useState("");
  // const origin = Constants.expoConfig?.extra?.ORIGIN || 'http://localhost:3001';
  const origin = "https://i-present-api.vercel.app";

  async function fetchDbUser(email: string): Promise<UserT | null> {
    try {
      const response = await fetch(`${origin}/v1/user/all`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      if (data.status === 200 && Array.isArray(data.data)) {
        const dbUser = data.data.find((u: any) => u.emailAddress === email);
        return dbUser as UserT;
      }
      return null;
    } catch (err) {
      console.error("Failed to fetch DB user:", err);
      return null;
    }
  }

  async function login(email: string, password: string) {
    try {
      setLoading(true);
      setError("");
      await account.createEmailPasswordSession({ email, password });
      const user = await getUser();

      if (user) {
        // const dbUser = await fetchDbUser(user.email);
        // if (dbUser) {
        //   setLoggedInUser(dbUser);
        // }
        setIsAuthenticated(true);
        router.replace("/(tabs)");
      } else {
        throw new Error("Failed to get user details");
      }
    } catch (err: any) {
      setError(err.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  }

  async function register(email: string, password: string, name: string) {
    if (!isInstitutionalEmail(email)) {
      throw new Error("Please use your institutional email address.");
    }
    try {
      setLoading(true);
      setError("");
      const userId = ID.unique();
      await account.create({ userId, email, password, name });
      await login(email, password);

      // Update user preferences
      try {
        const response = await account.updatePrefs({
          prefs: {
            defaultTheme: "dark",
            isOnboarded: false,
          },
        });
        console.log("Preferences updated:", response);
      } catch (prefError) {
        console.log("Failed to update preferences:", prefError);
      }

      // router.replace("/onboarding");
    } catch (err: any) {
      setError(err.message || "Failed to register");
      setLoading(false);
    }
  }

  async function logout() {
    try {
      setLoading(true);
      setError("");
      await account.deleteSession("current");
      await fetch(`${origin}/v1/user/update/${loggedInUser?.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pushToken: [],
        }),
      });
      setLoggedInUser(null);
      setIsAuthenticated(false);
      router.replace("/auth");
    } catch (err: any) {
      setError(err.message || "Failed to logout");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    const validateSession = async () => {
      try {
        const user = await getUser();

        if (!isMounted) return;

        // Ensure user exists AND has an email (not a guest/anonymous session)
        if (user && user.email) {
          const dbUser = await fetchDbUser(user.email);
          if (isMounted) {
            setLoggedInUser(dbUser);
            setIsAuthenticated(true);
          }
        } else {
          if (isMounted) {
            setIsAuthenticated(false);
            setLoggedInUser(null);
            // Optional: If we want to clear the invalid/guest session
            if (user) {
              await account
                .deleteSession({ sessionId: "current" })
                .catch(() => {});
            }
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setIsAuthenticated(false);
          setLoggedInUser(null);
        }
        console.error("Session validation failed:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    validateSession();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        loading,
        loggedInUser,
        setLoggedInUser,
        error,
        setError,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

import { account, getUser } from "@/lib/auth";
import { setAuthTokenProvider } from "@/lib/auth.token";
import { isInstitutionalEmail } from "@/utils/email.validator";
import { UserT } from "@unitime/types";
import { router } from "expo-router";
import { usePostHog } from "posthog-react-native";
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
  refreshJwt: () => Promise<string | null>;
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
  refreshJwt: async () => null,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loggedInUser, setLoggedInUser] = useState<UserT | null>(null);
  const [error, setError] = useState("");
  const [jwt, setJwt] = useState<string | null>(null);
  const origin = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001";
  const posthog = usePostHog();

  useEffect(() => {
    // Expose a provider so non-React stores can read the current JWT
    setAuthTokenProvider(() => jwt);
  }, [jwt]);

  useEffect(() => {
    if (loggedInUser && posthog) {
      const identifyData: Record<string, any> = {
        name: loggedInUser.name,
        email: loggedInUser.email,
      };
      
      if (loggedInUser.role) {
        identifyData.role = loggedInUser.role;
      }

      posthog.identify(loggedInUser.id, identifyData);
    }
  }, [
    loggedInUser,
    loggedInUser?.id,
    loggedInUser?.name,
    loggedInUser?.email,
    loggedInUser?.role,
    posthog,
  ]);

  async function fetchDbUser(
    email: string,
    token?: string | null,
    appwriteUser?: { $id: string; name: string; email: string } | null,
  ): Promise<UserT | null> {
    try {
      const authToken = token ?? jwt;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }
      const response = await fetch(`${origin}/users?email=${email}`, {
        method: "GET",
        headers,
      });
      // 404 means the user simply doesn't exist in the DB yet — fall through to create them
      if (!response.ok && response.status !== 404) {
        const text = await response.text();
        console.error("DB user fetch failed:", response.status, text);
        return null;
      }

      const data = response.status === 404 ? {} : await response.json();
      console.log("DB user fetch response:", data);
      if (data.user) {
        return data.user as UserT;
      } else {
        // User is authenticated but not in DB — create them now
        if (appwriteUser) {
          console.log("User not in DB, creating...");
          const createRes = await fetch(`${origin}/users/create`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              id: appwriteUser.$id,
              name: appwriteUser.name,
              email: appwriteUser.email,
            }),
          });
          if (createRes.ok) {
            const createData = await createRes.json();
            console.log("User created in DB:", createData);
            return createData.user as UserT;
          } else {
            const errText = await createRes.text();
            console.error(
              "Failed to create user in DB:",
              createRes.status,
              errText,
            );
          }
        }
        return null;
      }
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
        // Generate JWT for authenticating with our backend server
        const jwtResponse = await account.createJWT();
        setJwt(jwtResponse.jwt);

        const dbUser = await fetchDbUser(user.email, jwtResponse.jwt, user);
        if (dbUser) {
          setLoggedInUser(dbUser);
        }
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
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (jwt) {
        headers["Authorization"] = `Bearer ${jwt}`;
      }
      await fetch(`${origin}/user/update/${loggedInUser?.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          pushToken: [],
        }),
      });
      await account.deleteSession("current");
      setJwt(null);
      setLoggedInUser(null);
      if (posthog) {
        posthog.reset();
      }
      setIsAuthenticated(false);
      router.replace("/auth");
    } catch (err: any) {
      setError(err.message || "Failed to logout");
    } finally {
      setLoading(false);
    }
  }

  // Refresh the Appwrite JWT (expires after 15 min) — call before sensitive authenticated requests
  const refreshJwt = async (): Promise<string | null> => {
    try {
      const jwtResponse = await account.createJWT();
      setJwt(jwtResponse.jwt);
      setAuthTokenProvider(() => jwtResponse.jwt);
      return jwtResponse.jwt;
    } catch (err) {
      console.warn("Failed to refresh JWT:", err);
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const validateSession = async () => {
      try {
        const user = await getUser();

        if (!isMounted) return;

        // Ensure user exists AND has an email (not a guest/anonymous session)
        if (user && user.email) {
          // Generate a fresh JWT for the existing session
          const jwtResponse = await account.createJWT();
          if (isMounted) {
            setJwt(jwtResponse.jwt);
          }

          const dbUser = await fetchDbUser(user.email, jwtResponse.jwt, user);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        refreshJwt,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

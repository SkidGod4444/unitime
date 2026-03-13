import { apiFetch } from "@/lib/api";
import { Camera, PermissionStatus } from "expo-camera";
import * as Location from "expo-location";
import * as MediaLibrary from "expo-media-library";
import * as Network from "expo-network";
import * as Notifications from "expo-notifications";
import { Ionicons } from "@expo/vector-icons";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  AppState,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "./auth.cntxt";
import { useLocalStore } from "./localstore.cntxt";

type PermsContextType = {
  isOnline: boolean;
  locationPermission: Location.PermissionStatus | null;
  mediaLibraryPermission: MediaLibrary.PermissionStatus | null;
  notificationPermission: Notifications.PermissionStatus | null;
  cameraPermission: PermissionStatus | null;
  requestLocationPermission: () => Promise<void>;
  requestMediaLibraryPermission: () => Promise<void>;
  requestNotificationPermission: () => Promise<void>;
  requestCameraPermission: () => Promise<void>;
};

const PermsContext = createContext<PermsContextType>({
  isOnline: true,
  locationPermission: null,
  mediaLibraryPermission: null,
  notificationPermission: null,
  cameraPermission: null,
  requestLocationPermission: async () => {},
  requestMediaLibraryPermission: async () => {},
  requestNotificationPermission: async () => {},
  requestCameraPermission: async () => {},
});

export const PermsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { getItem, setItem } = useLocalStore();
  const { loggedInUser } = useAuth();
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [locationPermission, setLocationPermission] =
    useState<Location.PermissionStatus | null>(null);
  const [mediaLibraryPermission, setMediaLibraryPermission] =
    useState<MediaLibrary.PermissionStatus | null>(null);
  const [notificationPermission, setNotificationPermission] =
    useState<Notifications.PermissionStatus | null>(null);
  const [cameraPermission, setCameraPermission] =
    useState<PermissionStatus | null>(null);
  // Hydration flag to avoid initial flicker before we know statuses
  const [permsHydrated, setPermsHydrated] = useState<boolean>(false);
  const [requestingPerms, setRequestingPerms] = useState<boolean>(false);

  const checkConnection = useCallback(async () => {
    try {
      const networkState = await Network.getNetworkStateAsync();
      const online = Boolean(
        networkState.isConnected && networkState.isInternetReachable,
      );
      setIsOnline(online);
      await setItem("isOnline", online.toString());
      if (!networkState.isConnected || !networkState.isInternetReachable) {
        console.warn("Network is offline or not reachable");
      }
    } catch (error) {
      setIsOnline(false);
      await setItem("isOnline", "false");
      console.error("Error checking network state:", error);
    }
  }, [setItem]);

  const checkLocationPermission = useCallback(async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationPermission(status);

      // Only fetch location when app is in foreground/active state
      if (
        status === Location.PermissionStatus.GRANTED &&
        AppState.currentState === "active"
      ) {
        try {
          const location = await Location.getCurrentPositionAsync({});
          console.log("Current location:", location);
          if (loggedInUser) {
            await apiFetch(`/users/${loggedInUser.id}/update`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                coordinates: `${location.coords.latitude},${location.coords.longitude}`,
              }),
            });
          }
        } catch (locationError) {
          // Silently handle location fetch errors when in background
          console.warn(
            "Could not fetch location (app may be in background):",
            locationError,
          );
        }
      }

      return status;
    } catch (error) {
      console.error("Error checking location permission:", error);
      return null;
    }
  }, [loggedInUser]);

  const checkMediaLibraryPermission = useCallback(async () => {
    try {
      const { status } = await MediaLibrary.getPermissionsAsync();
      setMediaLibraryPermission(status);
      return status;
    } catch (error) {
      console.error("Error checking media library permission:", error);
      return null;
    }
  }, []);

  const checkNotificationPermission = useCallback(async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setNotificationPermission(status);
      if (status === Notifications.PermissionStatus.GRANTED) {
        const expoToken = (await Notifications.getExpoPushTokenAsync()).data;
        console.log("Expo Push Token:", expoToken);
        if (loggedInUser) {
          await apiFetch(`/users/${loggedInUser.id}/update`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              expoPushToken: expoToken,
            }),
          });
        }
      }
      return status;
    } catch (error) {
      console.error("Error checking notification permission:", error);
      return null;
    }
  }, [loggedInUser]);

  const checkCameraPermission = useCallback(async () => {
    try {
      const result = await Camera.getCameraPermissionsAsync();
      if (result && result.status) {
        setCameraPermission(result.status);
        return result.status;
      }
      return null;
    } catch (error) {
      console.error("Error checking camera permission:", error);
      return null;
    }
  }, []);

  const requestLocationPermission = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status);
    } catch (error) {
      console.error("Error requesting location permission:", error);
    }
  }, []);

  const requestMediaLibraryPermission = useCallback(async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      setMediaLibraryPermission(status);
    } catch (error) {
      console.error("Error requesting media library permission:", error);
    }
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setNotificationPermission(status);
    } catch (error) {
      console.error("Error requesting notification permission:", error);
    }
  }, []);

  const requestCameraPermission = useCallback(async () => {
    try {
      const result = await Camera.requestCameraPermissionsAsync();
      if (result && result.status) {
        setCameraPermission(result.status);
      }
    } catch (error) {
      console.error("Error requesting camera permission:", error);
    }
  }, []);

  const refreshPermissions = useCallback(async () => {
    await checkConnection();
    const location = await checkLocationPermission();
    const media = await checkMediaLibraryPermission();
    const notifications = await checkNotificationPermission();
    const camera = await checkCameraPermission();
    return { location, media, notifications, camera } as const;
  }, [
    checkConnection,
    checkLocationPermission,
    checkMediaLibraryPermission,
    checkNotificationPermission,
    checkCameraPermission,
  ]);

  const computeAllGranted = useCallback(
    (s?: {
      location: Location.PermissionStatus | null;
      media: MediaLibrary.PermissionStatus | null;
      notifications: Notifications.PermissionStatus | null;
      camera: PermissionStatus | null;
    }) => {
      const loc = s ? s.location : locationPermission;
      const med = s ? s.media : mediaLibraryPermission;
      const noti = s ? s.notifications : notificationPermission;
      const cam = s ? s.camera : cameraPermission;
      const LIMITED =
        (MediaLibrary.PermissionStatus as any)?.LIMITED ?? ("limited" as any);
      const mediaGranted =
        med === MediaLibrary.PermissionStatus.GRANTED || (med as any) === LIMITED;
      return (
        loc === Location.PermissionStatus.GRANTED &&
        mediaGranted &&
        noti === Notifications.PermissionStatus.GRANTED &&
        cam === PermissionStatus.GRANTED
      );
    },
    [
      locationPermission,
      mediaLibraryPermission,
      notificationPermission,
      cameraPermission,
    ],
  );

  const requestAllPermissionsSequentially = useCallback(async () => {
    try {
      setRequestingPerms(true);

      await requestNotificationPermission();
      await requestLocationPermission();
      await requestCameraPermission();
      await requestMediaLibraryPermission();
      // Refresh statuses after requests; modal visibility is derived
      await refreshPermissions();
    } finally {
      setRequestingPerms(false);
    }
  }, [
    requestNotificationPermission,
    requestLocationPermission,
    requestCameraPermission,
    requestMediaLibraryPermission,
    refreshPermissions,
    computeAllGranted,
  ]);

  useEffect(() => {
    const initializeState = async () => {
      const storedOnline = await getItem("isOnline");
      if (storedOnline !== null) {
        setIsOnline(storedOnline === "true");
      }
      await refreshPermissions();
      // Hydration done; visibility is fully derived from current statuses
      setPermsHydrated(true);
    };

    void initializeState();

    const subscription = AppState.addEventListener(
      "change",
      async (nextAppState) => {
        if (nextAppState === "active") {
          await refreshPermissions();
          console.log("App became active - refreshed permission status");
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [getItem, refreshPermissions, computeAllGranted]);

  return (
    <PermsContext.Provider
      value={{
        isOnline,
        locationPermission,
        mediaLibraryPermission,
        notificationPermission,
        cameraPermission,
        requestLocationPermission,
        requestMediaLibraryPermission,
        requestNotificationPermission,
        requestCameraPermission,
      }}
    >
      {children}

      {/* Permissions Explainer Modal (blocks app until all granted) */}
      <Modal
        visible={permsHydrated && !computeAllGranted()}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.iconContainer}>
              <Ionicons name="key-outline" size={32} color="#2563eb" />
            </View>
            <Text style={styles.titleText}>Permissions Required</Text>
            <Text style={styles.messageText}>
              We request these permissions to deliver core features:
            </Text>
            <View style={{ width: "100%", marginTop: 8 }}>
              <Text style={styles.bulletText}>
                • Notifications: attendance alerts and updates
              </Text>
              <Text style={styles.bulletText}>
                • Location: geofenced attendance validation
              </Text>
              <Text style={styles.bulletText}>
                • Camera: QR scan for check-ins
              </Text>
              <Text style={styles.bulletText}>
                • Media Library: export and file attachments
              </Text>
            </View>

            {!computeAllGranted() ? (
              <TouchableOpacity
                onPress={requestAllPermissionsSequentially}
                disabled={requestingPerms}
                style={[styles.button, requestingPerms && { opacity: 0.7 }]}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>
                  {requestingPerms ? "Requesting…" : "Continue"}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Modal>
    </PermsContext.Provider>
  );
};

export const usePerms = () => useContext(PermsContext);

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    zIndex: 9999,
    elevation: 9999,
  },
  modalContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  titleText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
    textAlign: "center",
  },
  messageText: {
    fontSize: 14,
    color: "#4b5563",
    textAlign: "center",
  },
  bulletText: {
    fontSize: 13,
    color: "#374151",
    marginTop: 4,
  },
  button: {
    marginTop: 16,
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 15,
  },
});

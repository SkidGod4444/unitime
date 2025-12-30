import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import * as Network from "expo-network";
import * as Location from "expo-location";
import * as MediaLibrary from "expo-media-library";
import * as Notifications from "expo-notifications";
import { AppState } from "react-native";
import { useLocalStore } from "./localstore.cntxt";

type PermsContextType = {
  isOnline: boolean;
  locationPermission: Location.PermissionStatus | null;
  mediaLibraryPermission: MediaLibrary.PermissionStatus | null;
  notificationPermission: Notifications.PermissionStatus | null;
  requestLocationPermission: () => Promise<void>;
  requestMediaLibraryPermission: () => Promise<void>;
  requestNotificationPermission: () => Promise<void>;
};

const PermsContext = createContext<PermsContextType>({
  isOnline: true,
  locationPermission: null,
  mediaLibraryPermission: null,
  notificationPermission: null,
  requestLocationPermission: async () => {},
  requestMediaLibraryPermission: async () => {},
  requestNotificationPermission: async () => {},
});

export const PermsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { getItem, setItem } = useLocalStore();
  // const { loggedInUser } = useAuth();
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [locationPermission, setLocationPermission] =
    useState<Location.PermissionStatus | null>(null);
  const [mediaLibraryPermission, setMediaLibraryPermission] =
    useState<MediaLibrary.PermissionStatus | null>(null);
  const [notificationPermission, setNotificationPermission] =
    useState<Notifications.PermissionStatus | null>(null);

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
      if (status === Location.PermissionStatus.GRANTED) {
        const location = await Location.getCurrentPositionAsync({});
        console.log("Current location:", location);
        //   await fetch(
        //     `${process.env.EXPO_PUBLIC_ORIGIN}/v1/user/update/${loggedInUser?.$id}`,
        //     {
        //       method: "PUT",
        //       headers: {
        //         "Content-Type": "application/json",
        //       },
        //       body: JSON.stringify({
        //         cordinates: [`${location.coords.latitude}`,`${location.coords.longitude}`],
        //       }),
        //     },
        //   );
      }
      setLocationPermission(status);
      return status;
    } catch (error) {
      console.error("Error checking location permission:", error);
      return null;
    }
  }, []);

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
        //   await fetch(
        //     `${process.env.EXPO_PUBLIC_ORIGIN}/v1/user/update/${loggedInUser?.$id}`,
        //     {
        //       method: "PUT",
        //       headers: {
        //         "Content-Type": "application/json",
        //       },
        //       body: JSON.stringify({
        //         pushToken: [expoToken],
        //       }),
        //     },
        //   );
      }
      return status;
    } catch (error) {
      console.error("Error checking notification permission:", error);
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

  const checkAllPermissions = useCallback(async () => {
    await checkConnection();

    const locStatus = await checkLocationPermission();
    if (locStatus !== Location.PermissionStatus.GRANTED) {
      await requestLocationPermission();
    }

    const mediaStatus = await checkMediaLibraryPermission();
    if (mediaStatus !== MediaLibrary.PermissionStatus.GRANTED) {
      await requestMediaLibraryPermission();
    }

    const notifStatus = await checkNotificationPermission();
    if (notifStatus !== Notifications.PermissionStatus.GRANTED) {
      await requestNotificationPermission();
    }
  }, [
    checkConnection,
    checkLocationPermission,
    requestLocationPermission,
    checkMediaLibraryPermission,
    requestMediaLibraryPermission,
    checkNotificationPermission,
    requestNotificationPermission,
  ]);

  const refreshPermissions = useCallback(async () => {
    await checkConnection();
    await checkLocationPermission();
    await checkMediaLibraryPermission();
    await checkNotificationPermission();
  }, [
    checkConnection,
    checkLocationPermission,
    checkMediaLibraryPermission,
    checkNotificationPermission,
  ]);

  useEffect(() => {
    const initializeState = async () => {
      const storedOnline = await getItem("isOnline");
      if (storedOnline !== null) {
        setIsOnline(storedOnline === "true");
      }
      await checkAllPermissions();
    };

    initializeState();

    const interval = setInterval(() => {
      refreshPermissions();
      console.log("Permissions and connectivity refreshed...");
    }, 10000);

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        checkAllPermissions();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [getItem, checkAllPermissions, refreshPermissions]);

  return (
    <PermsContext.Provider
      value={{
        isOnline,
        locationPermission,
        mediaLibraryPermission,
        notificationPermission,
        requestLocationPermission,
        requestMediaLibraryPermission,
        requestNotificationPermission,
      }}
    >
      {children}
    </PermsContext.Provider>
  );
};

export const usePerms = () => useContext(PermsContext);

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Updates from "expo-updates";
import { useGlobalSearchParams, usePathname } from "expo-router";
import {
  PostHogCustomStorage,
  PostHogProvider,
  usePostHog,
} from "posthog-react-native";
import { ReactNode, useEffect } from "react";

export const posthogCustomStorage: PostHogCustomStorage = {
  getItem: async (key) => {
    try {
      const value = await AsyncStorage.getItem(key);
      return value;
    } catch {
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {}
  },
};

/**
 * Silent component to track screen views automatically using Expo Router hooks.
 * Must be rendered inside <PostHogProvider>.
 */
function ScreenTracker() {
  const pathname = usePathname();
  const searchParams = useGlobalSearchParams();
  const posthog = usePostHog();

  useEffect(() => {
    if (pathname && posthog) {
      posthog.capture("$screen", {
        $screen_name: pathname,
        ...searchParams,
      });
    }
  }, [pathname, searchParams, posthog]);

  return null;
}

export function PostHogAnalyticsProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <PostHogProvider
      apiKey={process.env.EXPO_PUBLIC_POSTHOG_API_KEY as string}
      options={{
        host: process.env.EXPO_PUBLIC_POSTHOG_HOST as string,
        customStorage: posthogCustomStorage,
      }}
    >
      <BootstrapSuperProps />
      <ScreenTracker />
      {children}
    </PostHogProvider>
  );
}

function BootstrapSuperProps() {
  const posthog = usePostHog();
  useEffect(() => {
    if (!posthog) return;
    try {
      const superProps: Record<string, any> = {
        ota_update_id: Updates.updateId ?? "embedded",
        ota_runtime_version: Updates.runtimeVersion ?? null,
        ota_channel: (Updates as any).channel ?? null,
      };
      // Register as super properties so they attach to all future events
      (posthog as any).register?.(superProps);
    } catch {}
  }, [posthog]);
  return null;
}

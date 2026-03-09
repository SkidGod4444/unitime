import { AttendanceListener } from "@/components/attendance.listener";
import BannedUserPopup from "@/components/banned.users.popup";
import { PostHogAnalyticsProvider } from "@/components/posthog.provider";
import ProfileCompletionPopup from "@/components/profile.completion.popup";
import QRScannerWidget from "@/components/qr.scanner.widget";
import { AlarmsProvider } from "@/contexts/alarms.cntxt";
import { AuthProvider, useAuth } from "@/contexts/auth.cntxt";
import { LocalStoreProvider } from "@/contexts/localstore.cntxt";
import { PermsProvider } from "@/contexts/perms.cntxt";
import { RoutesProvider } from "@/contexts/routes.cntxt";
import { StoreProvider } from "@/contexts/store.cntxt";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { ReactNode } from "react";
import { useColorScheme as useNWColorScheme } from "nativewind";
import { useThemeStore } from "@/lib/store";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "./globals.css";
import Loader from "./loader";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes cache by default
    },
  },
});

/**
 * Inner wrapper that reads the logged-in user from AuthContext and passes
 * the userId to AlarmsProvider. Must be rendered inside <AuthProvider>.
 */
function AlarmsInnerProvider({ children }: { children: ReactNode }) {
  const { loggedInUser } = useAuth();
  return (
    <AlarmsProvider userId={loggedInUser?.id ?? null}>
      {children}
    </AlarmsProvider>
  );
}

function AppContent() {
  const [fontsLoaded] = useFonts({
    "Lora-Regular": require("../assets/fonts/Lora-Regular.ttf"),
    "Lora-Bold": require("../assets/fonts/Lora-Bold.ttf"),
    "Lora-Italic": require("../assets/fonts/Lora-Italic.ttf"),
    "Lora-BoldItalic": require("../assets/fonts/Lora-BoldItalic.ttf"),
    "Lora-Medium": require("../assets/fonts/Lora-Medium.ttf"),
    "Lora-MediumItalic": require("../assets/fonts/Lora-MediumItalic.ttf"),
    "Lora-SemiBold": require("../assets/fonts/Lora-SemiBold.ttf"),
    "Lora-SemiBoldItalic": require("../assets/fonts/Lora-SemiBoldItalic.ttf"),
  });

  const segments = useSegments() as string[];
  const { setColorScheme } = useNWColorScheme();
  const appTheme = useThemeStore((s) => s.theme);

  React.useEffect(() => {
    setColorScheme(appTheme);
  }, [appTheme, setColorScheme]);

  const isHiddenScreen =
    segments.includes("qr-scanner") ||
    segments.includes("chat") ||
    segments.includes("tap-to-mark") ||
    segments.includes("schedule") ||
    segments.includes("auth") ||
    segments.includes("alarm") ||
    segments.includes("student-profile-form") ||
    segments.includes("attendance-session-form") ||
    segments.includes("attendance-session-history") ||
    segments.includes("loader") ||
    segments.includes("admin");

  console.log("Fonts loaded:", fontsLoaded);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LocalStoreProvider>
        <AuthProvider>
          <RoutesProvider>
            <StoreProvider>
              <AlarmsInnerProvider>
                <PermsProvider>
                  <AttendanceListener />
                  <StatusBar
                    style={appTheme === "dark" ? "light" : "dark"}
                    animated
                  />
                  <BannedUserPopup />
                  <ProfileCompletionPopup />

                  <ThemeProvider
                    value={appTheme === "dark" ? DarkTheme : DefaultTheme}
                  >
                    <Stack screenOptions={{ headerShown: false }} />
                  </ThemeProvider>
                  {!isHiddenScreen && <QRScannerWidget />}
                  <Loader />
                </PermsProvider>
              </AlarmsInnerProvider>
            </StoreProvider>
          </RoutesProvider>
        </AuthProvider>
      </LocalStoreProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <PostHogAnalyticsProvider>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <AppContent />
        </SafeAreaProvider>
      </QueryClientProvider>
    </PostHogAnalyticsProvider>
  );
}

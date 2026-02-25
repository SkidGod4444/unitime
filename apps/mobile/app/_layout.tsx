import BannedUserPopup from "@/components/banned.users.popup";
import ProfileCompletionPopup from "@/components/profile.completion.popup";
import QRScannerWidget from "@/components/qr.scanner.widget";
import { AuthProvider } from "@/contexts/auth.cntxt";
import { LocalStoreProvider } from "@/contexts/localstore.cntxt";
import { PermsProvider } from "@/contexts/perms.cntxt";
import { RoutesProvider } from "@/contexts/routes.cntxt";
import { useFonts } from "expo-font";
import { Stack, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "./globals.css";
import Loader from "./loader";
import { StoreProvider } from "@/contexts/store.cntxt";

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
            <PermsProvider>
              <StatusBar style={"dark"} animated />

              <BannedUserPopup />
              {!isHiddenScreen && <ProfileCompletionPopup />}

              <Stack screenOptions={{ headerShown: false }} />
              {!isHiddenScreen && <QRScannerWidget />}
              <Loader />
            </PermsProvider>
            </StoreProvider>
          </RoutesProvider>
        </AuthProvider>
      </LocalStoreProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

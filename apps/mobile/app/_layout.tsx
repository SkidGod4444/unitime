import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import "./globals.css";
import { StatusBar } from "expo-status-bar";
import { LocalStoreProvider } from "@/contexts/localstore.cntxt";
import { useEffect } from "react";
import { PermsProvider } from "@/contexts/perms.cntxt";

export default function RootLayout() {
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

  return <Stack />;

  function AppContent({ fontsLoaded }: { fontsLoaded: boolean }) {
    // useEffect(() => {
    //   if (fontsLoaded && !loading) {
    //     SplashScreen.hideAsync();
    //   }
    // }, [fontsLoaded, loading]);

    // if (!fontsLoaded || loading) {
    //   return null;
    // }

    // console.log("Theme provider initialized with theme:", theme);
    return (
      <LocalStoreProvider>
        <PermsProvider>
          <StatusBar style={"dark"} animated />
          <Stack screenOptions={{ headerShown: false }} />
        </PermsProvider>
      </LocalStoreProvider>
    );
  }
}

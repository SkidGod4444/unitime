import QRScannerWidget from "@/components/qr.scanner.widget";
import { LocalStoreProvider } from "@/contexts/localstore.cntxt";
import { PermsProvider } from "@/contexts/perms.cntxt";
import { useFonts } from "expo-font";
import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "./globals.css";

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

  return <AppContent fontsLoaded={fontsLoaded} />;

  function AppContent({ fontsLoaded }: { fontsLoaded: boolean }) {
    const pathname = usePathname();
    const isQRScannerScreen =
      pathname.includes("qr-scanner") || pathname.includes("chat");

    // useEffect(() => {
    //   if (fontsLoaded && !loading) {
    //     SplashScreen.hideAsync();
    //   }
    // }, [fontsLoaded, loading]);

    // if (!fontsLoaded || loading) {
    //   return null;
    // }

    // console.log("Theme provider initialized with theme:", theme);```````
    console.log("Fonts loaded:", fontsLoaded);
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <LocalStoreProvider>
          <PermsProvider>
            <StatusBar style={"dark"} animated />
            <Stack screenOptions={{ headerShown: false }} />
            {!isQRScannerScreen && <QRScannerWidget />}
          </PermsProvider>
        </LocalStoreProvider>
      </GestureHandlerRootView>
    );
  }
}

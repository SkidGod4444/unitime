import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { dbClient } from "@unitime/db/client";

export default function Index() {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

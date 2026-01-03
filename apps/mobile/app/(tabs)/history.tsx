import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "react-native";

export default function History() {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <Text>History</Text>
    </SafeAreaView>
  );
}

import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "react-native";

export default function Index() {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <Text>Hello World</Text>
    </SafeAreaView>
  );
}

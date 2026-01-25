import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "react-native";
import { Link } from "expo-router";

export default function Chats() {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <Text>Chats</Text>
      <Link href="/chat">
        <Text className="text-blue-500">Go to Chat</Text>
      </Link>
    </SafeAreaView>
  );
}

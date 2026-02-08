import { useRoutes } from "@/contexts/routes.cntxt";
import { ActivityIndicator, View } from "react-native";

export default function Loader() {
  const { isLoading } = useRoutes();

  if (!isLoading) return null;

  return (
    <View className="absolute inset-0 z-50 flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color="#000000" />
    </View>
  );
}

import { useEffect } from "react";
import * as QuickActions from "expo-quick-actions";
import { useQuickActionCallback } from "expo-quick-actions/hooks";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import * as Updates from "expo-updates";

export default function QuickActionsListener() {
  useEffect(() => {
    QuickActions.setItems([
      {
        id: "clear_cache",
        title: "Clear Cache",
        subtitle: "Removes all app local data",
        icon: "symbol:trash",
        params: { action: "clear_cache" },
      },
    ]);
  }, []);

  useQuickActionCallback(async (action) => {
    if (
      action.id === "clear_cache" ||
      action?.params?.action === "clear_cache"
    ) {
      try {
        const lastClearedStr = await AsyncStorage.getItem(
          "last_clear_cache_time",
        );
        if (lastClearedStr) {
          const lastCleared = parseInt(lastClearedStr, 10);
          const now = Date.now();
          // Rate limit: 24 hours (24 * 60 * 60 * 1000 ms)
          const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
          if (now - lastCleared < TWENTY_FOUR_HOURS) {
            const hoursLeft = Math.ceil(
              (TWENTY_FOUR_HOURS - (now - lastCleared)) / (60 * 60 * 1000),
            );
            Alert.alert(
              "Rate Limit Exceeded",
              `You can only clear the cache once every 24 hours. Please try again in ${hoursLeft} hour(s).`,
            );
            return;
          }
        }
      } catch (e) {
        console.error("Failed to check rate limit:", e);
      }

      Alert.alert(
        "Clear Cache",
        "Are you sure you want to clear all app local data? You will be logged out.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Clear",
            style: "destructive",
            onPress: async () => {
              try {
                // Clear the AsyncStorage (equivalent to app local storage)
                await AsyncStorage.clear();

                // Record the time of the clear to enforce the rate limit
                await AsyncStorage.setItem(
                  "last_clear_cache_time",
                  Date.now().toString(),
                );

                Alert.alert("Success", "Cache cleared. App will now restart.", [
                  {
                    text: "OK",
                    onPress: async () => {
                      try {
                        await Updates.reloadAsync();
                      } catch (e) {
                        // Note: Updates.reloadAsync() might not be supported in Expo Go or some Dev Client environments
                        console.log(
                          "Could not reload async. User needs to restart manually.",
                          e,
                        );
                      }
                    },
                  },
                ]);
              } catch (e) {
                console.error("Failed to clear cache:", e);
                Alert.alert("Error", "Could not clear local data.");
              }
            },
          },
        ],
      );
    }
  });

  return null;
}

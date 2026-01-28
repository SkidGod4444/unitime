import { Feather } from '@expo/vector-icons';
import * as Network from 'expo-network';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NoNetScreen() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);

  const checkConnection = async () => {
    setIsChecking(true);
    // Add a small delay for better UX so the user sees something is happening
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    try {
      const networkState = await Network.getNetworkStateAsync();
      if (networkState.isConnected && networkState.isInternetReachable) {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/');
        }
      } else {
        // Optional: Show a toast or just let the user try again
      }
    } catch (error) {
      console.error("Failed to check network status", error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Initial check on mount
    checkConnection();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-background justify-center items-center px-6">
      <View className="items-center space-y-6">
        <View className="bg-blue-50 p-6 rounded-full">
          <Feather name="wifi-off" size={48} color="#1D4ED8" />
        </View>

        <View className="items-center space-y-2">
          <Text className="text-2xl font-bold text-dark text-center">
            No Internet Connection
          </Text>
          <Text className="text-base text-accent text-center px-4">
            Please check your connection and try again.
          </Text>
        </View>

        <TouchableOpacity
          onPress={checkConnection}
          disabled={isChecking}
          className={`mt-4 px-8 py-3 rounded-xl bg-primary active:bg-primary-dark w-full max-w-[200px] flex-row justify-center items-center ${
            isChecking ? 'opacity-70' : ''
          }`}
        >
          {isChecking ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-lg">Retry</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

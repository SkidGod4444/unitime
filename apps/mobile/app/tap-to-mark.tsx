import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    Easing,
    FadeInDown,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TapToMarkScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  // Animation values
  const pulseScale = useSharedValue(1);
  const rippleScale = useSharedValue(0);
  const successScale = useSharedValue(0);
  const contentOpacity = useSharedValue(1);

  // Start pulsing animation on mount
  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const handlePress = async () => {
    if (status !== 'idle') return;

    // Start loading
    setStatus('loading');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Stop pulse, shrink slightly
    pulseScale.value = withTiming(0.95, { duration: 200 });

    // Simulate API call
    setTimeout(async () => {
      // Success triggers
      setStatus('success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Animations for success
      pulseScale.value = withSpring(1);
      rippleScale.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
      contentOpacity.value = withTiming(0, { duration: 300 });
      successScale.value = withSpring(1, { damping: 12 });
      
      // Optional: Auto go back or just let user enjoy the success state
      // setTimeout(() => router.back(), 2000);
      setTimeout(() => {
        router.replace('/');
      }, 5000);
    }, 2000);
  };

  const rippleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: interpolate(rippleScale.value, [0, 1], [0.8, 4]) }],
      opacity: interpolate(rippleScale.value, [0, 0.5, 1], [0.6, 0.4, 0]),
    };
  });

  const buttonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: status === 'idle' ? pulseScale.value : 1 }],
    };
  });

  const successIconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: successScale.value }],
      opacity: successScale.value,
    };
  });

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-6 py-4 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()} className="p-2 bg-white rounded-full shadow-sm">
          <Feather name="arrow-left" size={24} color="#18181B" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-dark font-lora">Attendance</Text>
        <View className="w-10" />
      </View>

      {/* Main Content */}
      <View className="flex-1 justify-center items-center">
        
        {/* Context Info */}
        <View className="absolute top-10 items-center w-full px-8">
          <Text className="text-sm font-semibold text-primary mb-1 uppercase tracking-wider">Current Session</Text>
          <Text className="text-3xl font-bold text-dark text-center mb-2 font-lora">Advanced Mathematics</Text>
          <View className="flex-row items-center bg-blue-50 px-3 py-1.5 rounded-full">
            <Feather name="clock" size={14} color="#2563EB" />
            <Text className="text-blue-600 ml-1.5 font-medium">10:00 AM - 11:30 AM</Text>
          </View>
        </View>

        {/* Interactive Button */}
        <View className="items-center justify-center h-80 w-full">
          {/* Ripple Effect (Behind) */}
          <Animated.View 
            className="absolute w-64 h-64 rounded-full bg-blue-100" 
            style={rippleStyle}
          />

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handlePress}
            disabled={status !== 'idle'}
          >
            <Animated.View 
              style={buttonStyle}
              className={`w-64 h-64 rounded-full items-center justify-center shadow-lg shadow-blue-200/50 ${
                status === 'success' ? 'bg-green-500' : 'bg-primary'
              }`}
            >
              {status === 'success' ? (
                <Animated.View style={successIconStyle}>
                  <Feather name="check" size={80} color="white" />
                </Animated.View>
              ) : (
                <View className="items-center">
                  <Ionicons name="finger-print" size={64} color="white" className="opacity-90" />
                  <Text className="text-white font-semibold text-xl mt-4">
                    {status === 'loading' ? 'Verifying...' : 'Tap to Mark'}
                  </Text>
                  {status === 'loading' && (
                     <Text className="text-blue-100 text-sm mt-2">Checking location...</Text>
                  )}
                </View>
              )}
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* Footer Status Text */}
        <View className="absolute bottom-20">
          {status === 'success' ? (
             <Animated.Text 
               entering={FadeInDown.springify()} 
               className="text-green-600 font-bold text-lg"
             >
               Attendance Marked Successfully!
             </Animated.Text>
          ) : (
            <Text className="text-accent text-center px-10">
              Please ensure you are within the class premises to mark attendance.
            </Text>
          )}
        </View>

      </View>
    </SafeAreaView>
  );
}

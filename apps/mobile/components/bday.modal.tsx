import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface BirthdayModalProps {
  visible: boolean;
  name: string;
  onClose: () => void;
}

const { width, height } = Dimensions.get("window");

const ConfettiParticle = ({
  x,
  y,
  color,
  delay,
}: {
  x: number;
  y: number;
  color: string;
  delay: number;
}) => {
  const animY = useRef(new Animated.Value(-20)).current;
  const animX = useRef(new Animated.Value(x)).current;
  const animRot = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(animY, {
          toValue: height + 20,
          duration: 2500 + Math.random() * 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(animX, {
          toValue: x + (Math.random() - 0.5) * 100,
          duration: 2500 + Math.random() * 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(animRot, {
          toValue: 1,
          duration: 2500 + Math.random() * 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay, x]);

  const spin = animRot.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: 8,
        height: 16,
        backgroundColor: color,
        transform: [
          { translateX: animX },
          { translateY: animY },
          { rotate: spin },
        ],
        borderRadius: 4,
      }}
    />
  );
};

export const BirthdayModal: React.FC<BirthdayModalProps> = ({
  visible,
  name,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scale.setValue(0.8);
      opacity.setValue(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  const confettiColors = [
    "#EF4444",
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#8B5CF6",
  ];
  const particles = Array.from({ length: 50 }).map((_, i) => ({
    id: i,
    x: Math.random() * width,
    y: Math.random() * height * 0.5,
    color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
    delay: Math.random() * 1000,
  }));

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
    >
      <View className="flex-1 bg-black/60 items-center justify-center relative overflow-hidden">
        {particles.map((p) => (
          <ConfettiParticle key={p.id} {...p} />
        ))}

        <Animated.View
          style={{
            transform: [{ scale }],
            opacity,
            paddingBottom: insets.bottom,
          }}
          className="w-[85%] max-w-[340px]"
        >
          <View className="bg-white dark:bg-zinc-900 rounded-3xl p-6 items-center shadow-2xl overflow-hidden relative border border-gray-100 dark:border-zinc-800">
            {/* Background design accents */}
            <View className="absolute -top-10 -right-10 w-32 h-32 bg-pink-100 dark:bg-pink-900/30 rounded-full blur-2xl opacity-50" />
            <View className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-100 dark:bg-blue-900/30 rounded-full blur-2xl opacity-50" />

            <View className="h-24 w-24 bg-pink-50 dark:bg-pink-900/20 rounded-full items-center justify-center mb-6 border-8 border-white dark:border-zinc-900 shadow-sm relative z-10">
              <Ionicons name="gift" size={48} color="#EC4899" />
            </View>

            <Text className="text-3xl font-bold font-lora text-zinc-900 dark:text-zinc-100 text-center mb-2">
              Happy Birthday!
            </Text>

            <Text className="text-xl font-semibold text-pink-500 mb-4 text-center">
              {name.split(" ")[0]} 🎂
            </Text>

            <Text className="text-gray-500 dark:text-zinc-400 text-center leading-6 mb-8 px-2 font-medium">
              Wishing you a fantastic day filled with joy, laughter, and amazing
              moments. Have a great one!
            </Text>

            <TouchableOpacity
              onPress={onClose}
              className="w-full bg-primary py-4 rounded-full items-center active:scale-95 transition-transform"
            >
              <Text className="text-white font-bold text-base">
                Thank You! 🎉
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

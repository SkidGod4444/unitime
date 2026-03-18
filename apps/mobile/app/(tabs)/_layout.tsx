import { colors } from "@/utils/constants";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TabBarIcons = ({
  focused,
  icon,
  size,
}: {
  focused: boolean;
  icon: any;
  size: number;
}) => {
  return (
    <View
      className={`justify-center items-center w-11 h-11 ${focused && "rounded-xl bg-accent/30"}`}
    >
      <Ionicons
        name={icon}
        size={size}
        color={focused ? "white" : colors.accent}
      />
    </View>
  );
};

const NoEffectTabButton = ({ children, onPress }: any) => {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={null}
      className="flex-1 flex flex-col items-center justify-center"
    >
      {children}
    </Pressable>
  );
};

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  // On Android, insets.bottom > 0 means the device has system button navigation
  // (back, home, recent apps). We add extra margin to avoid overlap.
  const androidBottomMargin = insets.bottom > 0 ? insets.bottom + 5 : 15;

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        tabBarShowLabel: false,
        headerShown: false,
        tabBarStyle: {
          height: 60,
          paddingBottom: 0,
          backgroundColor: colors["dark-accent"],
          borderColor: colors.secondary,
          borderWidth: 2,
          paddingTop: 0,
          borderRadius: 20,
          marginBottom: Platform.OS === "ios" ? 35 : androidBottomMargin,
          marginHorizontal: 15,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexDirection: "row",
          position: "absolute",
          borderTopWidth: 1,
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.5,
              shadowRadius: 2,
              overflow: "hidden",
            },
            android: {
              elevation: 8,
            },
          }),
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabBarIcons
              focused={focused}
              icon={focused ? "library" : "library-outline"}
              size={24}
            />
          ),
          tabBarButton: (props) => <NoEffectTabButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabBarIcons
              focused={focused}
              icon={focused ? "time" : "time-outline"}
              size={24}
            />
          ),
          tabBarButton: (props) => <NoEffectTabButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="notify"
        options={{
          title: "Notify",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabBarIcons
              focused={focused}
              icon={focused ? "notifications" : "notifications-outline"}
              size={24}
            />
          ),
          tabBarButton: (props) => <NoEffectTabButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="annc"
        options={{
          title: "Announcement",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabBarIcons
              focused={focused}
              icon={focused ? "at" : "at-outline"}
              size={24}
            />
          ),
          tabBarButton: (props) => <NoEffectTabButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: "Chats",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabBarIcons
              focused={focused}
              icon={focused ? "chatbubbles" : "chatbubbles-outline"}
              size={24}
            />
          ),
          tabBarButton: (props) => <NoEffectTabButton {...props} />,
        }}
      />
    </Tabs>
  );
}

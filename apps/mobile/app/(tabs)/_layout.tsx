import React from "react";
import { Tabs } from "expo-router";
import { View, Platform, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/utils/constants";

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
          marginBottom: Platform.OS === "ios" ? 35 : 5,
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
        name="notice"
        options={{
          title: "Notice",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabBarIcons
              focused={focused}
              icon={focused ? "megaphone" : "megaphone-outline"}
              size={24}
            />
          ),
          tabBarButton: (props) => <NoEffectTabButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
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
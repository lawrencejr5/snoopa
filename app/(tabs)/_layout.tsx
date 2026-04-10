import { Tabs } from "expo-router";
import React from "react";

import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { Image } from "react-native";

export default function TabLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[theme].text,
        tabBarInactiveTintColor: Colors[theme].text_secondary,
        headerShown: false,
        tabBarStyle: {
          elevation: 0,
          borderTopWidth: 0,
          backgroundColor: Colors[theme].background,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontFamily: "FontMedium",
          fontSize: 11,
          letterSpacing: 0.3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <Image
              source={require("../../assets/icons/ai-assistant.png")}
              style={{
                height: 24,
                width: 24,
                tintColor: focused
                  ? Colors[theme].primary
                  : Colors[theme].text_secondary,
              }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="watchlist"
        options={{
          title: "Watchlist",
          tabBarIcon: ({ focused }) => (
            <Image
              source={require("../../assets/icons/eyes.png")}
              style={{
                height: 22,
                width: 22,
                tintColor: focused
                  ? Colors[theme].primary
                  : Colors[theme].text_secondary,
              }}
              resizeMode="contain"
            />
          ),
        }}
      />
    </Tabs>
  );
}

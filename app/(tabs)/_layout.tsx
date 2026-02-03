import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";
import React from "react";

import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { Image } from "react-native";

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[theme].text_secondary,
        headerShown: false,
        tabBarStyle: {
          elevation: 0,
          borderTopWidth: 0,
          backgroundColor: Colors[theme].background,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Agent",
          tabBarIcon: ({ focused }) => (
            <Image
              source={require("../../assets/icons/ai-assistant.png")}
              style={{
                height: 30,
                width: 30,
                tintColor: focused ? Colors[theme].primary : "#797979",
              }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: "Watchlist",
          tabBarIcon: ({ focused }) => (
            <Image
              source={require("../../assets/icons/eyes.png")}
              style={{
                height: 25,
                width: 25,
                tintColor: focused ? Colors[theme].primary : "#797979",
              }}
              resizeMode="contain"
            />
          ),
        }}
      />
    </Tabs>
  );
}

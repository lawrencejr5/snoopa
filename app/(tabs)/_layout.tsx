import { Tabs } from "expo-router";
import React from "react";

import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import * as Haptics from "expo-haptics";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { Image, Platform, View } from "react-native";

const TABS = [
  {
    name: "index",
    label: "Home",
    sf: { default: "house" as const, selected: "house.fill" as const },
  },
  {
    name: "watchlist",
    label: "Watchlist",
    sf: {
      default: "binoculars" as const,
      selected: "binoculars.fill" as const,
    },
  },
  {
    name: "profile",
    label: "Profile",
    sf: { default: "person" as const, selected: "person.fill" as const },
  },
];

const IOSTabsLayout = () => {
  const { theme } = useTheme();

  return (
    <View style={{ backgroundColor: Colors[theme].background, flex: 1 }}>
      <NativeTabs
        tintColor={Colors[theme].milker}
        iconColor={{
          default: Colors[theme].text_secondary,
          selected: Colors[theme].milker,
        }}
        labelStyle={{
          default: {
            color: Colors[theme].text_secondary,
            fontFamily: "FontMedium",
            fontSize: 10,
          },
          selected: {
            color: Colors[theme].milker,
            fontFamily: "FontMedium",
            fontSize: 10,
          },
        }}
        backgroundColor={Colors[theme].background}
        blurEffect="systemChromeMaterialDark"
        shadowColor="transparent"
        {...({
          screenListeners: {
            tabPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            },
          },
        } as any)}
      >
        {TABS.map((tab) => (
          <NativeTabs.Trigger key={tab.name} name={tab.name}>
            <Label>{tab.label}</Label>
            <Icon sf={tab.sf} />
          </NativeTabs.Trigger>
        ))}
      </NativeTabs>
    </View>
  );
};

const DefaultTabsLayout = () => {
  const { theme } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: Colors[theme].background,
      }}
    >
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[theme].text,
          tabBarInactiveTintColor: Colors[theme].text_secondary,

          headerShown: false,
          tabBarStyle: {
            height: 80,
            elevation: 0,
            borderTopWidth: 0,
            backgroundColor: Colors[theme].background,
            marginTop: -20,
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
                source={require("../../assets/icons/home.png")}
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
                source={require("../../assets/icons/watchlist.png")}
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
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ focused }) => (
              <Image
                source={require("../../assets/icons/user.png")}
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
    </View>
  );
};

export default function TabLayout() {
  const isIOS26OrAbove =
    Platform.OS === "ios" && parseInt(String(Platform.Version), 10) >= 26;

  if (isIOS26OrAbove) {
    return <IOSTabsLayout />;
  }

  return <DefaultTabsLayout />;
}

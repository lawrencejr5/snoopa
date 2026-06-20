import {
  isLiquidGlassSupported,
  LiquidGlassView,
} from "@callstack/liquid-glass";
import { Tabs } from "expo-router";
import React from "react";
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";

// ─────────────────────────────────────────────────────────────
// Tab definitions
// ─────────────────────────────────────────────────────────────
const TABS = [
  {
    name: "index",
    label: "Home",
    icon: require("../../assets/icons/home.png"),
    iconSize: 24,
  },
  {
    name: "watchlist",
    label: "Watchlist",
    icon: require("../../assets/icons/watchlist.png"),
    iconSize: 22,
  },
  {
    name: "profile",
    label: "Profile",
    icon: require("../../assets/icons/user.png"),
    iconSize: 22,
  },
] as const;

// ─────────────────────────────────────────────────────────────
// Custom Tab Bar
// ─────────────────────────────────────────────────────────────
function LiquidTabBar({ state, navigation }: any) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const colors = Colors[theme];

  // Whether we render the liquid glass pill
  const useGlass = Platform.OS === "ios" && isLiquidGlassSupported;

  const TAB_HEIGHT = 74;
  const BOTTOM_INSET = insets.bottom;
  const PILL_MARGIN_H = 20;
  const PILL_RADIUS = 30;

  return (
    <View
      style={[
        styles.wrapper,
        {
          height: TAB_HEIGHT + BOTTOM_INSET,
          paddingBottom: BOTTOM_INSET,
        },
      ]}
      pointerEvents="box-none"
    >
      {useGlass ? (
        // ── iOS 26+ : Liquid Glass pill ──────────────────────
        <LiquidGlassView
          effect="regular"
          style={[
            styles.pill,
            {
              marginHorizontal: PILL_MARGIN_H,
              borderRadius: PILL_RADIUS,
              height: TAB_HEIGHT,
            },
          ]}
        >
          {state.routes.map((route: any, index: number) => {
            const tab = TABS.find((t) => t.name === route.name);
            if (!tab) return null;
            const focused = state.index === index;

            return (
              <TouchableOpacity
                key={route.key}
                style={styles.tabItem}
                onPress={() => navigation.navigate(route.name)}
                activeOpacity={0.7}
              >
                <Image
                  source={tab.icon}
                  style={{
                    width: tab.iconSize,
                    height: tab.iconSize,
                    tintColor: focused ? "#ffffff" : "rgba(255,255,255,0.45)",
                  }}
                  resizeMode="contain"
                />
                <Text
                  style={[
                    styles.label,
                    {
                      color: focused ? "#ffffff" : "rgba(255,255,255,0.45)",
                      fontWeight: focused ? "600" : "400",
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </LiquidGlassView>
      ) : (
        // ── Fallback : solid background bar ──────────────────
        <View
          style={[
            styles.pill,
            styles.pillFallback,
            {
              marginHorizontal: PILL_MARGIN_H,
              borderRadius: PILL_RADIUS,
              height: TAB_HEIGHT,
              paddingTop: 5,
              backgroundColor: colors.background + "80",
              borderColor: colors.border,
            },
          ]}
        >
          {state.routes.map((route: any, index: number) => {
            const tab = TABS.find((t) => t.name === route.name);
            if (!tab) return null;
            const focused = state.index === index;

            return (
              <TouchableOpacity
                key={route.key}
                style={styles.tabItem}
                onPress={() => navigation.navigate(route.name)}
                activeOpacity={0.7}
              >
                <Image
                  source={tab.icon}
                  style={{
                    width: tab.iconSize,
                    height: tab.iconSize,
                    tintColor: focused ? colors.primary : colors.text_secondary,
                  }}
                  resizeMode="contain"
                />
                <Text
                  style={[
                    styles.label,
                    {
                      color: focused ? colors.text : colors.text_secondary,
                      fontWeight: focused ? "600" : "400",
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Layout
// ─────────────────────────────────────────────────────────────
export default function TabLayout() {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: Colors[theme].background }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          // Make the built-in tab bar invisible — our custom one floats above
          tabBarStyle: { display: "none" },
        }}
        tabBar={(props) => <LiquidTabBar {...props} />}
      >
        {TABS.map((tab) => (
          <Tabs.Screen key={tab.name} name={tab.name} />
        ))}
      </Tabs>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  pillFallback: {
    borderWidth: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.3,
    fontFamily: "FontMedium",
  },
});

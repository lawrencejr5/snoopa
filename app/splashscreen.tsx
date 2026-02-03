import { useTheme } from "@/context/ThemeContext";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { Image, StyleSheet, View } from "react-native";

const SplashScreen = () => {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <StatusBar style={"light"} />

      <Image
        source={
          theme === "dark"
            ? require("../assets/images/splash-screen-black.png")
            : require("../assets/images/splash-screen-black.png")
        }
        style={{ width: "100%", height: "100%" }}
      />
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({});

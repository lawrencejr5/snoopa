import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const AuthCallback = () => {
  const { theme } = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: Colors[theme].background }]}
    >
      <View style={styles.content}>
        <ActivityIndicator size="large" color={Colors[theme].text} />
        <Text style={[styles.text, { color: Colors[theme].text }]}>
          Signing in...
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default AuthCallback;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  text: {
    fontFamily: "FontMedium",
    fontSize: 16,
  },
});

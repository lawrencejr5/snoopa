import React from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import TrendingTopicsContent from "@/components/TrendingTopicsContent";

export default function TrendingModalScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  const handleTrackTopic = (topic: string, suggestedCondition?: string) => {
    router.back();
    router.setParams({
      track_topic: topic,
      track_condition: suggestedCondition || "",
    } as any);
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: Colors[theme].background },
      ]}
    >
      <TrendingTopicsContent
        onTrackTopic={handleTrackTopic}
        onClose={() => router.back()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

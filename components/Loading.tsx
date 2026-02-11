import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import React, { useEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const LOADING_TEXTS = [
  "Gathering intel",
  "Decoding signals",
  "Analyzing chatter",
  "Syncing frequencies",
  "Scanning perimeter",
  "Extracting insights",
  "Decrypting payload",
  "Triangulating data",
  "Monitoring waves",
  "Interpolating signals",
];

const Loading = () => {
  const { theme } = useTheme();
  const loadingText = useMemo(
    () => LOADING_TEXTS[Math.floor(Math.random() * LOADING_TEXTS.length)],
    [],
  );

  const dot2Opacity = useSharedValue(0);
  const dot3Opacity = useSharedValue(0);

  useEffect(() => {
    // Dot 2: 0 -> 1 -> 1 -> 1 -> 0
    dot2Opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 400 }), // to 2 dots
        withTiming(1, { duration: 400 }), // to 3 dots
        withTiming(1, { duration: 400 }), // back to 2 dots
        withTiming(0, { duration: 400 }), // back to 1 dot
      ),
      -1,
    );

    // Dot 3: 0 -> 0 -> 1 -> 0 -> 0
    dot3Opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 400 }), // stay at 2 dots
        withTiming(1, { duration: 400 }), // to 3 dots
        withTiming(0, { duration: 400 }), // back to 2 dots
        withTiming(0, { duration: 400 }), // back to 1 dot
      ),
      -1,
    );
  }, []);

  const dot2Style = useAnimatedStyle(() => ({
    opacity: dot2Opacity.value,
  }));

  const dot3Style = useAnimatedStyle(() => ({
    opacity: dot3Opacity.value,
  }));

  return (
    <View
      style={[styles.container, { backgroundColor: Colors[theme].background }]}
    >
      <View style={styles.content}>
        <Text style={[styles.text, { color: Colors[theme].text_secondary }]}>
          {loadingText}
        </Text>
        <View style={styles.dotsContainer}>
          <Text style={[styles.dot, { color: Colors[theme].text_secondary }]}>
            .
          </Text>
          <Animated.Text
            style={[
              styles.dot,
              { color: Colors[theme].text_secondary },
              dot2Style,
            ]}
          >
            .
          </Animated.Text>
          <Animated.Text
            style={[
              styles.dot,
              { color: Colors[theme].text_secondary },
              dot3Style,
            ]}
          >
            .
          </Animated.Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  text: {
    fontFamily: "FontRegular",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  dotsContainer: {
    flexDirection: "row",
    width: 30,
    marginBottom: 5,
    marginLeft: 3,
  },
  dot: {
    fontFamily: "FontRegular",
    fontSize: 22,
    lineHeight: 22,
  },
});

export default Loading;

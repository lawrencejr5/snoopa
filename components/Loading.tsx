import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import LottieView from "lottie-react-native";
import React, { useEffect, useMemo } from "react";
import { Platform, StyleSheet, Text, UIManager, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const LOADING_ITEMS = [
  {
    text: "Gathering intel",
    animation: require("@/assets/animations/searching.json"),
  },
  {
    text: "Decoding signals",
    animation: require("@/assets/animations/paws.json"),
  },
  {
    text: "Analyzing chatter",
    animation: require("@/assets/animations/magnifier-spin.json"),
  },
  {
    text: "Syncing frequencies",
    animation: require("@/assets/animations/server.json"),
  },
  {
    text: "Scanning perimeter",
    animation: require("@/assets/animations/crosshair.json"),
  },
  {
    text: "Extracting insights",
    animation: require("@/assets/animations/wench.json"),
  },
  {
    text: "Decrypting payload",
    animation: require("@/assets/animations/eye.json"),
  },
  {
    text: "Triangulating data",
    animation: require("@/assets/animations/coin.json"),
  },
  {
    text: "Monitoring waves",
    animation: require("@/assets/animations/heartbeat.json"),
  },
  {
    text: "Interpolating signals",
    animation: require("@/assets/animations/coral.json"),
  },
];

const isLottieSupported =
  Platform.OS !== "web" &&
  Boolean(
    UIManager.getViewManagerConfig &&
    (UIManager.getViewManagerConfig("LottieAnimationView") ||
      UIManager.getViewManagerConfig("LottieView")),
  );

function SafeLottie({
  source,
  style,
  autoPlay = true,
  loop = true,
}: {
  source: any;
  style?: any;
  autoPlay?: boolean;
  loop?: boolean;
}) {
  if (!isLottieSupported) {
    return null;
  }

  try {
    return (
      <LottieView
        source={source}
        style={style}
        autoPlay={autoPlay}
        loop={loop}
      />
    );
  } catch {
    return null;
  }
}

const Loading = () => {
  const { theme } = useTheme();

  const selectedItem = useMemo(
    () => LOADING_ITEMS[Math.floor(Math.random() * LOADING_ITEMS.length)],
    [],
  );

  const dot2Opacity = useSharedValue(0);
  const dot3Opacity = useSharedValue(0);

  useEffect(() => {
    // Dot 2: 0 -> 1 -> 1 -> 1 -> 0
    dot2Opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 400 }),
        withTiming(1, { duration: 400 }),
        withTiming(1, { duration: 400 }),
        withTiming(0, { duration: 400 }),
      ),
      -1,
    );

    // Dot 3: 0 -> 0 -> 1 -> 0 -> 0
    dot3Opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 400 }),
        withTiming(1, { duration: 400 }),
        withTiming(0, { duration: 400 }),
        withTiming(0, { duration: 400 }),
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
      <View style={styles.animationWrapper}>
        <SafeLottie
          source={selectedItem.animation}
          style={{ width: 60, height: 60 }}
          autoPlay
          loop
        />
      </View>
      <View style={styles.content}>
        <Text style={[styles.text, { color: Colors[theme].text }]}>
          {selectedItem.text}
        </Text>
        <View style={styles.dotsContainer}>
          <Text style={[styles.dot, { color: Colors[theme].text }]}>.</Text>
          <Animated.Text
            style={[styles.dot, { color: Colors[theme].text }, dot2Style]}
          >
            .
          </Animated.Text>
          <Animated.Text
            style={[styles.dot, { color: Colors[theme].text }, dot3Style]}
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
  animationWrapper: {
    width: 110,
    height: 110,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  text: {
    fontFamily: "FontRegular",
    fontSize: 15,
    letterSpacing: 0.5,
  },
  dotsContainer: {
    flexDirection: "row",
    width: 24,
    marginLeft: 2,
  },
  dot: {
    fontFamily: "FontRegular",
    fontSize: 16,
    lineHeight: 18,
  },
});

export default Loading;

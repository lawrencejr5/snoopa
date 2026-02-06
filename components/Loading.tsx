import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const Loading = () => {
  const { theme } = useTheme();

  const scale1 = useSharedValue(1);
  const scale2 = useSharedValue(1);
  const scale3 = useSharedValue(1);

  const opacity1 = useSharedValue(0.5);
  const opacity2 = useSharedValue(0.5);
  const opacity3 = useSharedValue(0.5);

  useEffect(() => {
    const animateDot = (
      scale: SharedValue<number>,
      opacity: SharedValue<number>,
      delay: number,
    ) => {
      scale.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1.4, {
              duration: 600,
              easing: Easing.inOut(Easing.ease),
            }),
            withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          true,
        ),
      );

      opacity.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 600 }),
            withTiming(0.4, { duration: 600 }),
          ),
          -1,
          true,
        ),
      );
    };

    animateDot(scale1, opacity1, 0);
    animateDot(scale2, opacity2, 200);
    animateDot(scale3, opacity3, 400);
  }, []);

  const createDotStyle = (
    scale: SharedValue<number>,
    opacity: SharedValue<number>,
  ) =>
    useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    }));

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Animated.View
          style={[
            styles.dot,
            { backgroundColor: Colors[theme].text },
            createDotStyle(scale1, opacity1),
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            { backgroundColor: Colors[theme].text },
            createDotStyle(scale2, opacity2),
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            { backgroundColor: Colors[theme].text },
            createDotStyle(scale3, opacity3),
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    gap: 15,
  },
  dot: {
    width: 15, // "Big" dots
    height: 15,
    borderRadius: 10,
  },
});

export default Loading;

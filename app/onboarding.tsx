import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const ONBOARDING_DATA = [
  {
    id: 1,
    image: require("@/assets/onboarding/onboarding_1.png"),
    title: "Your Daily AI\nIntelligence Briefing.",
  },
  {
    id: 2,
    image: require("@/assets/onboarding/onboarding_2.png"),
    title: "Track Anything.\nAutomatically.",
  },
  {
    id: 3,
    image: require("@/assets/onboarding/onboarding_3.png"),
    title: "Managing Watchlists\nMade Simple.",
  },
  {
    id: 4,
    image: require("@/assets/onboarding/onboarding_4.png"),
    title: "Data You Can Trust,\nSources You Can See.",
  },
];

const OnboardingScreen = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useSharedValue(0);
  const flatListRef = useRef<Animated.FlatList<any>>(null);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems[0]) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = async () => {
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      await AsyncStorage.setItem("hasSeenOnboarding", "true");
      router.replace("/welcome");
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: Colors[theme].background }]}
    >
      <Animated.FlatList
        ref={flatListRef}
        data={ONBOARDING_DATA}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        bounces={false}
        onScroll={onScroll}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewConfig}
        renderItem={({ item, index }) => {
          const isActive = index === currentIndex;
          return (
            <View style={[styles.slide, { width }]}>
              {/* Image Section */}
              <View style={styles.imageContainer}>
                {isActive && (
                  <Animated.Image
                    entering={FadeIn.delay(100).duration(500)}
                    source={item.image}
                    style={[
                      styles.image,
                      { borderColor: Colors[theme].border },
                    ]}
                    resizeMode="contain"
                  />
                )}
              </View>

              {/* Bottom Section */}
              {isActive && (
                <Animated.View
                  entering={FadeInDown.springify().damping(15).mass(0.9)}
                  style={styles.bottomSection}
                >
                  {/* Dots */}
                  <View style={styles.pagination}>
                    {ONBOARDING_DATA.map((_, dotIndex) => (
                      <View
                        key={dotIndex}
                        style={[
                          styles.dot,
                          {
                            backgroundColor: Colors[theme].text,
                            width: currentIndex === dotIndex ? 24 : 8,
                            opacity: currentIndex === dotIndex ? 1 : 0.3,
                          },
                        ]}
                      />
                    ))}
                  </View>

                  {/* Title */}
                  <Text style={[styles.title, { color: Colors[theme].text }]}>
                    {item.title}
                  </Text>

                  {/* Next Arrow Button */}
                  <Pressable
                    onPress={handleNext}
                    style={({ pressed }) => [
                      styles.nextButton,
                      {
                        backgroundColor: Colors[theme].text,
                        borderColor: Colors[theme].surface,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Feather
                      name="arrow-right"
                      size={28}
                      color={Colors[theme].background}
                    />
                  </Pressable>
                </Animated.View>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
};

export default OnboardingScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slide: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "space-between",
    paddingBottom: 40,
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  image: {
    width: "100%",
    height: 300,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
  },
  bottomSection: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 20,
    minHeight: height * 0.32,
    justifyContent: "flex-end",
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 5,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  title: {
    fontFamily: "FontBold",
    fontSize: 36,
    lineHeight: 44,
    marginBottom: 10,
    letterSpacing: -1,
  },
  nextButton: {
    padding: 18,
    borderRadius: 50,
    borderWidth: 1,
    alignSelf: "flex-end",
    marginTop: 10,
  },
});

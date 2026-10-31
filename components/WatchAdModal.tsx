import Colors from "@/constants/Colors";
import { useHapitcs } from "@/context/HapticsContext";
import { useTheme } from "@/context/ThemeContext";
import { Octicons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface WatchAdModalProps {
  visible: boolean;
  onClose: () => void;
  onAdComplete: () => void;
  onUpgradePress: () => void;
}

const TOTAL_AD_SECONDS = 60;

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
  fallback,
}: {
  source: any;
  style?: any;
  autoPlay?: boolean;
  loop?: boolean;
  fallback: React.ReactNode;
}) {
  if (!isLottieSupported) {
    return <>{fallback}</>;
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
    return <>{fallback}</>;
  }
}

export default function WatchAdModal({
  visible,
  onClose,
  onAdComplete,
  onUpgradePress,
}: WatchAdModalProps) {
  const { theme } = useTheme();
  const haptics = useHapitcs();

  const [secondsRemaining, setSecondsRemaining] = useState(TOTAL_AD_SECONDS);
  const [isCompleted, setIsCompleted] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      setSecondsRemaining(TOTAL_AD_SECONDS);
      setIsCompleted(false);
      progressAnim.setValue(0);
      return;
    }

    setSecondsRemaining(TOTAL_AD_SECONDS);
    setIsCompleted(false);
    progressAnim.setValue(0);

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const progress = (TOTAL_AD_SECONDS - secondsRemaining) / TOTAL_AD_SECONDS;
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [secondsRemaining, visible]);

  const handleFinish = () => {
    setIsCompleted(true);
    haptics.impact("success");
    setTimeout(() => {
      onAdComplete();
    }, 1000);
  };

  const handleRequestClose = () => {
    if (isCompleted) {
      onAdComplete();
      return;
    }

    Alert.alert(
      "Exit Ad?",
      "You need to finish watching the ad to create your watchlist. Want to skip ads? Switch to Pro.",
      [
        {
          text: "Keep Watching",
          style: "cancel",
        },
        {
          text: "Switch to Pro",
          onPress: onUpgradePress,
        },
        {
          text: "Exit",
          style: "destructive",
          onPress: onClose,
        },
      ],
    );
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const formattedTime = `0:${
    secondsRemaining < 10 ? `0${secondsRemaining}` : secondsRemaining
  }`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleRequestClose}
    >
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: Colors[theme].background },
        ]}
      >
        {/* HEADER BAR */}
        <View style={styles.header}>
          <View style={styles.sponsorBadge}>
            <View
              style={[
                styles.badgeDot,
                { backgroundColor: Colors[theme].warning },
              ]}
            />
            <Text
              style={[
                styles.sponsorText,
                { color: Colors[theme].text_secondary },
              ]}
            >
              SNOOPA AD
            </Text>
          </View>

          <View style={styles.headerRight}>
            <View
              style={[
                styles.timerPill,
                {
                  backgroundColor: Colors[theme].surface,
                  borderColor: Colors[theme].border,
                },
              ]}
            >
              <Octicons
                name="clock"
                size={12}
                color={Colors[theme].text_secondary}
              />
              <Text style={[styles.timerText, { color: Colors[theme].text }]}>
                {isCompleted ? "Completed" : formattedTime}
              </Text>
            </View>

            <Pressable
              onPress={handleRequestClose}
              hitSlop={12}
              style={[
                styles.closeBtn,
                { backgroundColor: Colors[theme].surface },
              ]}
            >
              <Image
                source={require("@/assets/icons/times.png")}
                style={{
                  width: 12,
                  height: 12,
                  tintColor: Colors[theme].text_secondary,
                }}
              />
            </Pressable>
          </View>
        </View>

        {/* PROGRESS BAR */}
        <View
          style={[
            styles.progressBarTrack,
            { backgroundColor: Colors[theme].surface },
          ]}
        >
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                width: progressWidth,
                backgroundColor: isCompleted
                  ? Colors[theme].success
                  : Colors[theme].primary,
              },
            ]}
          />
        </View>

        {/* MAIN BODY CONTENT */}
        <View style={styles.content}>
          {isCompleted ? (
            <View style={styles.completedContainer}>
              <SafeLottie
                source={require("@/assets/animations/magnifier-check.json")}
                autoPlay
                loop={false}
                style={{ width: 100, height: 100 }}
                fallback={
                  <Image
                    source={require("@/assets/icons/check-fill.png")}
                    style={{
                      width: 56,
                      height: 56,
                      tintColor: Colors[theme].success,
                    }}
                  />
                }
              />
              <Text
                style={[styles.completedHeading, { color: Colors[theme].text }]}
              >
                Ad Completed!
              </Text>
              <Text
                style={[
                  styles.completedSubheading,
                  { color: Colors[theme].text_secondary },
                ]}
              >
                Creating your watchlist...
              </Text>
            </View>
          ) : (
            <View style={styles.adShowcase}>
              <View style={styles.animationWrapper}>
                <SafeLottie
                  source={require("@/assets/animations/crosshair.json")}
                  autoPlay
                  loop
                  style={{ width: 120, height: 120 }}
                  fallback={
                    <View
                      style={[
                        styles.radarFallbackBox,
                        { backgroundColor: Colors[theme].surface },
                      ]}
                    >
                      <Image
                        source={require("@/assets/icons/eyes.png")}
                        style={{
                          width: 44,
                          height: 44,
                          tintColor: Colors[theme].primary,
                        }}
                      />
                    </View>
                  }
                />
              </View>

              <Text
                style={[
                  styles.sponsorBrandTitle,
                  { color: Colors[theme].text },
                ]}
              >
                Snoopa Pro Intelligence
              </Text>

              <Text
                style={[
                  styles.sponsorBrandSubtitle,
                  { color: Colors[theme].text_secondary },
                ]}
              >
                Get faster checks, unlimited active watchlists, and a completely
                ad-free tracking experience with Snoopa Pro.
              </Text>

              <View
                style={[
                  styles.telemetryCard,
                  {
                    backgroundColor: Colors[theme].surface,
                    borderColor: Colors[theme].border,
                  },
                ]}
              >
                <View style={styles.telemetryRow}>
                  <Octicons
                    name="zap"
                    size={14}
                    color={Colors[theme].warning}
                  />
                  <Text
                    style={[
                      styles.telemetryText,
                      { color: Colors[theme].text },
                    ]}
                  >
                    Zero ads when creating watchlists
                  </Text>
                </View>
                <View style={styles.telemetryDivider} />
                <View style={styles.telemetryRow}>
                  <Octicons
                    name="shield-check"
                    size={14}
                    color={Colors[theme].primary}
                  />
                  <Text
                    style={[
                      styles.telemetryText,
                      { color: Colors[theme].text },
                    ]}
                  >
                    Higher snoop limits & priority tracking
                  </Text>
                </View>
                <View style={styles.telemetryDivider} />
                <View style={styles.telemetryRow}>
                  <Octicons
                    name="broadcast"
                    size={14}
                    color={Colors[theme].success}
                  />
                  <Text
                    style={[
                      styles.telemetryText,
                      { color: Colors[theme].text },
                    ]}
                  >
                    Instant verified push notifications
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* BOTTOM CARD: Tired of seeing ads? Switch to Pro */}
        <View style={styles.bottomCardWrapper}>
          <Pressable
            onPress={onUpgradePress}
            style={[
              styles.bottomCard,
              {
                backgroundColor: Colors[theme].card,
                borderColor: Colors[theme].border,
              },
            ]}
          >
            <View style={styles.bottomCardLeft}>
              <View style={styles.zapIconBox}>
                <Octicons name="zap" size={15} color={Colors[theme].warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.upgradeTitle, { color: Colors[theme].text }]}
                >
                  Tired of seeing ads?
                </Text>
                <Text
                  style={[
                    styles.upgradeSubtitle,
                    { color: Colors[theme].text_secondary },
                  ]}
                >
                  Switch to Pro for instant, ad-free tracking
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.switchProBtn,
                { backgroundColor: Colors[theme].primary },
              ]}
            >
              <Text
                style={[
                  styles.switchProBtnText,
                  { color: Colors[theme].background },
                ]}
              >
                Switch to Pro
              </Text>
            </View>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  sponsorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sponsorText: {
    fontFamily: "FontBold",
    fontSize: 11,
    letterSpacing: 1.2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  timerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  timerText: {
    fontFamily: "FontBold",
    fontSize: 12,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  progressBarTrack: {
    height: 3,
    width: "100%",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  adShowcase: {
    width: "100%",
    alignItems: "center",
  },
  animationWrapper: {
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  radarFallbackBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  sponsorBrandTitle: {
    fontFamily: "FontBold",
    fontSize: 20,
    textAlign: "center",
    marginBottom: 8,
  },
  sponsorBrandSubtitle: {
    fontFamily: "FontRegular",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  telemetryCard: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  telemetryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  telemetryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  telemetryText: {
    fontFamily: "FontMedium",
    fontSize: 13,
  },
  completedContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  completedHeading: {
    fontFamily: "FontBold",
    fontSize: 20,
    marginTop: 16,
    textAlign: "center",
  },
  completedSubheading: {
    fontFamily: "FontRegular",
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  bottomCardWrapper: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 8,
  },
  bottomCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  bottomCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  zapIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(244, 208, 63, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeTitle: {
    fontFamily: "FontBold",
    fontSize: 14,
  },
  upgradeSubtitle: {
    fontFamily: "FontRegular",
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  },
  switchProBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  switchProBtnText: {
    fontFamily: "FontBold",
    fontSize: 12,
  },
});


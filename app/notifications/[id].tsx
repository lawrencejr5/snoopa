import Container from "@/components/Container";
import Colors from "@/constants/Colors";
import { useHapitcs } from "@/context/HapticsContext";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function RewardDetailScreen() {
  const { theme } = useTheme();
  const C = Colors[theme];
  const router = useRouter();
  const haptics = useHapitcs();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Fetch single notification
  const notification = useQuery(api.notifications.get_notification, {
    notification_id: id as Id<"notifications">,
  });

  const pulse_scale = useRef(new Animated.Value(1)).current;
  const fade_anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation for Snoopa logo
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse_scale, {
          toValue: 1.08,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulse_scale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    // Fade-in animation for content
    Animated.timing(fade_anim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();

    return () => pulse.stop();
  }, []);

  const handle_explore = () => {
    haptics.impact("light");
    router.replace("/account/billing");
  };

  const handle_back = () => {
    haptics.impact("light");
    router.back();
  };

  const isLoading = notification === undefined;

  return (
    <Container>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handle_back} style={styles.backButton}>
          <Image
            source={require("@/assets/icons/arrow-up.png")}
            style={{
              width: 30,
              height: 30,
              tintColor: C.text,
              transform: [{ rotate: "-90deg" }],
            }}
          />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text }]}>
          Premium Gift
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={C.primary} size="large" />
        </View>
      ) : !notification ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: C.text_secondary }]}>
            Notification not found
          </Text>
        </View>
      ) : (
        <Animated.ScrollView
          style={{ flex: 1, opacity: fade_anim }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Card Wrapper */}
          <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
            {/* Logo */}
            <Animated.Image
              source={require("@/assets/images/splash-icon.png")}
              style={[styles.logo, { transform: [{ scale: pulse_scale }] }]}
            />

            {/* Badge */}
            <View style={[styles.badge, { backgroundColor: C.success + "22" }]}>
              <Text style={[styles.badgeText, { color: C.success }]}>
                EXCLUSIVE REWARD
              </Text>
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: C.text }]}>
              {notification.title}
            </Text>

            {/* Message */}
            <Text style={[styles.message, { color: C.text }]}>
              {notification.message}
            </Text>

            <View style={[styles.divider, { backgroundColor: C.border }]} />

            {/* Explore Benefits Button */}
            <Pressable
              onPress={handle_explore}
              style={({ pressed }) => [
                styles.btn,
                {
                  backgroundColor: C.primary,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={[styles.btnText, { color: C.background }]}>
                Explore benefits
              </Text>
            </Pressable>
          </View>
        </Animated.ScrollView>
      )}
    </Container>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "FontBold",
    letterSpacing: -0.5,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontFamily: "FontMedium",
    fontSize: 16,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 24,
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  badgeText: {
    fontFamily: "FontBold",
    fontSize: 11,
    letterSpacing: 1.5,
  },
  title: {
    fontFamily: "FontBold",
    fontSize: 22,
    letterSpacing: -0.4,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 28,
  },
  message: {
    fontFamily: "FontRegular",
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 30,
    opacity: 0.9,
  },
  divider: {
    height: 1,
    width: "100%",
    marginBottom: 30,
  },
  btn: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  btnText: {
    fontFamily: "FontBold",
    fontSize: 16,
    letterSpacing: -0.2,
  },
});

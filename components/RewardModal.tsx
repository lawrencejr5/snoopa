import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type RewardNotification = Doc<"notifications">;

interface RewardModalProps {
  reward: RewardNotification;
  onDismiss: () => void;
}

const TIER_SNOOP_COUNTS: Record<string, string> = {
  pro: "1,000",
  supa: "4,000",
  max: "12,000",
};

export default function RewardModal({ reward, onDismiss }: RewardModalProps) {
  const { theme } = useTheme();
  const C = Colors[theme];
  const claimReward = useMutation(api.notifications.claim_reward);
  const router = useRouter();

  // Animated values
  const backdrop_opacity = useRef(new Animated.Value(0)).current;
  const card_translate_y = useRef(new Animated.Value(60)).current;
  const card_opacity = useRef(new Animated.Value(0)).current;
  const pulse_scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(backdrop_opacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.spring(card_translate_y, {
        toValue: 0,
        tension: 65,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(card_opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulsing glow on the paw icon
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse_scale, {
          toValue: 1.12,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse_scale, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const handle_explore = async () => {
    await claimReward({ notification_id: reward._id });
    onDismiss();
    router.push("/account/billing");
  };

  const handle_dismiss = async () => {
    await claimReward({ notification_id: reward._id });
    onDismiss();
  };

  // Extract tier from the notification title or message if needed
  const snoop_count =
    Object.entries(TIER_SNOOP_COUNTS).find(([key]) =>
      reward.title.toLowerCase().includes(key),
    )?.[1] ?? null;

  return (
    <Modal transparent animationType="none" statusBarTranslucent>
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdrop_opacity }]}
        pointerEvents="none"
      />
      <View style={styles.center_wrapper}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: C.surface,
              borderColor: C.border,
              transform: [{ translateY: card_translate_y }],
              opacity: card_opacity,
            },
          ]}
        >
          {/* Snoopa logo with pulse */}
          <Animated.Image
            source={require("@/assets/images/splash-icon.png")}
            style={[styles.logo, { transform: [{ scale: pulse_scale }] }]}
          />

          {/* Badge */}
          <View style={[styles.badge, { backgroundColor: C.success + "22" }]}>
            <Text style={[styles.badge_text, { color: C.success }]}>
              PREMIUM GIFT
            </Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: C.text }]}>{reward.title}</Text>

          {/* Message */}
          <Text style={[styles.message, { color: C.text_secondary }]}>
            {reward.message}
          </Text>

          {/* Snoop count highlight */}
          {snoop_count && (
            <View
              style={[
                styles.snoop_pill,
                { backgroundColor: C.card, borderColor: C.border },
              ]}
            >
              <Text style={[styles.snoop_pill_count, { color: C.primary }]}>
                {snoop_count}
              </Text>
              <Text
                style={[styles.snoop_pill_label, { color: C.text_secondary }]}
              >
                {" "}
                snoops added this month
              </Text>
            </View>
          )}

          {/* Explore benefits button */}
          <Pressable
            onPress={handle_explore}
            style={({ pressed }) => [
              styles.claim_button,
              {
                backgroundColor: C.primary,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={[styles.claim_button_text, { color: C.background }]}>
              Explore benefits
            </Text>
          </Pressable>

          {/* Got it link */}
          <Pressable onPress={handle_dismiss} style={styles.later_button}>
            <Text style={[styles.later_text, { color: C.text_secondary }]}>
              Got it!
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  center_wrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 36,
    paddingHorizontal: 28,
    alignItems: "center",
  },
  logo: {
    width: 95,
    height: 95,
    borderRadius: 48,
    marginBottom: 18,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 16,
  },
  badge_text: {
    fontFamily: "FontBold",
    fontSize: 11,
    letterSpacing: 1.5,
  },
  title: {
    fontFamily: "FontBold",
    fontSize: 22,
    letterSpacing: -0.4,
    textAlign: "center",
    marginBottom: 12,
  },
  message: {
    fontFamily: "FontRegular",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
  },
  snoop_pill: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 28,
  },
  snoop_pill_count: {
    fontFamily: "FontBold",
    fontSize: 20,
    letterSpacing: -0.5,
  },
  snoop_pill_label: {
    fontFamily: "FontRegular",
    fontSize: 14,
  },
  claim_button: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 14,
  },
  claim_button_text: {
    fontFamily: "FontBold",
    fontSize: 16,
    letterSpacing: -0.2,
  },
  later_button: {
    paddingVertical: 6,
  },
  later_text: {
    fontFamily: "FontMedium",
    fontSize: 13,
  },
});

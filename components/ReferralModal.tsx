import Colors from "@/constants/Colors";
import { useCustomAlert } from "@/context/CustomAlertContext";
import { useTheme } from "@/context/ThemeContext";
import { useUser } from "@/context/UserContext";
import { api } from "@/convex/_generated/api";
import { FontAwesome6, MaterialCommunityIcons, Octicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export const REFERRAL_OPTIONS = [
  {
    id: "From the founder himself",
    label: "From the founder himself",
    iconType: "emoji",
    icon: "✌️",
  },
  {
    id: "Google Ads",
    label: "Google Ads",
    iconType: "emoji",
    icon: "📢",
  },
  {
    id: "A friend",
    label: "A friend",
    iconType: "emoji",
    icon: "👥",
  },
  {
    id: "Threads / Twitter (X)",
    label: "Threads / Twitter (X)",
    iconType: "threads_twitter",
  },
  {
    id: "TikTok",
    label: "TikTok",
    iconType: "tiktok",
  },
  {
    id: "Google Search",
    label: "Google Search",
    iconType: "google",
  },
  {
    id: "ChatGPT, Gemini or any other LLM",
    label: "ChatGPT, Gemini or any other LLM",
    iconType: "llm",
  },
  {
    id: "I'm just gay",
    label: "I'm just gay",
    iconType: "emoji",
    icon: "🌈",
  },
];

export function ReferralOptionIcon({
  item,
  isSelected,
  iconColor,
}: {
  item: (typeof REFERRAL_OPTIONS)[number];
  isSelected: boolean;
  iconColor: string;
}) {
  if (item.iconType === "threads_twitter") {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
        <FontAwesome6 name="threads" size={18} color={iconColor} />
        <FontAwesome6 name="x-twitter" size={17} color={iconColor} />
      </View>
    );
  }
  if (item.iconType === "tiktok") {
    return <FontAwesome6 name="tiktok" size={19} color={iconColor} />;
  }
  if (item.iconType === "google") {
    return (
      <Image
        source={require("@/assets/icons/google.png")}
        style={{
          width: 20,
          height: 20,
          tintColor: isSelected ? iconColor : undefined,
        }}
        resizeMode="contain"
      />
    );
  }
  if (item.iconType === "llm") {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Octicons name="sparkle-fill" size={18} color={iconColor} />
      </View>
    );
  }
  return <Text style={{ fontSize: 18 }}>{item.icon}</Text>;
}

interface ReferralModalProps {
  visible: boolean;
  onClose?: () => void;
}

export default function ReferralModal({ visible }: ReferralModalProps) {
  const { theme } = useTheme();
  const { signedIn } = useUser();
  const { showCustomAlert } = useCustomAlert();
  const saveReferralSource = useMutation(api.users.save_referral_source);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!visible || !signedIn || signedIn.referral_source) {
    return null;
  }

  const handleSubmit = async () => {
    if (!selectedOption || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await saveReferralSource({ source: selectedOption });
      showCustomAlert("Thank you 😘", "success");
    } catch (error) {
      console.error("Failed to save referral source:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: Colors[theme].surface,
              borderColor: Colors[theme].border,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: Colors[theme].primary + "15" },
              ]}
            >
              <Text style={{ fontSize: 22 }}>🔍</Text>
            </View>
            <Text style={[styles.title, { color: Colors[theme].text }]}>
              Where did you hear about us?
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: Colors[theme].text_secondary },
              ]}
            >
              Help Snoopa know how you found us. Pick an option below to continue.
            </Text>
          </View>

          {/* Options Grid */}
          <ScrollView
            style={{ maxHeight: 340 }}
            contentContainerStyle={styles.optionsList}
            showsVerticalScrollIndicator={false}
          >
            {REFERRAL_OPTIONS.map((item) => {
              const isSelected = selectedOption === item.id;
              const iconColor = isSelected
                ? Colors[theme].background
                : Colors[theme].text;

              return (
                <Pressable
                  key={item.id}
                  onPress={() => setSelectedOption(item.id)}
                  style={({ pressed }) => [
                    styles.optionCard,
                    {
                      backgroundColor: isSelected
                        ? Colors[theme].text
                        : Colors[theme].background,
                      borderColor: isSelected
                        ? Colors[theme].text
                        : Colors[theme].border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <ReferralOptionIcon
                      item={item}
                      isSelected={isSelected}
                      iconColor={iconColor}
                    />
                    <Text
                      style={[
                        styles.optionLabel,
                        {
                          color: iconColor,
                          fontFamily: isSelected ? "FontBold" : "FontMedium",
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>
                  {isSelected && (
                    <Octicons
                      name="check-circle-fill"
                      size={18}
                      color={Colors[theme].background}
                    />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Submit Button */}
          <Pressable
            onPress={handleSubmit}
            disabled={!selectedOption || isSubmitting}
            style={({ pressed }) => [
              styles.submitBtn,
              {
                backgroundColor: selectedOption
                  ? Colors[theme].primary
                  : Colors[theme].border,
                opacity: pressed || !selectedOption ? 0.6 : 1,
              },
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={Colors[theme].background} />
            ) : (
              <Text
                style={[
                  styles.submitBtnText,
                  { color: Colors[theme].background },
                ]}
              >
                SUBMIT
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontFamily: "FontBold",
    fontSize: 20,
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: "FontRegular",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  optionsList: {
    gap: 8,
    paddingBottom: 4,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  optionLabel: {
    fontSize: 14,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  submitBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  submitBtnText: {
    fontFamily: "FontBold",
    fontSize: 14,
    letterSpacing: 0.5,
  },
});

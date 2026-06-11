import Container from "@/components/Container";
import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { useHapitcs } from "@/context/HapticsContext";
import { useCustomAlert } from "@/context/CustomAlertContext";
import { useUser } from "@/context/UserContext";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import TopUpModal from "@/components/TopUpModal";
import PremiumFeatureModal from "@/components/PremiumFeatureModal";

const PLANS = [
  {
    id: "pro",
    name: "Snoopa Pro",
    price: "$12",
    features: [
      "1,000 snoops per month",
      "Customize watchlist conditions",
      "Unlimited watchlists",
      "Up to 2 source URLs",
      "Prioritized customer support",
    ],
    highlight: false,
    badge: "",
  },
  {
    id: "supa",
    name: "Supa Snoopa",
    price: "$29",
    features: [
      "4,000 snoops per month",
      "Up to 3 source URLs",
      "Customize watchlist conditions",
      "Unlimited watchlists",
      "Prioritized customer support",
    ],
    highlight: true,
    badge: "MOST POPULAR",
  },
  {
    id: "max",
    name: "Snoopa Max",
    price: "$69",
    features: [
      "12,000 snoops per month",
      "Up to 5 source URLs",
      "Customize watchlist conditions",
      "Unlimited watchlists",
      "Prioritized customer support",
    ],
    highlight: false,
    badge: "BEST VALUE",
  },
];

export default function BillingScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const haptics = useHapitcs();
  const { showCustomAlert } = useCustomAlert();
  const { signedIn } = useUser();

  const [topUpVisible, setTopUpVisible] = useState(false);
  const [featureLockVisible, setFeatureLockVisible] = useState(false);

  // Fallback to "Free" if signedIn user does not have a plan set.
  const currentPlan = signedIn?.plan ? signedIn.plan.toUpperCase() : "FREE";

  const handleSelectPlan = (planName: string) => {
    haptics.impact("success");
    showCustomAlert(`${planName} subscription process is coming soon!`, "success");
  };

  return (
    <Container>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            haptics.impact("light");
            router.back();
          }}
          style={({ pressed }) => [
            styles.backButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Image
            source={require("@/assets/icons/arrow-up.png")}
            style={{
              width: 30,
              height: 30,
              tintColor: Colors[theme].text,
              transform: [{ rotate: "-90deg" }],
            }}
          />
        </Pressable>
        <Text style={[styles.headerTitle, { color: Colors[theme].text }]}>
          Billing
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 50, flexGrow: 1 }}
      >
        {/* Current Plan Overview */}
        <View
          style={[
            styles.currentPlanContainer,
            {
              backgroundColor: Colors[theme].surface,
              borderColor: Colors[theme].border,
            },
          ]}
        >
          <Text
            style={{
              fontFamily: "FontBold",
              fontSize: 12,
              color: Colors[theme].text_secondary,
              letterSpacing: 1,
              textTransform: "uppercase",
              marginBottom: 5,
            }}
          >
            Current Plan
          </Text>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontFamily: "FontBold",
                fontSize: 26,
                color: Colors[theme].text,
              }}
            >
              {currentPlan}
            </Text>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 20,
                backgroundColor: Colors[theme].primary + "20",
              }}
            >
              <Text
                style={{
                  fontFamily: "FontMedium",
                  fontSize: 12,
                  color: Colors[theme].primary,
                }}
              >
                Active
              </Text>
            </View>
          </View>
        </View>

        {/* Pricing Tiers header */}
        <Text
          style={[
            styles.sectionTitle,
            { color: Colors[theme].text, marginBottom: 16 },
          ]}
        >
          Upgrade Plans
        </Text>

        {/* Plan Cards */}
        <View style={styles.plansContainer}>
          {PLANS.map((plan) => (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                {
                  backgroundColor: Colors[theme].card,
                  borderColor: plan.highlight
                    ? Colors[theme].primary
                    : Colors[theme].border,
                  borderWidth: plan.highlight ? 2 : 1,
                },
              ]}
            >
              {plan.badge ? (
                <View
                  style={[
                    styles.badgeContainer,
                    {
                      backgroundColor: plan.highlight
                        ? Colors[theme].primary
                        : Colors[theme].border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      {
                        color: plan.highlight
                          ? Colors[theme].background
                          : Colors[theme].text,
                      },
                    ]}
                  >
                    {plan.badge}
                  </Text>
                </View>
              ) : null}

              <Text style={[styles.planName, { color: Colors[theme].text }]}>
                {plan.name}
              </Text>

              <Text style={[styles.price, { color: Colors[theme].primary }]}>
                {plan.price}
                <Text
                  style={{
                    fontSize: 16,
                    color: Colors[theme].text_secondary,
                    fontFamily: "FontRegular",
                  }}
                >
                  /mo
                </Text>
              </Text>

              {/* Feature List */}
              <View style={styles.featuresList}>
                {plan.features.map((feature, idx) => (
                  <View key={idx} style={styles.featureRow}>
                    <Image
                      source={require("@/assets/icons/check-fill.png")}
                      style={{
                        width: 16,
                        height: 16,
                        tintColor: Colors[theme].primary,
                      }}
                    />
                    <Text
                      style={[
                        styles.featureText,
                        { color: Colors[theme].text_secondary },
                      ]}
                    >
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Action Button */}
              <Pressable
                onPress={() => handleSelectPlan(plan.name)}
                style={({ pressed }) => [
                  styles.planBtn,
                  {
                    backgroundColor: plan.highlight
                      ? Colors[theme].primary
                      : "transparent",
                    borderColor: Colors[theme].primary,
                    borderWidth: 1,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.planBtnText,
                    {
                      color: plan.highlight
                        ? Colors[theme].background
                        : Colors[theme].primary,
                    },
                  ]}
                >
                  Get Started
                </Text>
              </Pressable>
            </View>
          ))}
        </View>

        {/* Snoop packs / testing utilities */}
        <Text
          style={[
            styles.sectionTitle,
            { color: Colors[theme].text, marginTop: 24, marginBottom: 16 },
          ]}
        >
          Extra Snoop Power
        </Text>

        <View style={styles.utilityContainer}>
          <Pressable
            onPress={() => {
              haptics.impact("light");
              setTopUpVisible(true);
            }}
            style={({ pressed }) => [
              styles.utilityBtn,
              {
                backgroundColor: Colors[theme].surface,
                borderColor: Colors[theme].border,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View style={styles.utilityBtnLeft}>
              <View
                style={[
                  styles.utilityIconContainer,
                  { backgroundColor: Colors[theme].primary + "12" },
                ]}
              >
                <Image
                  source={require("@/assets/icons/tracked.png")}
                  style={{
                    width: 18,
                    height: 18,
                    tintColor: Colors[theme].primary,
                  }}
                />
              </View>
              <View>
                <Text
                  style={[styles.utilityTitle, { color: Colors[theme].text }]}
                >
                  Buy Snoop Packs
                </Text>
                <Text
                  style={[
                    styles.utilityDesc,
                    { color: Colors[theme].text_secondary },
                  ]}
                >
                  Top up your active watchlists instantly
                </Text>
              </View>
            </View>
            <Image
              source={require("@/assets/icons/chevron-right.png")}
              style={{
                width: 14,
                height: 14,
                tintColor: Colors[theme].text_secondary,
              }}
            />
          </Pressable>

          <Pressable
            onPress={() => {
              haptics.impact("light");
              setFeatureLockVisible(true);
            }}
            style={({ pressed }) => [
              styles.utilityBtn,
              {
                backgroundColor: Colors[theme].surface,
                borderColor: Colors[theme].border,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View style={styles.utilityBtnLeft}>
              <View
                style={[
                  styles.utilityIconContainer,
                  { backgroundColor: Colors[theme].primary + "12" },
                ]}
              >
                <Image
                  source={require("@/assets/icons/lock.png")}
                  style={{
                    width: 16,
                    height: 16,
                    tintColor: Colors[theme].primary,
                  }}
                />
              </View>
              <View>
                <Text
                  style={[styles.utilityTitle, { color: Colors[theme].text }]}
                >
                  Preview Feature Lock Modal
                </Text>
                <Text
                  style={[
                    styles.utilityDesc,
                    { color: Colors[theme].text_secondary },
                  ]}
                >
                  Test the pro features lock bottom sheet
                </Text>
              </View>
            </View>
            <Image
              source={require("@/assets/icons/chevron-right.png")}
              style={{
                width: 14,
                height: 14,
                tintColor: Colors[theme].text_secondary,
              }}
            />
          </Pressable>
        </View>

        <Text
          style={{
            textAlign: "center",
            fontFamily: "FontRegular",
            fontSize: 13,
            color: Colors[theme].text_secondary,
            marginTop: 30,
          }}
        >
          Recurring billing. Cancel anytime.
        </Text>
      </ScrollView>

      {/* Top Up Snoop Packs bottom sheet */}
      <TopUpModal
        visible={topUpVisible}
        onClose={() => setTopUpVisible(false)}
      />

      {/* Premium locked feature bottom sheet */}
      <PremiumFeatureModal
        visible={featureLockVisible}
        onClose={() => setFeatureLockVisible(false)}
        featureName="Custom Alert Logic"
        featureDescription="Unlock custom conditional tracking, priority push notifications, and up to 5 individual source URLs per watchlist."
      />
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
    padding: 5,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "FontBold",
    letterSpacing: -0.5,
  },
  currentPlanContainer: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 25,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "FontBold",
    letterSpacing: -0.5,
  },
  plansContainer: {
    gap: 20,
  },
  planCard: {
    padding: 24,
    borderRadius: 24,
    position: "relative",
  },
  badgeContainer: {
    position: "absolute",
    top: 16,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontFamily: "FontBold",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  planName: {
    fontSize: 22,
    fontFamily: "FontBold",
    marginBottom: 6,
  },
  price: {
    fontSize: 36,
    fontFamily: "FontBold",
    marginBottom: 20,
    letterSpacing: -1,
  },
  featuresList: {
    marginBottom: 24,
    gap: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureText: {
    fontFamily: "FontMedium",
    fontSize: 14,
    flex: 1,
  },
  planBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  planBtnText: {
    fontFamily: "FontBold",
    fontSize: 15,
  },
  utilityContainer: {
    gap: 12,
  },
  utilityBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  utilityBtnLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  utilityIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  utilityTitle: {
    fontFamily: "FontBold",
    fontSize: 15,
  },
  utilityDesc: {
    fontFamily: "FontRegular",
    fontSize: 12,
    marginTop: 1,
  },
});

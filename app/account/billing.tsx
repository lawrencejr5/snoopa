import Container from "@/components/Container";
import PremiumFeatureModal from "@/components/PremiumFeatureModal";
import TopUpModal from "@/components/TopUpModal";
import Colors from "@/constants/Colors";
import { useCustomAlert } from "@/context/CustomAlertContext";
import { useHapitcs } from "@/context/HapticsContext";
import { useTheme } from "@/context/ThemeContext";
import { useUser } from "@/context/UserContext";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Purchases from "react-native-purchases";

const PLANS = [
  {
    id: "pro",
    name: "Snoopa Pro",
    price: "$12",
    features: [
      "1,000 snoops per month",
      "Unlimited watchlists",
      "Customize watchlist conditions",
      "Set source url",
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
      "Unlimited watchlists",
      "4,000 snoops per month",
      "Set source url",
      "Customize watchlist conditions",
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
      "Unlimited watchlists",
      "Set source url",
      "Customize watchlist conditions",
      "Prioritized customer support",
    ],
    highlight: false,
    badge: "BEST VALUE",
  },
];

const TIER_LEVELS: Record<string, number> = {
  free: 0,
  pro: 1,
  supa: 2,
  max: 3,
};

export default function BillingScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const haptics = useHapitcs();
  const { showCustomAlert } = useCustomAlert();
  const { signedIn } = useUser();
  const upgradeUserTier = useMutation(api.snoops.upgrade_user_tier);

  const getPlanBtnText = (planId: string) => {
    const currentTier = signedIn?.sub_tier || "free";
    if (currentTier === planId) {
      return "Current Plan";
    }
    const currentLevel = TIER_LEVELS[currentTier] ?? 0;
    const targetLevel = TIER_LEVELS[planId] ?? 0;
    if (targetLevel > currentLevel) {
      return "Upgrade";
    } else {
      return "Downgrade";
    }
  };

  const [topUpVisible, setTopUpVisible] = useState(false);
  const [featureLockVisible, setFeatureLockVisible] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
  const [nextBillingDate, setNextBillingDate] = useState<string | null>(null);

  useEffect(() => {
    async function loadCustomerInfo() {
      if (Platform.OS === "web") return;
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        const entitlement =
          customerInfo.entitlements.active["snoopa_premium_monthly"];
        if (entitlement && entitlement.expirationDate) {
          const date = new Date(entitlement.expirationDate);
          setNextBillingDate(
            date.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            }),
          );
        }
      } catch (err) {
        console.error("Failed to fetch customer info:", err);
      }
    }
    loadCustomerInfo();
  }, []);

  useEffect(() => {
    async function loadOfferings() {
      if (Platform.OS === "web") return;
      try {
        const offerings = await Purchases.getOfferings();
        if (offerings.all["default_paywall"]?.availablePackages) {
          setPackages(offerings.all["default_paywall"].availablePackages);
        } else if (offerings.current?.availablePackages) {
          setPackages(offerings.current.availablePackages);
        }
      } catch (err) {
        console.error("Failed to fetch offerings:", err);
      }
    }
    loadOfferings();
  }, []);

  // Fallback to "Free" if signedIn user does not have a plan set.
  const currentPlan = signedIn?.sub_tier
    ? signedIn.sub_tier.toUpperCase()
    : signedIn?.plan
      ? signedIn.plan.toUpperCase()
      : "FREE";

  const handleSelectPlan = async (planId: string) => {
    haptics.impact("success");
    if (Platform.OS === "web") {
      showCustomAlert("Purchases are not supported on web.", "danger");
      return;
    }

    let rcPackageId = "";
    if (planId === "pro") rcPackageId = "rc_pro";
    else if (planId === "supa") rcPackageId = "rc_supa";
    else if (planId === "max") rcPackageId = "rc_max";

    const pkg = packages.find((p) => p.identifier === rcPackageId);
    if (!pkg) {
      showCustomAlert(
        "This plan is currently unavailable for purchase. Please try again later.",
        "danger",
      );
      return;
    }

    try {
      setIsPurchasing(planId);
      const { customerInfo } = await Purchases.purchasePackage(pkg);

      const entitlement =
        customerInfo.entitlements.active["snoopa_premium_monthly"];
      if (entitlement) {
        await upgradeUserTier({ tier: planId as "pro" | "supa" | "max" });
        showCustomAlert(
          `Successfully upgraded to Snoopa ${planId.toUpperCase()}!`,
          "success",
        );
      } else {
        showCustomAlert(
          "Purchase completed, but premium entitlement is not active. Please contact support.",
          "warning",
        );
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        showCustomAlert(e.message || "Purchase failed", "danger");
      }
    } finally {
      setIsPurchasing(null);
    }
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
          {signedIn?.sub_tier &&
            signedIn.sub_tier !== "free" &&
            nextBillingDate && (
              <View
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: Colors[theme].border,
                }}
              >
                <Text
                  style={{
                    fontFamily: "FontMedium",
                    fontSize: 13,
                    color: Colors[theme].text_secondary,
                  }}
                >
                  Next billing date: {nextBillingDate}
                </Text>
              </View>
            )}
        </View>

        {/* Pricing Tiers header */}
        <Text
          style={[
            styles.sectionTitle,
            { color: Colors[theme].text, marginBottom: 16 },
          ]}
        >
          {signedIn?.is_premium ? "Plans" : "Upgrade Plans"}
        </Text>

        {/* Plan Cards */}
        <View style={styles.plansContainer}>
          {[...PLANS]
            .sort((a, b) => {
              const isAActive = signedIn?.sub_tier === a.id;
              const isBActive = signedIn?.sub_tier === b.id;
              if (isAActive && !isBActive) return -1;
              if (!isAActive && isBActive) return 1;
              return 0;
            })
            .map((plan) => (
              <View
                key={plan.id}
                style={[
                  styles.planCard,
                  {
                    backgroundColor: Colors[theme].card,
                    borderColor:
                      plan.highlight || signedIn?.sub_tier === plan.id
                        ? Colors[theme].primary
                        : Colors[theme].border,
                    borderWidth:
                      plan.highlight || signedIn?.sub_tier === plan.id ? 2 : 1,
                  },
                ]}
              >
                {plan.badge || signedIn?.sub_tier === plan.id ? (
                  <View
                    style={[
                      styles.badgeContainer,
                      {
                        backgroundColor:
                          plan.highlight || signedIn?.sub_tier === plan.id
                            ? Colors[theme].primary
                            : Colors[theme].border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        {
                          color:
                            plan.highlight || signedIn?.sub_tier === plan.id
                              ? Colors[theme].background
                              : Colors[theme].text,
                        },
                      ]}
                    >
                      {signedIn?.sub_tier === plan.id
                        ? "CURRENT PLAN"
                        : plan.badge}
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

                {signedIn?.sub_tier === plan.id && nextBillingDate && (
                  <Text
                    style={{
                      fontFamily: "FontMedium",
                      fontSize: 13,
                      color: Colors[theme].text_secondary,
                      marginBottom: 16,
                      marginTop: -10,
                    }}
                  >
                    Renews: {nextBillingDate}
                  </Text>
                )}

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
                  onPress={() => handleSelectPlan(plan.id)}
                  disabled={
                    isPurchasing !== null || signedIn?.sub_tier === plan.id
                  }
                  style={({ pressed }) => [
                    styles.planBtn,
                    {
                      backgroundColor: plan.highlight
                        ? Colors[theme].primary
                        : "transparent",
                      borderColor: Colors[theme].primary,
                      borderWidth: 1,
                      opacity:
                        pressed ||
                        isPurchasing !== null ||
                        signedIn?.sub_tier === plan.id
                          ? 0.7
                          : 1,
                    },
                  ]}
                >
                  {isPurchasing === plan.id ? (
                    <ActivityIndicator
                      color={
                        plan.highlight
                          ? Colors[theme].background
                          : Colors[theme].primary
                      }
                      size="small"
                    />
                  ) : (
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
                      {getPlanBtnText(plan.id)}
                    </Text>
                  )}
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
                  Top up your snoops instantly
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

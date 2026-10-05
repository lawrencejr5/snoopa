import Colors from "@/constants/Colors";
import { useCustomAlert } from "@/context/CustomAlertContext";
import { useHapitcs } from "@/context/HapticsContext";
import { useTheme } from "@/context/ThemeContext";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Purchases from "react-native-purchases";

import { PLANS } from "@/constants/Plans";

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function PaywallModal({ visible, onClose }: PaywallModalProps) {
  const { theme } = useTheme();
  const haptics = useHapitcs();
  const { showCustomAlert } = useCustomAlert();
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const [packages, setPackages] = useState<any[]>([]);
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);

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
        console.error("Failed to fetch offerings for PaywallModal:", err);
      }
    }
    if (visible) {
      loadOfferings();
    }
  }, [visible]);

  const isPresentedRef = useRef(false);

  useEffect(() => {
    if (visible) {
      isPresentedRef.current = true;
      bottomSheetRef.current?.present();
    } else if (isPresentedRef.current) {
      isPresentedRef.current = false;
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        isPresentedRef.current = false;
        onClose();
      }
    },
    [onClose],
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
    [],
  );

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
        showCustomAlert(
          `Successfully upgraded to Snoopa ${planId.toUpperCase()}! 🚀`,
          "success",
        );
        bottomSheetRef.current?.dismiss();
        onClose();
      } else {
        showCustomAlert(
          "Purchase completed, but premium entitlement is processing.",
          "warning",
        );
        bottomSheetRef.current?.dismiss();
        onClose();
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
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={["90%"]}
      index={0}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: Colors[theme].card,
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
      }}
      handleIndicatorStyle={{ backgroundColor: Colors[theme].border }}
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.sheetContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Snoopa Logo */}
        <View style={styles.header}>
          <Image
            source={require("@/assets/images/splash-icon.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: Colors[theme].text }]}>
            Upgrade Snoopa
          </Text>
          <Text
            style={[styles.subtitle, { color: Colors[theme].text_secondary }]}
          >
            Choose a plan to track unlimited watchlists & get real-time
            intelligence alerts.
          </Text>
        </View>

        {/* Plan Cards */}
        <View style={{ gap: 16, marginBottom: 16 }}>
          {PLANS.map((plan) => (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                {
                  backgroundColor: Colors[theme].surface,
                  borderColor: plan.highlight
                    ? Colors[theme].primary
                    : Colors[theme].border,
                  borderWidth: plan.highlight ? 2 : 1,
                },
              ]}
            >
              {/* Badge row if badge exists */}
              {plan.badge ? (
                <View style={styles.badgeRow}>
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
                </View>
              ) : null}

              {/* Title & Price Row */}
              <View style={styles.planHeaderRow}>
                <Text style={[styles.planName, { color: Colors[theme].text }]}>
                  {plan.name}
                </Text>
                <Text style={[styles.price, { color: Colors[theme].primary }]}>
                  {plan.price}
                  <Text
                    style={{
                      fontSize: 14,
                      color: Colors[theme].text_secondary,
                      fontFamily: "FontRegular",
                    }}
                  >
                    {plan.period}
                  </Text>
                </Text>
              </View>

              {/* Features List */}
              <View style={{ gap: 8, marginBottom: 16, marginTop: 10 }}>
                {plan.features.map((feat, idx) => (
                  <View
                    key={idx}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Image
                      source={require("@/assets/icons/check-fill.png")}
                      style={{
                        width: 14,
                        height: 14,
                        tintColor: Colors[theme].primary,
                      }}
                    />
                    <Text
                      style={{
                        color: Colors[theme].text_secondary,
                        fontFamily: "FontMedium",
                        fontSize: 13,
                      }}
                    >
                      {feat}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Upgrade Button */}
              <Pressable
                onPress={() => handleSelectPlan(plan.id)}
                disabled={isPurchasing !== null}
                style={({ pressed }) => [
                  styles.upgradeBtn,
                  {
                    backgroundColor: plan.highlight
                      ? Colors[theme].primary
                      : Colors[theme].text,
                    opacity: pressed || isPurchasing !== null ? 0.8 : 1,
                  },
                ]}
              >
                {isPurchasing === plan.id ? (
                  <ActivityIndicator
                    color={Colors[theme].background}
                    size="small"
                  />
                ) : (
                  <Text
                    style={[
                      styles.upgradeBtnText,
                      { color: Colors[theme].background },
                    ]}
                  >
                    SELECT {plan.name.toUpperCase()}
                  </Text>
                )}
              </Pressable>
            </View>
          ))}
        </View>

        {/* Continue with free plan */}
        <Pressable
          onPress={() => {
            haptics.impact("light");
            bottomSheetRef.current?.dismiss();
            onClose();
          }}
          style={({ pressed }) => [
            styles.freeBtn,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text
            style={[
              styles.freeBtnText,
              { color: Colors[theme].text_secondary },
            ]}
          >
            Continue with Free Plan
          </Text>
        </Pressable>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetContainer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  logoImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 12,
  },
  title: {
    fontFamily: "FontBold",
    fontSize: 22,
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
  planCard: {
    padding: 18,
    borderRadius: 20,
  },
  badgeRow: {
    alignItems: "flex-end",
    marginBottom: 6,
  },
  badgeContainer: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontFamily: "FontBold",
    fontSize: 9,
    letterSpacing: 0.5,
  },
  planHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planName: {
    fontSize: 20,
    fontFamily: "FontBold",
  },
  price: {
    fontSize: 24,
    fontFamily: "FontBold",
  },
  upgradeBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeBtnText: {
    fontFamily: "FontBold",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  freeBtn: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 4,
  },
  freeBtnText: {
    fontFamily: "FontMedium",
    fontSize: 14,
  },
});

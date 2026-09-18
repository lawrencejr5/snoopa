import Colors from "@/constants/Colors";
import { useCustomAlert } from "@/context/CustomAlertContext";
import { useHapitcs } from "@/context/HapticsContext";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/convex/_generated/api";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useMutation, useQuery } from "convex/react";
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
import { isAdSupported, showRewardedAd } from "@/utils/adHelper";
import Purchases, { PURCHASE_TYPE } from "react-native-purchases";

const AD_DAILY_LIMIT = 3;

interface TopUpModalProps {
  visible: boolean;
  onClose: () => void;
}

const PACKS = [
  {
    id: "boost_pack",
    name: "Boost Pack",
    price: "$4.99",
    description: "200 Snoops",
    icon: require("@/assets/icons/tracked.png"),
  },
  {
    id: "fuel_pack",
    name: "Fuel Pack",
    price: "$9.99",
    description: "500 Snoops",
    icon: require("@/assets/icons/tracked.png"),
  },
  {
    id: "surge_pack",
    name: "Surge Pack",
    price: "$19.99",
    description: "1200 Snoops",
    icon: require("@/assets/icons/tracked.png"),
  },
];

export default function TopUpModal({ visible, onClose }: TopUpModalProps) {
  const { theme } = useTheme();
  const haptics = useHapitcs();
  const { showCustomAlert } = useCustomAlert();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const addTopUp = useMutation(api.snoops.add_top_up);
  const claimAdReward = useMutation(api.snoops.claim_ad_reward);
  const adViewsToday = useQuery(api.snoops.get_ad_views_today) ?? 0;

  const [products, setProducts] = useState<any[]>([]);
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
  const [isLoadingAd, setIsLoadingAd] = useState(false);

  const adsRemaining = AD_DAILY_LIMIT - adViewsToday;
  const adLimitReached = adsRemaining <= 0;

  // ---------------------------------------------------------------------------
  // Load IAP products
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function loadProducts() {
      if (Platform.OS === "web") return;
      try {
        const productIds = [
          "snoopa_boost_200_consumable",
          "snoopa_fuel_500_consumable",
          "snoopa_surge_1200_consumable",
        ];
        const fetchedProducts = await Purchases.getProducts(
          productIds,
          PURCHASE_TYPE.INAPP,
        );
        setProducts(fetchedProducts);
      } catch (err) {
        console.error("Failed to fetch products:", err);
      }
    }
    loadProducts();
  }, []);

  // ---------------------------------------------------------------------------
  // Sheet visibility
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
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
      />
    ),
    [],
  );

  // ---------------------------------------------------------------------------
  // IAP Purchase
  // ---------------------------------------------------------------------------
  const handlePurchase = async (packId: string) => {
    haptics.impact("success");
    if (Platform.OS === "web") {
      showCustomAlert("Purchases are not supported on web.", "danger");
      return;
    }

    let rcProductId = "";
    let amount = 0;
    if (packId === "boost_pack") {
      rcProductId = "snoopa_boost_200_consumable";
      amount = 200;
    } else if (packId === "fuel_pack") {
      rcProductId = "snoopa_fuel_500_consumable";
      amount = 500;
    } else if (packId === "surge_pack") {
      rcProductId = "snoopa_surge_1200_consumable";
      amount = 1200;
    }

    const product = products.find((p) => p.identifier === rcProductId);
    if (!product) {
      showCustomAlert(
        "This top-up pack is currently unavailable. Please try again later.",
        "danger",
      );
      return;
    }

    try {
      setIsPurchasing(packId);
      await Purchases.purchaseStoreProduct(product);
      await addTopUp({ amount });
      showCustomAlert(`Successfully purchased ${amount} Snoops!`, "success");
      bottomSheetRef.current?.dismiss();
      onClose();
    } catch (e: any) {
      if (!e.userCancelled) {
        showCustomAlert(e.message || "Purchase failed", "danger");
      }
    } finally {
      setIsPurchasing(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Watch Ad
  // ---------------------------------------------------------------------------
  const handleWatchAd = () => {
    if (!isAdSupported) {
      showCustomAlert("Ads are not supported on web.", "danger");
      return;
    }
    if (adLimitReached) return;

    haptics.impact("success");
    setIsLoadingAd(true);

    showRewardedAd({
      onAdLoaded: () => {
        setIsLoadingAd(false);
      },
      onRewardEarned: async () => {
        const result = await claimAdReward({});
        return result?.reward_amount ?? 2;
      },
      onAdClosed: (earnedRewardAmount, claimError) => {
        if (earnedRewardAmount !== null) {
          haptics.impact("success");
          showCustomAlert(
            `You've received ${earnedRewardAmount} free snoops. Keep tracking!`,
            "success",
          );
        } else if (claimError === "limit") {
          showCustomAlert("You've hit today's ad limit (3/day).", "danger");
        } else if (claimError === "failed") {
          showCustomAlert("Could not grant snoops. Try again.", "danger");
        }
      },
      onAdFailedToLoad: () => {
        setIsLoadingAd(false);
        showCustomAlert("Ad failed to load. Please try again.", "danger");
      },
    });
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={["45%"]}
      index={0}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: Colors[theme].card }}
      handleIndicatorStyle={{ backgroundColor: Colors[theme].border }}
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.sheetContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: Colors[theme].text }]}>
            Top Up Snoops
          </Text>
          <Pressable
            onPress={() => bottomSheetRef.current?.dismiss()}
            style={({ pressed }) => [
              styles.closeBtn,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Image
              source={require("@/assets/icons/times.png")}
              style={{
                width: 14,
                height: 14,
                tintColor: Colors[theme].text_secondary,
              }}
            />
          </Pressable>
        </View>

        <Text
          style={[styles.subtitle, { color: Colors[theme].text_secondary }]}
        >
          Running low on snoops? Top up to keep monitoring your intelligence
          streams.
        </Text>

        {/* ---- Earn Free Snoops Card ---- */}
        <View style={styles.sectionLabel}>
          <Text
            style={[
              styles.sectionLabelText,
              { color: Colors[theme].text_secondary },
            ]}
          >
            FREE
          </Text>
        </View>

        <Pressable
          onPress={handleWatchAd}
          disabled={adLimitReached || isLoadingAd || isPurchasing !== null}
          style={({ pressed }) => [
            styles.adCard,
            {
              backgroundColor: adLimitReached
                ? Colors[theme].surface
                : Colors[theme].primary + "12",
              borderColor: adLimitReached
                ? Colors[theme].border
                : Colors[theme].primary + "40",
              opacity: pressed || (adLimitReached && !isLoadingAd) ? 0.6 : 1,
            },
          ]}
        >
          {/* Left side */}
          <View style={styles.packLeft}>
            <View
              style={[
                styles.iconWrapper,
                {
                  backgroundColor: adLimitReached
                    ? Colors[theme].border
                    : Colors[theme].primary + "20",
                },
              ]}
            >
              {isLoadingAd ? (
                <ActivityIndicator color={Colors[theme].primary} size="small" />
              ) : (
                <Image
                  source={require("@/assets/icons/tracked.png")}
                  style={{
                    width: 20,
                    height: 20,
                    tintColor: adLimitReached
                      ? Colors[theme].text_secondary
                      : Colors[theme].primary,
                  }}
                />
              )}
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.packName, { color: Colors[theme].text }]}>
                {isLoadingAd ? "Loading ad…" : "Watch an Ad"}
              </Text>
              <Text
                style={[
                  styles.packDesc,
                  { color: Colors[theme].text_secondary },
                ]}
              >
                {adLimitReached
                  ? "Daily limit reached — resets at midnight"
                  : `${adsRemaining}/${AD_DAILY_LIMIT} remaining today`}
              </Text>
            </View>
          </View>

          {/* Right badge */}
          <View style={styles.packRight}>
            {adLimitReached ? (
              <View
                style={[
                  styles.priceBadge,
                  { backgroundColor: Colors[theme].border },
                ]}
              >
                <Text
                  style={[
                    styles.priceText,
                    { color: Colors[theme].text_secondary },
                  ]}
                >
                  Done
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.priceBadge,
                  { backgroundColor: Colors[theme].primary },
                ]}
              >
                <Text
                  style={[
                    styles.priceText,
                    { color: Colors[theme].background },
                  ]}
                >
                  Top up
                </Text>
              </View>
            )}
          </View>
        </Pressable>

        {/* ---- Snoop Packs ---- */}
        <View style={[styles.sectionLabel, { marginTop: 20 }]}>
          <Text
            style={[
              styles.sectionLabelText,
              { color: Colors[theme].text_secondary },
            ]}
          >
            PACKS
          </Text>
        </View>

        <View style={styles.packsList}>
          {PACKS.map((pack) => (
            <Pressable
              key={pack.id}
              onPress={() => handlePurchase(pack.id)}
              disabled={isPurchasing !== null || isLoadingAd}
              style={({ pressed }) => [
                styles.packCard,
                {
                  backgroundColor: Colors[theme].surface,
                  borderColor: Colors[theme].border,
                  opacity:
                    pressed || isPurchasing !== null || isLoadingAd ? 0.7 : 1,
                },
              ]}
            >
              <View style={styles.packLeft}>
                <View
                  style={[
                    styles.iconWrapper,
                    { backgroundColor: Colors[theme].primary + "12" },
                  ]}
                >
                  <Image
                    source={pack.icon}
                    style={{
                      width: 20,
                      height: 20,
                      tintColor: Colors[theme].primary,
                    }}
                  />
                </View>
                <View style={styles.textContainer}>
                  <Text
                    style={[styles.packName, { color: Colors[theme].text }]}
                  >
                    {pack.name}
                  </Text>
                  <Text
                    style={[
                      styles.packDesc,
                      { color: Colors[theme].text_secondary },
                    ]}
                  >
                    {pack.description}
                  </Text>
                </View>
              </View>

              <View style={styles.packRight}>
                {isPurchasing === pack.id ? (
                  <ActivityIndicator
                    color={Colors[theme].primary}
                    size="small"
                  />
                ) : (
                  <View
                    style={[
                      styles.priceBadge,
                      { backgroundColor: Colors[theme].primary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.priceText,
                        { color: Colors[theme].background },
                      ]}
                    >
                      {pack.price}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          ))}
        </View>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "FontBold",
    letterSpacing: -0.5,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
  },
  subtitle: {
    fontFamily: "FontRegular",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  sectionLabel: {
    marginBottom: 10,
  },
  sectionLabelText: {
    fontFamily: "FontBold",
    fontSize: 11,
    letterSpacing: 1.2,
  },
  adCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  packsList: {
    gap: 12,
  },
  packCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  packLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  packName: {
    fontFamily: "FontBold",
    fontSize: 16,
  },
  packDesc: {
    fontFamily: "FontRegular",
    fontSize: 12,
  },
  packRight: {
    justifyContent: "center",
  },
  priceBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  priceText: {
    fontFamily: "FontBold",
    fontSize: 14,
  },
});

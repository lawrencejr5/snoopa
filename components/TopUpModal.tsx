import Colors from "@/constants/Colors";
import { useCustomAlert } from "@/context/CustomAlertContext";
import { useHapitcs } from "@/context/HapticsContext";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/convex/_generated/api";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useMutation } from "convex/react";
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
import Purchases, { PURCHASE_TYPE } from "react-native-purchases";

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

  const [products, setProducts] = useState<any[]>([]);
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);

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

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={["50%"]}
      index={0}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: Colors[theme].card }}
      handleIndicatorStyle={{ backgroundColor: Colors[theme].border }}
    >
      <BottomSheetView style={styles.sheetContainer}>
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
          Running low on snoops? Purchase one-off top-up packs to keep
          monitoring your intelligence streams.
        </Text>

        {/* Packs list */}
        <View style={styles.packsList}>
          {PACKS.map((pack) => (
            <Pressable
              key={pack.id}
              onPress={() => handlePurchase(pack.id)}
              disabled={isPurchasing !== null}
              style={({ pressed }) => [
                styles.packCard,
                {
                  backgroundColor: Colors[theme].surface,
                  borderColor: Colors[theme].border,
                  opacity: pressed || isPurchasing !== null ? 0.7 : 1,
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
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 30,
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

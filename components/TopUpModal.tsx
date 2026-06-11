import Colors from "@/constants/Colors";
import { useCustomAlert } from "@/context/CustomAlertContext";
import { useTheme } from "@/context/ThemeContext";
import { useHapitcs } from "@/context/HapticsContext";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import React, { useCallback, useEffect, useRef } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

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
    [onClose]
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    []
  );

  const handlePurchase = (packName: string) => {
    haptics.impact("success");
    showCustomAlert(`${packName} purchase coming soon!`, "success");
    bottomSheetRef.current?.dismiss();
    onClose();
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

        <Text style={[styles.subtitle, { color: Colors[theme].text_secondary }]}>
          Running low on snoops? Purchase one-off top-up packs to keep monitoring your intelligence streams.
        </Text>

        {/* Packs list */}
        <View style={styles.packsList}>
          {PACKS.map((pack) => (
            <Pressable
              key={pack.id}
              onPress={() => handlePurchase(pack.name)}
              style={({ pressed }) => [
                styles.packCard,
                {
                  backgroundColor: Colors[theme].surface,
                  borderColor: Colors[theme].border,
                  opacity: pressed ? 0.92 : 1,
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
                  <Text style={[styles.packName, { color: Colors[theme].text }]}>
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

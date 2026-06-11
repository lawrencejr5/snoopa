import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { useHapitcs } from "@/context/HapticsContext";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface PremiumFeatureModalProps {
  visible: boolean;
  onClose: () => void;
  featureName?: string;
  featureDescription?: string;
}

export default function PremiumFeatureModal({
  visible,
  onClose,
  featureName = "Premium Feature",
  featureDescription = "Upgrade your account to access advanced tracking capabilities, custom alert rules, and unlimited snooping power.",
}: PremiumFeatureModalProps) {
  const { theme } = useTheme();
  const haptics = useHapitcs();
  const router = useRouter();
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

  const handleUpgradeNavigation = () => {
    haptics.impact("light");
    bottomSheetRef.current?.dismiss();
    onClose();
    // Navigate to billing screen
    router.push("/account/billing");
  };

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={["40%"]}
      index={0}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: Colors[theme].card }}
      handleIndicatorStyle={{ backgroundColor: Colors[theme].border }}
    >
      <BottomSheetView style={styles.sheetContainer}>
        {/* Lock Icon Visual */}
        <View style={styles.content}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: Colors[theme].primary + "12" },
            ]}
          >
            <Image
              source={require("@/assets/icons/lock.png")}
              style={{
                width: 24,
                height: 24,
                tintColor: Colors[theme].primary,
              }}
            />
          </View>

          {/* Heading */}
          <Text style={[styles.title, { color: Colors[theme].text }]}>
            Unlock {featureName}
          </Text>

          {/* Subtitle */}
          <Text
            style={[
              styles.description,
              { color: Colors[theme].text_secondary },
            ]}
          >
            {featureDescription}
          </Text>

          {/* CTA Buttons */}
          <View style={styles.buttonContainer}>
            <Pressable
              onPress={() => bottomSheetRef.current?.dismiss()}
              style={[
                styles.cancelBtn,
                { borderColor: Colors[theme].border },
              ]}
            >
              <Text
                style={[
                  styles.cancelText,
                  { color: Colors[theme].text_secondary },
                ]}
              >
                Maybe Later
              </Text>
            </Pressable>

            <Pressable
              onPress={handleUpgradeNavigation}
              style={({ pressed }) => [
                styles.upgradeBtn,
                {
                  backgroundColor: Colors[theme].primary,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.upgradeText,
                  { color: Colors[theme].background },
                ]}
              >
                View Plans
              </Text>
            </Pressable>
          </View>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 30,
  },
  content: {
    alignItems: "center",
    flex: 1,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: "FontBold",
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    fontFamily: "FontRegular",
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontFamily: "FontMedium",
    fontSize: 15,
  },
  upgradeBtn: {
    flex: 1.5,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeText: {
    fontFamily: "FontBold",
    fontSize: 15,
  },
});

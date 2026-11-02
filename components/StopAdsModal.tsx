import Colors from "@/constants/Colors";
import { useHapitcs } from "@/context/HapticsContext";
import { useTheme } from "@/context/ThemeContext";
import { DONT_SHOW_STOP_ADS_KEY } from "@/utils/navigationState";
import { Octicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface StopAdsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function StopAdsModal({ visible, onClose }: StopAdsModalProps) {
  const { theme } = useTheme();
  const haptics = useHapitcs();
  const router = useRouter();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (visible) {
      setDontShowAgain(false);
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

  const persistPreferenceIfChecked = async () => {
    if (dontShowAgain) {
      try {
        await AsyncStorage.setItem(DONT_SHOW_STOP_ADS_KEY, "true");
      } catch (e) {
        console.error("Failed to save stop ads preference:", e);
      }
    }
  };

  const handleDismiss = async () => {
    haptics.impact("light");
    await persistPreferenceIfChecked();
    bottomSheetRef.current?.dismiss();
    onClose();
  };

  const handleUpgrade = async () => {
    haptics.impact("success");
    await persistPreferenceIfChecked();
    bottomSheetRef.current?.dismiss();
    onClose();
    router.push("/account/billing");
  };

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={["44%"]}
      index={0}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: Colors[theme].card }}
      handleIndicatorStyle={{ backgroundColor: Colors[theme].border }}
    >
      <BottomSheetView style={styles.sheetContainer}>
        <View style={styles.content}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: Colors[theme].warning + "18" },
            ]}
          >
            <Octicons name="zap" size={24} color={Colors[theme].warning} />
          </View>

          <Text style={[styles.title, { color: Colors[theme].text }]}>
            Stop Seeing Ads?
          </Text>

          <Text
            style={[
              styles.description,
              { color: Colors[theme].text_secondary },
            ]}
          >
            Upgrade to Snoopa Pro to create watchlists instantly without watching
            ads, plus get unlimited active tracking and priority scraping.
          </Text>

          {/* Don't show this again checkbox */}
          <Pressable
            onPress={() => setDontShowAgain((prev) => !prev)}
            style={styles.checkboxRow}
            hitSlop={8}
          >
            <View
              style={[
                styles.checkboxBox,
                {
                  borderColor: dontShowAgain
                    ? Colors[theme].primary
                    : Colors[theme].border,
                  backgroundColor: dontShowAgain
                    ? Colors[theme].primary
                    : "transparent",
                },
              ]}
            >
              {dontShowAgain && (
                <Octicons
                  name="check"
                  size={12}
                  color={Colors[theme].background}
                />
              )}
            </View>
            <Text
              style={[
                styles.checkboxLabel,
                { color: Colors[theme].text_secondary },
              ]}
            >
              Don't show this again
            </Text>
          </Pressable>

          {/* Action buttons */}
          <View style={styles.buttonContainer}>
            <Pressable
              onPress={handleDismiss}
              style={[
                styles.dismissBtn,
                { borderColor: Colors[theme].border },
              ]}
            >
              <Text
                style={[
                  styles.dismissText,
                  { color: Colors[theme].text_secondary },
                ]}
              >
                I'm good
              </Text>
            </Pressable>

            <Pressable
              onPress={handleUpgrade}
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
                Upgrade
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
    paddingBottom: 28,
  },
  content: {
    alignItems: "center",
    flex: 1,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontFamily: "FontBold",
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: "center",
  },
  description: {
    fontSize: 13,
    fontFamily: "FontRegular",
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
    alignSelf: "center",
  },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxLabel: {
    fontSize: 12,
    fontFamily: "FontMedium",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  dismissBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dismissText: {
    fontFamily: "FontMedium",
    fontSize: 14,
  },
  upgradeBtn: {
    flex: 1.2,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeText: {
    fontFamily: "FontBold",
    fontSize: 14,
  },
});


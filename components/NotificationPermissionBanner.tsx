import React, { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/Colors";
import { usePushNotification } from "@/context/PushNotification";
import { useTheme } from "@/context/ThemeContext";
import { useUser } from "@/context/UserContext";

export default function NotificationPermissionBanner({
  style,
}: {
  style?: any;
}) {
  const { theme } = useTheme();
  const { signedIn } = useUser();
  const { isPermissionGranted, permissionStatus, openDeviceSettings } =
    usePushNotification();
  const [dismissed, setDismissed] = useState(false);

  // Only show if user is signed in, permission is explicitly denied, and user has not dismissed it
  const isDenied = permissionStatus === "denied";
  if (!signedIn || isPermissionGranted || !isDenied || dismissed) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: Colors[theme].surface,
          borderColor: Colors[theme].warning + "50",
        },
        style,
      ]}
    >
      <View style={styles.leftRow}>
        <View
          style={[
            styles.iconWrapper,
            { backgroundColor: Colors[theme].warning + "20" },
          ]}
        >
          <Image
            source={require("@/assets/icons/bells.png")}
            style={[styles.icon, { tintColor: Colors[theme].warning }]}
          />
        </View>

        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: Colors[theme].text }]}>
            Notifications are off
          </Text>
          <Text
            style={[styles.subtitle, { color: Colors[theme].text_secondary }]}
            numberOfLines={2}
          >
            Enable push alerts in iOS Settings to receive instant watchlist intel.
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={openDeviceSettings}
          style={({ pressed }) => [
            styles.actionButton,
            {
              backgroundColor: Colors[theme].text,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text
            style={[styles.actionText, { color: Colors[theme].background }]}
          >
            ENABLE
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setDismissed(true)}
          hitSlop={10}
          style={styles.closeButton}
        >
          <Text style={[styles.closeText, { color: Colors[theme].text_secondary }]}>
            ✕
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginBottom: 14,
    gap: 10,
  },
  leftRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: 16,
    height: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: "FontBold",
    fontSize: 13,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: "FontRegular",
    fontSize: 11,
    lineHeight: 15,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    fontFamily: "FontBold",
    fontSize: 10,
    letterSpacing: 0.6,
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 13,
    fontFamily: "FontMedium",
  },
});

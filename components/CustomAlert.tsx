import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface CustomAlertProps {
  visible: boolean;
  msg: string;
  theme: "success" | "danger" | "warning";
  onHide: () => void;
  duration?: number;
}

const CustomAlert = ({
  visible,
  msg,
  theme,
  onHide,
  duration,
}: CustomAlertProps) => {
  const insets = useSafeAreaInsets();
  const { theme: deviceTheme } = useTheme();

  // Initial position: Off-screen (Above the top edge)
  const translateY = useRef(new Animated.Value(-150)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: insets.top + 10,
        useNativeDriver: true,
        speed: 12,
        bounciness: 4,
      }).start();

      if (timerRef.current) clearTimeout(timerRef.current);

      // If duration is 0, it becomes a sticky alert (no auto-hide)
      if (duration !== 0) {
        timerRef.current = setTimeout(() => {
          hideAlert();
        }, duration || 3000) as any;
      }
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, duration]);


  const hideAlert = () => {
    Animated.timing(translateY, {
      toValue: -150, // Move back off-screen
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onHide();
    });
  };

  const getIcon = () => {
    switch (theme) {
      case "success":
        return require("@/assets/icons/check-fill.png");
      case "danger":
        return require("@/assets/icons/danger.png");
      case "warning":
        return require("@/assets/icons/warning.png");
      default:
        return require("@/assets/icons/check-fill.png");
    }
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: Colors[deviceTheme].surface,
          borderColor: Colors[deviceTheme].border,
          transform: [{ translateY }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={hideAlert}
        style={styles.contentContainer}
      >
        <Image
          source={getIcon()}
          style={{
            width: 18,
            height: 18,
            tintColor: Colors[deviceTheme].primary,
          }}
        />
        <Text
          style={[styles.messageText, { color: Colors[deviceTheme].primary }]}
          numberOfLines={2}
        >
          {msg}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    zIndex: 9999,
    borderRadius: 10,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 10,
    alignSelf: "center",
    maxWidth: "90%",
  },
  contentContainer: {
    gap: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  messageText: {
    fontSize: 14,
    fontFamily: "FontBold",
    flexShrink: 1,
  },
});

export default CustomAlert;

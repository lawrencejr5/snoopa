import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface CustomAlertProps {
  visible: boolean;
  msg: string;
  theme: "success" | "danger" | "warning";
  onHide: () => void;
}

const CustomAlert = ({ visible, msg, theme, onHide }: CustomAlertProps) => {
  const insets = useSafeAreaInsets();
  const { theme: deviceTheme } = useTheme();

  // Initial position: Off-screen (Above the top edge)
  const translateY = useRef(new Animated.Value(-150)).current;
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: insets.top + 10,
        useNativeDriver: true,
        speed: 12,
        bounciness: 8,
      }).start();

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        hideAlert();
      }, 2000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible]);

  const hideAlert = () => {
    Animated.timing(translateY, {
      toValue: -150, // Move back off-screen
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      // Only now do we tell the parent to unmount the Modal
      onHide();
    });
  };

  // Select background color based on theme
  const getBackgroundColor = () => {
    switch (theme) {
      case "success":
        return Colors[deviceTheme].success;
      case "danger":
        return Colors[deviceTheme].danger;
      case "warning":
        return Colors[deviceTheme].warning;
      default:
        return Colors[deviceTheme].primary;
    }
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

  // If the parent says visible=false, we don't render the Modal
  // (unless we are mid-animation, but the parent state controls the mount)
  if (!visible) return null;

  return (
    <Modal
      transparent={true}
      visible={visible}
      pointerEvents="box-none"
      animationType="none" // We use your custom Animated.spring instead
      statusBarTranslucent={true} // Allows it to cover status bar area
      onRequestClose={hideAlert} // Android back button support
    >
      <Pressable onPress={hideAlert} style={{ flex: 1 }}>
        <View style={styles.modalOverlay} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.container,
              {
                backgroundColor: Colors[deviceTheme].surface,
                borderColor: getBackgroundColor(),
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
                  width: 16,
                  height: 16,
                  tintColor: getBackgroundColor(),
                }}
              />
              <Text
                style={[styles.messageText, { color: getBackgroundColor() }]}
                numberOfLines={2}
              >
                {msg}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
  },
  container: {
    position: "absolute",
    top: 0,
    borderRadius: 50,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
    alignSelf: "center",
  },
  contentContainer: {
    gap: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  messageText: {
    fontSize: 14,
    fontFamily: "NunitoBold",
  },
});

export default CustomAlert;

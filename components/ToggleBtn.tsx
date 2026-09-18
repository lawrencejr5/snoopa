import React from "react";
import { Animated, Pressable, StyleSheet } from "react-native";

import Colors from "@/constants/Colors";

import { useHapitcs } from "@/context/HapticsContext";
import { useTheme } from "@/context/ThemeContext";

interface ToggleButtonProps {
  isOn: boolean;
  onToggle: () => void;
}

const ToggleButton: React.FC<ToggleButtonProps> = ({ isOn, onToggle }) => {
  const { theme } = useTheme();
  const haptics = useHapitcs();

  const animatedValue = React.useRef(new Animated.Value(isOn ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isOn ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isOn]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 22],
  });

  const backgroundColor = isOn
    ? Colors[theme].primary
    : Colors[theme].text_secondary;

  const handlePress = () => {
    haptics.impact("light");
    onToggle();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[
        styles.container,
        {
          backgroundColor,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.circle,
          {
            transform: [{ translateX }],
            backgroundColor: Colors[theme].background,
          },
        ]}
      />
    </Pressable>
  );
};

export default ToggleButton;

const styles = StyleSheet.create({
  container: {
    width: 50,
    height: 28,
    borderRadius: 20,
    justifyContent: "center",
    padding: 2,
  },
  circle: {
    width: 22,
    height: 22,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2.5,
    elevation: 4,
  },
});

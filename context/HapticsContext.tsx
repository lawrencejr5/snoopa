import React, {
  createContext,
  FC,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import * as Haptics from "expo-haptics";

import AsyncStorage from "@react-native-async-storage/async-storage";

type ImpactStyleTypes =
  | "light"
  | "medium"
  | "heavy"
  | "rigid"
  | "soft"
  | "success"
  | "error"
  | "warning";

interface HapticsContextType {
  enabled: boolean;
  toggleHaptics: () => void;
  impact: (style?: ImpactStyleTypes) => void;
}

const HapticsContext = createContext<HapticsContextType | null>(null);

const HapticsProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [enabled, setEnabled] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const loadSetting = async () => {
      const saved = await AsyncStorage.getItem("haptics");
      if (saved !== null) {
        setEnabled(saved === "true");
      }
      setLoading(false);
    };

    loadSetting();
  }, []);

  const toggleHaptics = () => {
    setEnabled((prev: boolean) => {
      AsyncStorage.setItem("haptics", String(!prev));
      return !prev;
    });
  };

  // Haptic feedback styles
  const impact = (style = "medium") => {
    if (enabled) {
      if (style === "light") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      if (style === "medium") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      if (style === "heavy") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      if (style === "rigid") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
      }
      if (style === "soft") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
      }
      if (style === "success") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      if (style === "warning") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      if (style === "error") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  if (loading) return null;

  return (
    <HapticsContext.Provider value={{ enabled, toggleHaptics, impact }}>
      {children}
    </HapticsContext.Provider>
  );
};

export const useHapitcs = () => {
  const context = useContext(HapticsContext);
  if (!context)
    throw new Error("Haptics context must be used within the haptics provider");
  return context;
};

export default HapticsProvider;

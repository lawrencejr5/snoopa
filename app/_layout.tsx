import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import "react-native-reanimated";
import CustomSplash from "./splashscreen";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";

import { CustomAlertProvider } from "@/context/CustomAlertContext";
import HapticsProvider from "@/context/HapticsContext";
import { PushNotificationProvider } from "@/context/PushNotification";
import DeviceThemeProvider, { useTheme } from "@/context/ThemeContext";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    FontBold: require("../assets/fonts/SpaceGrotesk/SpaceGrotesk-Bold.ttf"),
    FontLight: require("../assets/fonts/SpaceGrotesk/SpaceGrotesk-Light.ttf"),
    FontMedium: require("../assets/fonts/SpaceGrotesk/SpaceGrotesk-Medium.ttf"),
    FontRegular: require("../assets/fonts/SpaceGrotesk/SpaceGrotesk-Regular.ttf"),
    FontSemiBold: require("../assets/fonts/SpaceGrotesk/SpaceGrotesk-SemiBold.ttf"),
    GeistBold: require("../assets/fonts/Geist/Geist-Bold.ttf"),
    GeistLight: require("../assets/fonts/Geist/Geist-Light.ttf"),
    GeistMedium: require("../assets/fonts/Geist/Geist-Medium.ttf"),
    GeistRegular: require("../assets/fonts/Geist/Geist-Regular.ttf"),
    GeistSemiBold: require("../assets/fonts/Geist/Geist-SemiBold.ttf"),
    GeistExtraBold: require("../assets/fonts/Geist/Geist-ExtraBold.ttf"),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  return (
    <ConvexAuthProvider client={convex} storage={AsyncStorage}>
      <KeyboardProvider>
        <DeviceThemeProvider>
          <HapticsProvider>
            <CustomAlertProvider>
              <DeviceThemeProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <PushNotificationProvider>
                    <BottomSheetModalProvider>
                      <WithinContext loaded={loaded} />
                    </BottomSheetModalProvider>
                  </PushNotificationProvider>
                </GestureHandlerRootView>
              </DeviceThemeProvider>
            </CustomAlertProvider>
          </HapticsProvider>
        </DeviceThemeProvider>
      </KeyboardProvider>
    </ConvexAuthProvider>
  );
}

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

const WithinContext = ({ loaded }: { loaded: boolean }) => {
  const { theme } = useTheme();

  const [showSplash, setShowSplash] = useState<boolean>(true);

  useEffect(() => {
    if (loaded) {
      const timer = setTimeout(() => {
        SplashScreen.hideAsync();
        setShowSplash(false);
      }, 2_000);
      return () => clearTimeout(timer);
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  if (!loaded || showSplash) {
    return <CustomSplash />;
  }

  return (
    <>
      <StatusBar style={"light"} />
      <Stack
        screenOptions={{
          headerShown: false,
          presentation: "card",
          animation: "ios_from_right",
        }}
      />
    </>
  );
};

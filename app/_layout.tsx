import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";

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
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    NunitoBold: require("../assets/fonts/Nunito/Nunito-Bold.ttf"),
    NunitoLight: require("../assets/fonts/Nunito/Nunito-Light.ttf"),
    NunitoMedium: require("../assets/fonts/Nunito/Nunito-Medium.ttf"),
    NunitoRegular: require("../assets/fonts/Nunito/Nunito-Regular.ttf"),
    NunitoSemiBold: require("../assets/fonts/Nunito/Nunito-SemiBold.ttf"),
    NunitoExtraBold: require("../assets/fonts/Nunito/Nunito-ExtraBold.ttf"),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

function RootLayoutNav() {
  const { theme } = useTheme();
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
                      <StatusBar style={theme === "dark" ? "light" : "dark"} />
                      <Stack
                        screenOptions={{
                          headerShown: false,
                          presentation: "card",
                          animation: "ios_from_right",
                        }}
                      />
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

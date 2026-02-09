import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import "react-native-reanimated";
import CustomSplash from "./splashscreen";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient, useConvexAuth } from "convex/react";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";

import { CustomAlertProvider } from "@/context/CustomAlertContext";
import HapticsProvider from "@/context/HapticsContext";
import LoadingProvider from "@/context/LoadingContext";
import { PushNotificationProvider } from "@/context/PushNotification";
import DeviceThemeProvider from "@/context/ThemeContext";
import UserProvider from "@/context/UserContext";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

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
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <DeviceThemeProvider>
            <HapticsProvider>
              <LoadingProvider>
                <CustomAlertProvider>
                  <PushNotificationProvider>
                    <UserProvider>
                      <BottomSheetModalProvider>
                        <WithinContext loaded={loaded} />
                      </BottomSheetModalProvider>
                    </UserProvider>
                  </PushNotificationProvider>
                </CustomAlertProvider>
              </LoadingProvider>
            </HapticsProvider>
          </DeviceThemeProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </ConvexAuthProvider>
  );
}

const WithinContext = ({ loaded }: { loaded: boolean }) => {
  const router = useRouter();
  const segments = useSegments() as string[];
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [showSplash, setShowSplash] = useState<boolean>(true);

  useEffect(() => {
    if (loaded) {
      const timer = setTimeout(() => {
        SplashScreen.hideAsync();
        setShowSplash(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [loaded]);

  useEffect(() => {
    if (!loaded || isLoading) return;

    const inAuthGroup = segments[0] === "welcome";

    console.log(segments[0]);

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/welcome");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, loaded, isLoading, segments]);

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

import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import "react-native-reanimated";
import CustomSplash from "./splashscreen";
import Purchases from "react-native-purchases";
import { AppState, AppStateStatus, Platform } from "react-native";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient, useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";

import { CustomAlertProvider } from "@/context/CustomAlertContext";
import HapticsProvider from "@/context/HapticsContext";
import LoadingProvider from "@/context/LoadingContext";
import { PushNotificationProvider } from "@/context/PushNotification";
import DeviceThemeProvider from "@/context/ThemeContext";
import UserProvider from "@/context/UserContext";
import RewardModal from "@/components/RewardModal";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

if (Platform.OS === "android") {
  Purchases.configure({ apiKey: "goog_cdHpElMIUawEmgegCRwXFNiOqhi" });
} else if (Platform.OS === "ios") {
  Purchases.configure({ apiKey: "appl_COatCguwPZtkvjzcXNWVhuJbvJD" });
}

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
  const segments = useSegments();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  const [show_reward_modal, set_show_reward_modal] = useState(false);
  const app_state_ref = useRef<AppStateStatus>(AppState.currentState);

  // Query for pending (unclaimed) reward notification
  const pending_reward = useQuery(
    api.notifications.get_pending_reward,
    isAuthenticated ? {} : "skip",
  );

  useEffect(() => {
    const isFirstTime = async () => {
      const value = await AsyncStorage.getItem("hasSeenOnboarding");
      setIsFirstLaunch(value === null);
    };
    isFirstTime();
  }, []);

  useEffect(() => {
    // Hide the default native splash immediately so user sees CustomSplash
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    // Force custom splash screen to show for at least 2 seconds (2000ms)
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loaded || isLoading || isFirstLaunch === null) return;

    const inAuthGroup = segments[0] === "welcome" || segments[0] === "onboarding";

    if (!isAuthenticated && !inAuthGroup) {
      if (isFirstLaunch) {
        router.replace("/onboarding");
      } else {
        router.replace("/welcome");
      }
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading, loaded, segments, isFirstLaunch]);

  const dismissed_rewards_ref = useRef<string[]>([]);

  // Show the reward modal as soon as a pending reward is detected
  useEffect(() => {
    if (
      pending_reward &&
      isAuthenticated &&
      !showSplash &&
      !dismissed_rewards_ref.current.includes(pending_reward._id)
    ) {
      set_show_reward_modal(true);
    }
  }, [pending_reward, isAuthenticated, showSplash]);

  // Re-check when the app returns to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (next_state: AppStateStatus) => {
        if (
          app_state_ref.current.match(/inactive|background/) &&
          next_state === "active" &&
          pending_reward &&
          isAuthenticated &&
          !dismissed_rewards_ref.current.includes(pending_reward._id)
        ) {
          set_show_reward_modal(true);
        }
        app_state_ref.current = next_state;
      },
    );
    return () => subscription.remove();
  }, [pending_reward, isAuthenticated]);

  if (!loaded || showSplash || isFirstLaunch === null) {
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
      >
        <Stack.Screen name="onboarding" dangerouslySingular />
        <Stack.Screen name="welcome" dangerouslySingular />
      </Stack>

      {/* Reward modal — shown when a premium grant is detected */}
      {show_reward_modal && pending_reward && (
        <RewardModal
          reward={pending_reward}
          onDismiss={() => {
            dismissed_rewards_ref.current.push(pending_reward._id);
            set_show_reward_modal(false);
          }}
        />
      )}
    </>
  );
};

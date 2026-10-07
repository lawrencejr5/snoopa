import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import Purchases from "react-native-purchases";
import "react-native-reanimated";
import { requestTrackingPermissionsAsync } from "expo-tracking-transparency";
import CustomSplash from "./splashscreen";

import { api } from "@/convex/_generated/api";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient, useConvexAuth, useQuery } from "convex/react";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";

import RewardModal from "@/components/RewardModal";
import { CustomAlertProvider } from "@/context/CustomAlertContext";
import AnalyticsProvider from "@/context/AnalyticsProvider";
import HapticsProvider from "@/context/HapticsContext";
import LoadingProvider from "@/context/LoadingContext";
import {
  PushNotificationProvider,
  usePushNotification,
} from "@/context/PushNotification";
import DeviceThemeProvider from "@/context/ThemeContext";
import UserProvider, { useUser } from "@/context/UserContext";
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
    <AnalyticsProvider>
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
    </AnalyticsProvider>
  );
}

const WithinContext = ({ loaded }: { loaded: boolean }) => {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { isPaywallOpen } = useUser();
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
    if (!showSplash) {
      (async () => {
        try {
          const { status } = await requestTrackingPermissionsAsync();
          console.log("App Tracking Transparency permission status:", status);
        } catch (e) {
          console.warn("Error requesting App Tracking Transparency permissions:", e);
        }
      })();
    }
  }, [showSplash]);

  useEffect(() => {
    if (!loaded || isLoading || isFirstLaunch === null) return;

    const inAuthGroup =
      segments[0] === "welcome" || segments[0] === "onboarding";

    if (!isAuthenticated && !inAuthGroup) {
      if (isFirstLaunch) {
        router.replace("/onboarding");
      } else {
        router.replace("/welcome");
      }
    } else if (isAuthenticated && inAuthGroup) {
      AsyncStorage.setItem("just_signed_in", "true").catch(() => {});
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading, loaded, segments, isFirstLaunch]);

  const dismissed_rewards_ref = useRef<string[]>([]);

  // Show the reward modal as soon as a pending reward is detected and paywall is closed
  useEffect(() => {
    if (
      pending_reward &&
      isAuthenticated &&
      !showSplash &&
      !isPaywallOpen &&
      !dismissed_rewards_ref.current.includes(pending_reward._id)
    ) {
      set_show_reward_modal(true);
    }
  }, [pending_reward, isAuthenticated, showSplash, isPaywallOpen]);

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
          !isPaywallOpen &&
          !dismissed_rewards_ref.current.includes(pending_reward._id)
        ) {
          set_show_reward_modal(true);
        }
        app_state_ref.current = next_state;
      },
    );
    return () => subscription.remove();
  }, [pending_reward, isAuthenticated, isPaywallOpen]);

  const { notificationResponse } = usePushNotification();
  const last_handled_notification_id_ref = useRef<string | null>(null);

  // Handle push notification tap routing
  useEffect(() => {
    if (!notificationResponse) return;
    if (!loaded || isLoading || showSplash || !isAuthenticated) return;

    const response_id = notificationResponse.notification.request.identifier;
    if (last_handled_notification_id_ref.current === response_id) return;

    last_handled_notification_id_ref.current = response_id;

    const data = notificationResponse.notification.request.content.data as
      | {
          watchlist_id?: string;
          watchlistId?: string;
          notification_id?: string;
          type?: string;
        }
      | undefined;
    const watchlist_id = data?.watchlist_id || data?.watchlistId;

    if (watchlist_id) {
      router.push({
        pathname: "/snoop/[id]",
        params: { id: String(watchlist_id) },
      } as any);
    } else if (data?.notification_id) {
      router.push({
        pathname: "/notifications/[id]",
        params: { id: String(data.notification_id) },
      } as any);
    } else if (data?.type === "snoops" || data?.type === "reward") {
      router.push("/notifications" as any);
    }
  }, [
    notificationResponse,
    loaded,
    isLoading,
    showSplash,
    isAuthenticated,
    router,
  ]);

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
        <Stack.Screen
          name="trending-modal"
          options={{
            presentation: "modal",
            animation: "slide_from_bottom",
          }}
        />
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

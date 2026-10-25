import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Linking, Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function sendPushNotification(expoPushToken: string) {
  const message = {
    to: expoPushToken,
    sound: "dog_bark_single.wav",
    title: "Original Title",
    body: "And here is the body!",
    data: { someData: "goes here" },
  };

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });
}

/**
 * Configure Android notification channels if on Android.
 */
async function configureAndroidNotificationChannelAsync() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
      sound: "dog_bark_single.wav",
    });
  }
}

/**
 * Check current notification permissions without showing any system prompt.
 */
export async function getNotificationPermissionsAsync(): Promise<{
  status: Notifications.PermissionStatus;
  granted: boolean;
  canAskAgain: boolean;
}> {
  if (!Device.isDevice) {
    return {
      status: Notifications.PermissionStatus.DENIED,
      granted: false,
      canAskAgain: false,
    };
  }
  return await Notifications.getPermissionsAsync();
}

/**
 * Get an existing push token ONLY if permissions are already granted.
 * Does NOT prompt the user.
 */
export async function getExistingPushTokenAsync(): Promise<string | null> {
  if (!Device.isDevice) return null;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== Notifications.PermissionStatus.GRANTED) {
      return null;
    }

    await configureAndroidNotificationChannelAsync();

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;
    if (!projectId) return null;

    const pushTokenString = (
      await Notifications.getExpoPushTokenAsync({
        projectId,
      })
    ).data;

    return pushTokenString;
  } catch (err) {
    console.warn("Failed to get existing push token:", err);
    return null;
  }
}

/**
 * Request notification permissions and register for push notifications.
 * If user has already denied on iOS (canAskAgain is false), this will return null.
 */
export async function registerForPushNotificationsAsync(
  requestIfNeeded: boolean = true,
): Promise<string | null> {
  await configureAndroidNotificationChannelAsync();

  if (!Device.isDevice) {
    console.log("Must use physical device for push notifications");
    return null;
  }

  const { status: existingStatus, canAskAgain } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== Notifications.PermissionStatus.GRANTED && requestIfNeeded) {
    // Only call requestPermissionsAsync if not permanently denied
    if (canAskAgain !== false || Platform.OS === "android") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
  }

  if (finalStatus !== Notifications.PermissionStatus.GRANTED) {
    console.log("Notification permission not granted, status:", finalStatus);
    return null;
  }

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId;
  if (!projectId) {
    console.warn("Project ID not found for push notifications");
    return null;
  }

  try {
    const pushTokenString = (
      await Notifications.getExpoPushTokenAsync({
        projectId,
      })
    ).data;
    return pushTokenString;
  } catch (e: unknown) {
    console.warn("Error getting push token:", e);
    return null;
  }
}

/**
 * Open device system settings for Snoopa.
 * Directly opens Notification settings on iOS/Android.
 */
export function openDeviceNotificationSettings() {
  Linking.openSettings().catch((err) => {
    console.warn("Could not open device settings:", err);
  });
}

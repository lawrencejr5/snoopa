import * as Notifications from "expo-notifications";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Alert, AppState, AppStateStatus } from "react-native";
import { api } from "@/convex/_generated/api";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  getExistingPushTokenAsync,
  getNotificationPermissionsAsync,
  openDeviceNotificationSettings,
  registerForPushNotificationsAsync,
} from "../utils/reg_push_notifications";

export interface NotificationContextType {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  notificationResponse: Notifications.NotificationResponse | null;
  error: Error | null;
  permissionStatus: Notifications.PermissionStatus | null;
  isPermissionGranted: boolean;
  isPushEnabled: boolean;
  refreshPermissions: () => Promise<Notifications.PermissionStatus | null>;
  requestNotificationPermission: () => Promise<boolean>;
  toggleNotifications: (enabled: boolean) => Promise<boolean>;
  openDeviceSettings: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export const usePushNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "usePushNotification must be used within a PushNotificationProvider",
    );
  }
  return context;
};

interface PushNotificationProviderProps {
  children: ReactNode;
}

export const PushNotificationProvider: React.FC<
  PushNotificationProviderProps
> = ({ children }) => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] =
    useState<Notifications.PermissionStatus | null>(null);
  const [isPushEnabled, setIsPushEnabled] = useState<boolean>(false);
  const [notification, setNotification] =
    useState<Notifications.Notification | null>(null);
  const [notificationResponse, setNotificationResponse] =
    useState<Notifications.NotificationResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const notificationListener = useRef<Notifications.EventSubscription | null>(
    null,
  );
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  const lastNotificationResponse = Notifications.useLastNotificationResponse();

  // Convex Auth & Mutations
  const { isAuthenticated } = useConvexAuth();
  const currentUser = useQuery(
    api.users.get_current_user,
    isAuthenticated ? {} : "skip",
  );
  const storePushToken = useMutation(api.users.storePushToken);
  const setNotificationsEnabledMutation = useMutation(
    api.users.set_notifications_enabled,
  );

  const isPermissionGranted =
    permissionStatus === Notifications.PermissionStatus.GRANTED;

  /**
   * Refresh the OS notification permission status.
   * If permission is granted, safely retrieve the token.
   */
  const refreshPermissions =
    useCallback(async (): Promise<Notifications.PermissionStatus | null> => {
      try {
        const { status } = await getNotificationPermissionsAsync();
        setPermissionStatus(status);

        if (status === Notifications.PermissionStatus.GRANTED) {
          const token = await getExistingPushTokenAsync();
          if (token) {
            setExpoPushToken(token);
          }
          if (currentUser?.notifications_enabled === false) {
            setIsPushEnabled(false);
          } else {
            setIsPushEnabled(true);
          }
        } else {
          setIsPushEnabled(false);
        }

        return status;
      } catch (err: any) {
        console.warn("Error refreshing notification permissions:", err);
        setError(err);
        return null;
      }
    }, [currentUser?.notifications_enabled]);

  /**
   * Request notification permission from the user.
   * If previously permanently denied (on iOS), shows a friendly alert with a link to Settings.
   */
  const requestNotificationPermission =
    useCallback(async (): Promise<boolean> => {
      try {
        const { status: currentStatus, canAskAgain } =
          await getNotificationPermissionsAsync();

        if (currentStatus === Notifications.PermissionStatus.GRANTED) {
          setPermissionStatus(Notifications.PermissionStatus.GRANTED);
          const token = await getExistingPushTokenAsync();
          if (token) {
            setExpoPushToken(token);
            if (isAuthenticated) {
              await storePushToken({ token });
            }
          }
          setIsPushEnabled(true);
          return true;
        }

        // If user denied permission previously on iOS, canAskAgain is false.
        // Calling requestPermissionsAsync won't show the prompt. Direct to settings.
        if (
          currentStatus === Notifications.PermissionStatus.DENIED &&
          canAskAgain === false
        ) {
          Alert.alert(
            "Enable Notifications in Settings",
            "1. Tap 'Notifications' at the top of the screen\n2. Turn on 'Allow Notifications'",
            [
              { text: "Not Now", style: "cancel" },
              {
                text: "Open Settings",
                style: "default",
                onPress: () => openDeviceNotificationSettings(),
              },
            ],
          );
          return false;
        }

        // First time or allowed to prompt
        const token = await registerForPushNotificationsAsync(true);
        const { status: newStatus } = await getNotificationPermissionsAsync();
        setPermissionStatus(newStatus);

        if (newStatus === Notifications.PermissionStatus.GRANTED) {
          if (token) {
            setExpoPushToken(token);
            if (isAuthenticated) {
              storePushToken({ token }).catch(() => {});
            }
          }
          setIsPushEnabled(true);
          return true;
        } else {
          setIsPushEnabled(false);
          return false;
        }
      } catch (err: any) {
        console.warn("Error requesting notification permission:", err);
        setError(err);
        return false;
      }
    }, [isAuthenticated, storePushToken]);

  /**
   * Toggle notifications on or off with instant optimistic response (zero lag).
   */
  const toggleNotifications = useCallback(
    async (enable: boolean): Promise<boolean> => {
      try {
        if (enable) {
          // If permission is already granted, flip switch immediately with zero network delay
          if (permissionStatus === Notifications.PermissionStatus.GRANTED) {
            setIsPushEnabled(true);
            if (isAuthenticated) {
              setNotificationsEnabledMutation({
                enabled: true,
                token: expoPushToken ?? undefined,
              }).catch((err) => {
                console.warn("Failed to update notification setting in Convex:", err);
                setIsPushEnabled(false);
              });
            }
            return true;
          }

          // If not granted, request permission
          const granted = await requestNotificationPermission();
          if (!granted) {
            setIsPushEnabled(false);
            return false;
          }

          setIsPushEnabled(true);
          if (isAuthenticated) {
            setNotificationsEnabledMutation({
              enabled: true,
              token: expoPushToken ?? undefined,
            }).catch((err) => {
              console.warn("Failed to update notification setting in Convex:", err);
            });
          }
          return true;
        } else {
          // Disable notifications immediately with zero network delay
          setIsPushEnabled(false);
          if (isAuthenticated) {
            setNotificationsEnabledMutation({
              enabled: false,
            }).catch((err) => {
              console.warn("Failed to update notification setting in Convex:", err);
              setIsPushEnabled(true);
            });
          }
          return true;
        }
      } catch (err: any) {
        console.warn("Error toggling notifications:", err);
        setError(err);
        return false;
      }
    },
    [
      expoPushToken,
      isAuthenticated,
      permissionStatus,
      requestNotificationPermission,
      setNotificationsEnabledMutation,
    ],
  );

  const openDeviceSettings = useCallback(() => {
    openDeviceNotificationSettings();
  }, []);

  // Update response when user interacts with notification
  useEffect(() => {
    if (lastNotificationResponse) {
      setNotificationResponse(lastNotificationResponse);
    }
  }, [lastNotificationResponse]);

  // Initial mount: Check permissions read-only (DO NOT aggressively show prompt on cold start)
  useEffect(() => {
    const initPermissions = async () => {
      try {
        const { status } = await getNotificationPermissionsAsync();
        setPermissionStatus(status);

        if (status === Notifications.PermissionStatus.GRANTED) {
          const token = await getExistingPushTokenAsync();
          if (token) {
            setExpoPushToken(token);
          }
        } else {
          setIsPushEnabled(false);
        }
      } catch (err: any) {
        setError(err);
      }
    };

    initPermissions();

    // Notification listener for foreground notifications
    notificationListener.current =
      Notifications.addNotificationReceivedListener((incoming) => {
        setNotification(incoming);
      });

    // Listener for notification taps
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        setNotificationResponse(response);
      });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  // Foreground listener: whenever app transitions from background to active, re-check permissions.
  // This seamlessly detects if user enabled/disabled notifications in device settings!
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (
          appStateRef.current.match(/inactive|background/) &&
          nextState === "active"
        ) {
          refreshPermissions();
        }
        appStateRef.current = nextState;
      },
    );

    return () => {
      subscription.remove();
    };
  }, [refreshPermissions]);

  // Sync token to Convex automatically whenever authenticated and permissions are active
  useEffect(() => {
    if (!isAuthenticated || !isPermissionGranted) {
      setIsPushEnabled(false);
      return;
    }

    if (currentUser) {
      if (currentUser.notifications_enabled === false) {
        setIsPushEnabled(false);
        return;
      }

      if (expoPushToken) {
        const userTokens = currentUser.pushTokens || [];
        const needsTokenSync = !userTokens.includes(expoPushToken);

        if (needsTokenSync) {
          storePushToken({ token: expoPushToken }).catch((err) => {
            console.warn("Failed to auto-sync push token to Convex:", err);
          });
        }
      }

      setIsPushEnabled(true);
    }
  }, [
    isAuthenticated,
    expoPushToken,
    isPermissionGranted,
    currentUser?.notifications_enabled,
    currentUser?.pushTokens,
    storePushToken,
  ]);

  return (
    <NotificationContext.Provider
      value={{
        expoPushToken,
        notification,
        notificationResponse,
        error,
        permissionStatus,
        isPermissionGranted,
        isPushEnabled,
        refreshPermissions,
        requestNotificationPermission,
        toggleNotifications,
        openDeviceSettings,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

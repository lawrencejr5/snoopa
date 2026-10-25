import * as Localization from "expo-localization";
import { getCountryCodeFromTimeZone, getCountryName } from "@/utils/country";
import React, {
  createContext,
  FC,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import Purchases from "react-native-purchases";

import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { posthog } from "@/utils/posthog";
import { useMutation, useQuery } from "convex/react";

import AsyncStorage from "@react-native-async-storage/async-storage";

type UserData = Doc<"users"> & { profile_url?: string | null };
interface UserContextType {
  signedIn: UserData | undefined;
  isPaywallOpen: boolean;
  setIsPaywallOpen: (open: boolean) => void;
}

const UserContext = createContext<UserContextType | null>(null);

const UserProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const currentUser = useQuery(api.users.get_current_user);
  const signedIn = currentUser as UserData;
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const identifiedUserId = useRef<string | undefined>(undefined);
  const cachedLocationRef = useRef<{ name: string; code: string } | null>(null);
  const lastLocationFetchRef = useRef<number>(0);
  const syncSubscription = useMutation(api.snoops.sync_user_subscription);
  const updateAppLoadMetadata = useMutation(api.users.update_app_load_metadata);
  const saveReferralSource = useMutation(api.users.save_referral_source);
  const checkAndGrantFreeSnoops = useMutation(
    api.snoops.check_and_grant_free_lifetime_snoops,
  );

  useEffect(() => {
    const userId = signedIn?._id;

    if (!userId) {
      if (identifiedUserId.current) {
        posthog?.reset();
        identifiedUserId.current = undefined;
      }
      return;
    }

    if (identifiedUserId.current && identifiedUserId.current !== userId) {
      posthog?.reset();
    }

    posthog?.identify(userId, {
      $set: {
        email: signedIn.email,
        name: signedIn.fullname,
        ...(signedIn.plan ? { plan: signedIn.plan } : {}),
        ...(signedIn.sub_tier
          ? { subscription_tier: signedIn.sub_tier }
          : {}),
      },
    });
    identifiedUserId.current = userId;
  }, [
    signedIn?._id,
    signedIn?.email,
    signedIn?.fullname,
    signedIn?.plan,
    signedIn?.sub_tier,
  ]);

  useEffect(() => {
    if (!signedIn?._id) return;
    if (signedIn.is_premium) return; // Free lifetime snoops are only for free tier users
    checkAndGrantFreeSnoops().catch((err) => {
      console.error("Error checking free snoop grant:", err);
    });
  }, [signedIn?._id, signedIn?.is_premium]);

  useEffect(() => {
    if (!signedIn?._id) return;

    const checkPendingReferral = async () => {
      try {
        if (!signedIn.referral_source) {
          const pending = await AsyncStorage.getItem("pending_referral_source");
          if (pending) {
            await saveReferralSource({ source: pending });
            await AsyncStorage.removeItem("pending_referral_source");
          }
        }
      } catch (e) {
        console.error("Error syncing pending referral source:", e);
      }
    };

    checkPendingReferral();
  }, [signedIn?._id, signedIn?.referral_source]);

  useEffect(() => {
    if (!signedIn?._id) return;

    const fetchJsonWithTimeout = async (url: string, timeoutMs = 3500) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        if (
          data &&
          (data.error === true ||
            data.status === "fail" ||
            data.reason === "RateLimited")
        ) {
          throw new Error(data.message || data.reason || "Provider error");
        }
        return data;
      } finally {
        clearTimeout(timeoutId);
      }
    };

    const fetchIpLocation = async (): Promise<
      { name: string; code: string } | undefined
    > => {
      // 1. Primary: ipwho.is (Provides reliable geolocation + full country name + code)
      try {
        const data = await fetchJsonWithTimeout("https://ipwho.is/");
        const code = (data.country_code || "").trim();
        const rawName = (data.country || "").trim();
        const name =
          (rawName.length > 2 ? rawName : undefined) ||
          (code ? getCountryName(code) : undefined);
        if (code && name) {
          return { name, code: code.toUpperCase() };
        }
      } catch {
        // Fall through to next provider
      }

      // 2. Secondary: api.country.is (Fast & simple, returns 2-letter country code)
      try {
        const data = await fetchJsonWithTimeout("https://api.country.is");
        const code = (data.country || "").trim();
        if (code) {
          const name = getCountryName(code);
          if (name) {
            return { name, code: code.toUpperCase() };
          }
        }
      } catch {
        // Fall through to next provider
      }

      // 3. Tertiary: ipinfo.io (Fast fallback, returns 2-letter country code)
      try {
        const data = await fetchJsonWithTimeout("https://ipinfo.io/json");
        const code = (data.country || "").trim();
        if (code) {
          const name = getCountryName(code);
          if (name) {
            return { name, code: code.toUpperCase() };
          }
        }
      } catch {
        // Fall through to next provider
      }

      // 4. Quaternary: ipapi.co
      try {
        const data = await fetchJsonWithTimeout("https://ipapi.co/json/");
        const code = (data.country_code || data.country || "").trim();
        const rawName = (data.country_name || "").trim();
        const name =
          (rawName.length > 2 ? rawName : undefined) ||
          (code ? getCountryName(code) : undefined);
        if (code && name) {
          return { name, code: code.toUpperCase() };
        }
      } catch {
        // Fall through to device fallback
      }

      // 5. Fallback 1: Device timezone mapping
      // Crucial on Android where device language is set to "English (United States)"
      // but the user is physically located in Nigeria (Africa/Lagos)
      const tzCode = getCountryCodeFromTimeZone();
      if (tzCode) {
        return { name: getCountryName(tzCode), code: tzCode.toUpperCase() };
      }

      // 6. Fallback 2: Device locale region
      const locales = Localization.getLocales();
      const regionCode =
        locales && locales.length > 0 ? locales[0].regionCode : undefined;
      if (regionCode) {
        try {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
          // Safety: If device has an African timezone but language is en-US, don't claim US!
          if (regionCode.toUpperCase() === "US" && tz.startsWith("Africa/")) {
            return { name: "Nigeria", code: "NG" };
          }
        } catch {
          // ignore
        }
        return {
          name: getCountryName(regionCode),
          code: regionCode.toUpperCase(),
        };
      }

      return undefined;
    };

    const syncMetadata = async (forceRefreshLocation = false) => {
      try {
        const now = Date.now();
        // Avoid hammering IP APIs on every AppState active transition
        if (
          !cachedLocationRef.current ||
          forceRefreshLocation ||
          now - lastLocationFetchRef.current > 60 * 60 * 1000
        ) {
          const location = await fetchIpLocation();
          if (location) {
            cachedLocationRef.current = location;
            lastLocationFetchRef.current = now;
          }
        }

        const location = cachedLocationRef.current;
        const os =
          Platform.OS === "ios"
            ? "ios"
            : Platform.OS === "android"
              ? "android"
              : "web";
        const last_seen = Date.now();

        await updateAppLoadMetadata({
          os,
          country: location?.name,
          countryCode: location?.code,
          last_seen,
        });
      } catch (err) {
        console.error("Error updating user app load metadata:", err);
      }
    };

    syncMetadata();

    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          syncMetadata();
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [signedIn?._id]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (currentUser === undefined) return; // Wait until currentUser query finishes loading

    const handleCustomerInfo = async (customerInfo: any) => {
      try {
        const entitlement =
          customerInfo.entitlements.active["snoopa_premium_monthly"];
        if (entitlement) {
          const prodId = entitlement.productIdentifier || "";
          let tier: "pro" | "supa" | "max" = "pro";
          if (prodId.includes("max") || prodId === "rc_max") {
            tier = "max";
          } else if (prodId.includes("supa") || prodId === "rc_supa") {
            tier = "supa";
          } else if (prodId.includes("pro") || prodId === "rc_pro") {
            tier = "pro";
          }
          const sub_end_date = entitlement.expirationDate
            ? new Date(entitlement.expirationDate).getTime()
            : undefined;
          await syncSubscription({ is_premium: true, tier, sub_end_date });
        } else {
          await syncSubscription({ is_premium: false, tier: "free" });
        }
      } catch (err) {
        console.error("Error syncing subscription status:", err);
      }
    };

    // Listen for real-time updates (like dashboard grants or restore purchases)
    Purchases.addCustomerInfoUpdateListener(handleCustomerInfo);

    const syncUser = async () => {
      try {
        if (signedIn?._id) {
          await Purchases.logIn(signedIn._id);
          const customerInfo = await Purchases.getCustomerInfo();
          await handleCustomerInfo(customerInfo);
        } else {
          const isAnon = await Purchases.isAnonymous();
          if (!isAnon) {
            await Purchases.logOut();
            await syncSubscription({ is_premium: false, tier: "free" });
          }
        }
      } catch (err) {
        console.error("RevenueCat auth sync error:", err);
      }
    };

    syncUser();

    return () => {
      Purchases.removeCustomerInfoUpdateListener(handleCustomerInfo);
    };
  }, [signedIn?._id, currentUser === undefined]);

  return (
    <UserContext.Provider value={{ signedIn, isPaywallOpen, setIsPaywallOpen }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context)
    throw new Error("User context must be within the user provider");
  return context;
};

export default UserProvider;

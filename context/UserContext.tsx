import React, { createContext, FC, ReactNode, useContext, useEffect } from "react";
import Purchases from "react-native-purchases";
import { AppState, AppStateStatus, Platform } from "react-native";
import * as Localization from "expo-localization";

import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { useQuery, useMutation } from "convex/react";

type UserData = Doc<"users"> & { profile_url?: string | null };
interface UserContextType {
  signedIn: UserData | undefined;
}

const UserContext = createContext<UserContextType | null>(null);

const UserProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const currentUser = useQuery(api.users.get_current_user);
  const signedIn = currentUser as UserData;
  const syncSubscription = useMutation(api.snoops.sync_user_subscription);
  const updateAppLoadMetadata = useMutation(api.users.update_app_load_metadata);

  useEffect(() => {
    if (!signedIn?._id) return;

    const getCountryName = (code: string): string => {
      try {
        const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
        return displayNames.of(code.toUpperCase()) || code.toUpperCase();
      } catch {
        return code.toUpperCase();
      }
    };

    const fetchIpLocation = async (): Promise<string | undefined> => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const res = await fetch("https://ipapi.co/json/", { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          const code = data.country_code || data.country;
          const name = data.country_name || (code ? getCountryName(code) : undefined);
          if (name) return name;
        }
      } catch {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);
          const res = await fetch("https://api.country.is", { signal: controller.signal });
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            const code = data.country;
            if (code) return getCountryName(code);
          }
        } catch {
          // ignore fallback failure
        }
      }

      // Fallback to device locale region if IP lookup fails
      const locales = Localization.getLocales();
      const regionCode = locales && locales.length > 0 ? locales[0].regionCode : undefined;
      return regionCode ? getCountryName(regionCode) : undefined;
    };

    const syncMetadata = async () => {
      try {
        const location = await fetchIpLocation();
        const os = Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web";
        const last_seen = Date.now();

        await updateAppLoadMetadata({
          os,
          country: location,
          last_seen,
        });
      } catch (err) {
        console.error("Error updating user app load metadata:", err);
      }
    };

    syncMetadata();

    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (nextState === "active") {
        syncMetadata();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [signedIn?._id]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (currentUser === undefined) return; // Wait until currentUser query finishes loading

    const handleCustomerInfo = async (customerInfo: any) => {
      try {
        const entitlement = customerInfo.entitlements.active["snoopa_premium_monthly"];
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
    <UserContext.Provider value={{ signedIn }}>{children}</UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context)
    throw new Error("User context must be within the user provider");
  return context;
};

export default UserProvider;

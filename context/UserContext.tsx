import React, { createContext, FC, ReactNode, useContext, useEffect } from "react";
import Purchases from "react-native-purchases";
import { Platform } from "react-native";

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

  useEffect(() => {
    if (Platform.OS === "web") return;

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
          await syncSubscription({ is_premium: true, tier });
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
  }, [signedIn?._id]);

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

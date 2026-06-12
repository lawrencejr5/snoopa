import React, { createContext, FC, ReactNode, useContext, useEffect } from "react";
import Purchases from "react-native-purchases";
import { Platform } from "react-native";

import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";

type UserData = Doc<"users"> & { profile_url?: string | null };
interface UserContextType {
  signedIn: UserData | undefined;
}

const UserContext = createContext<UserContextType | null>(null);

const UserProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const currentUser = useQuery(api.users.get_current_user);
  const signedIn = currentUser as UserData;

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (signedIn?._id) {
      Purchases.logIn(signedIn._id).catch((err) => {
        console.error("RevenueCat login error:", err);
      });
    } else {
      Purchases.logOut().catch((err) => {
        console.error("RevenueCat logout error:", err);
      });
    }
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

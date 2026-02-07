import React, { createContext, FC, ReactNode, useContext } from "react";

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

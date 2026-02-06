import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Google({
      profile(googleProfile) {
        return {
          id: googleProfile.sub,
          email: googleProfile.email,
          fullname: googleProfile.name,
          username: googleProfile.name.split(" ")[1],
        };
      },
    }),
  ],
  callbacks: {
    async redirect({ redirectTo }) {
      // 1. Check if it's a local development URL
      const isLocal = redirectTo.startsWith("http://localhost");

      // 2. Check if it's your specific mobile app scheme
      const isApp = redirectTo.startsWith("com.lawrencejr.snoopa://");

      if (isLocal || isApp) {
        return redirectTo;
      }

      // 3. Block everything else
      throw new Error(`Security Block: Invalid redirect to ${redirectTo}`);
    },
  },
});

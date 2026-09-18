import Google from "@auth/core/providers/google";
import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { convexAuth, createAccount, retrieveAccount } from "@convex-dev/auth/server";
import { api } from "./_generated/api";
import { MutationCtx } from "./_generated/server";
import { end_of_month_timestamp } from "./snoops";

const decode_base64 = (str: string): string => {
  if (typeof atob === "function") {
    return atob(str);
  }
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let buffer = "";
  const clean_str = str.replace(/=+$/, "").replace(/[^A-Za-z0-9+/]/g, "");
  let bc = 0;
  let bs = 0;
  for (let idx = 0; idx < clean_str.length; idx++) {
    const char = clean_str.charAt(idx);
    const p = chars.indexOf(char);
    if (p === -1) continue;
    bs = bc % 4 ? bs * 64 + p : p;
    if (bc++ % 4) {
      buffer += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
    }
  }
  return buffer;
};

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Google({
      allowDangerousEmailAccountLinking: true,
      profile(googleProfile) {
        const avatars: Array<"chill" | "gay" | "relax" | "shy" | "swaga"> = [
          "chill",
          "gay",
          "relax",
          "shy",
          "swaga",
        ];
        const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];
        return {
          id: googleProfile.sub,
          email: googleProfile.email,
          fullname: googleProfile.name,
          username: googleProfile.name.split(" ")[1],
          plan: "free",
          avatar: randomAvatar,
        };
      },
    }),
    ConvexCredentials({
      id: "apple",
      authorize: async (credentials, ctx) => {
        const identity_token = credentials.identityToken as string;
        if (!identity_token) {
          throw new Error("Missing Apple identity token");
        }

        // Safe decoding of Apple JWT token
        let payload: any;
        try {
          const parts = identity_token.split(".");
          if (parts.length !== 3) {
            throw new Error("Invalid ID token format");
          }
          const payload_b64url = parts[1];
          const base64 = payload_b64url.replace(/-/g, "+").replace(/_/g, "/");
          const padded_base64 = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, "=");
          const json_str = decode_base64(padded_base64);
          payload = JSON.parse(json_str);
        } catch (error) {
          console.error("Error decoding Apple token", error);
          throw new Error("Failed to decode Apple identity token");
        }

        if (payload.iss !== "https://appleid.apple.com") {
          throw new Error("Invalid Apple token issuer");
        }
        if (payload.aud !== "com.lawrencejr.snoopa") {
          throw new Error("Invalid Apple token audience");
        }
        if (!payload.sub) {
          throw new Error("Apple token missing subject claim");
        }

        const apple_user_id = payload.sub;

        // Try to retrieve existing account linked to Apple
        let retrieved = null;
        try {
          retrieved = await retrieveAccount(ctx, {
            provider: "apple",
            account: { id: apple_user_id },
          });
        } catch (error: any) {
          if (error.message !== "InvalidAccountId") {
            throw error;
          }
        }

        if (retrieved !== null) {
          return { userId: retrieved.user._id };
        }

        // Email address is guaranteed to be in the verified Apple identityToken
        const email_address = payload.email || (credentials.email as string);
        if (!email_address) {
          throw new Error("Email address is required for first-time sign-in");
        }



        // Check for full name in credentials (sent by client on first login)
        let full_name = credentials.fullName as string;
        if (!full_name) {
          const given_name = credentials.givenName as string;
          const family_name = credentials.familyName as string;
          if (given_name || family_name) {
            full_name = [given_name, family_name].filter(Boolean).join(" ");
          }
        }
        if (!full_name) {
          // Fallback to name from email address
          full_name = email_address.split("@")[0].replace(/[._-]/g, " ");
          full_name = full_name
            .split(" ")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
        }

        const username = (credentials.givenName as string) || email_address.split("@")[0];

        const avatars: Array<"chill" | "gay" | "relax" | "shy" | "swaga"> = [
          "chill",
          "gay",
          "relax",
          "shy",
          "swaga",
        ];
        const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];

        const created = await createAccount(ctx, {
          provider: "apple",
          account: { id: apple_user_id },
          profile: {
            email: email_address,
            fullname: full_name,
            username: username,
            plan: "free",
            avatar: randomAvatar,
          },
          shouldLinkViaEmail: true,
        });

        return { userId: created.user._id };
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
    async afterUserCreatedOrUpdated(ctx: MutationCtx, args) {
      const existing_free_grant = await ctx.db
        .query("snoops")
        .withIndex("by_user", (q) => q.eq("user_id", args.userId))
        .filter((q) => q.eq(q.field("type"), "free"))
        .first();

      if (!existing_free_grant) {
        await ctx.db.insert("snoops", {
          user_id: args.userId,
          snoops: 30,
          remaining: 30,
          type: "free",
          expiration_date: end_of_month_timestamp(),
        });
      }
    },
  },
});

import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { registerForPushNotificationsAsync } from "@/utils/reg_push_notifications";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCustomAlert } from "@/context/CustomAlertContext";
import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

const WelcomePage = () => {
  const { theme } = useTheme();
  const router = useRouter();

  const { showCustomAlert } = useCustomAlert();

  const { signIn } = useAuthActions();

  const storePushToken = useMutation(api.users.storePushToken);

  const [googleLoading, setGoogleLoading] = useState<boolean>(false);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      // 1. Create the return URL (must match your app.json scheme)
      const redirectTo = makeRedirectUri({
        scheme: "com.lawrencejr.snoopa",
        path: "/",
      });

      // 2. Start OAuth with Convex Auth, get redirect URL
      const { redirect } = await signIn("google", { redirectTo });
      if (!redirect) {
        throw new Error("Authentication redirect URL not found.");
      }

      // 3. Open browser session with dismissBrowser option
      // This prevents the redirect from creating a new screen
      const result = await WebBrowser.openAuthSessionAsync(
        redirect.toString(),
        redirectTo,
        {
          dismissButtonStyle: "close",
          showInRecents: false,
        },
      );

      if (result.type !== "success" || !result.url) {
        throw new Error("Authentication cancelled or failed.");
      }

      // 4. Extract ?code= from callback URL
      const code = new URL(result.url).searchParams.get("code");
      if (!code) {
        throw new Error("Authentication code not found in the URL.");
      }

      // 5. Complete sign‑in with the code
      const final = await signIn("google", { code });

      if (!final.signingIn) {
        throw new Error("Authentication failed. Please try again.");
      }

      const token = await registerForPushNotificationsAsync();
      if (token) {
        await storePushToken({ token });
      }
    } catch (error) {
      console.log("Sign-in error", error);
      setGoogleLoading(false);
      showCustomAlert("Sign-in failed. Please try again.", "danger");
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: Colors[theme].background }]}
    >
      <View style={styles.content}>
        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: Colors[theme].surface },
            ]}
          >
            <Image
              source={require("@/assets/images/splash-icon.png")}
              style={{ width: 100, height: 100, borderRadius: 50 }}
            />
          </View>
          <Text style={[styles.appName, { color: Colors[theme].text }]}>
            Snoopa
          </Text>
        </View>

        {/* Catchphrase */}
        <Text style={[styles.catchphrase, { color: Colors[theme].text }]}>
          Don't search,{"\n"}just snoop.
        </Text>

        {/* Action Button */}
        <View style={styles.actionContainer}>
          <Pressable
            disabled={googleLoading}
            style={[
              styles.googleButton,
              {
                backgroundColor: Colors[theme].text,
                opacity: googleLoading ? 0.6 : 1,
              },
            ]}
            onPress={handleGoogleLogin}
          >
            {googleLoading ? (
              <ActivityIndicator
                size={"large"}
                color={Colors[theme].text_secondary}
              />
            ) : (
              <>
                <Image
                  source={require("@/assets/icons/google.png")}
                  style={{ width: 24, height: 24 }}
                />
                <Text
                  style={[
                    styles.buttonText,
                    { color: Colors[theme].background },
                  ]}
                >
                  Continue with Google
                </Text>
              </>
            )}
          </Pressable>

          <Text
            style={[styles.legalText, { color: Colors[theme].text_secondary }]}
          >
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>

        {/* Branding Footer */}
        <View style={styles.footer}>
          <Text
            style={[styles.brandText, { color: Colors[theme].text_secondary }]}
          >
            By Lawjun
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default WelcomePage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 30,
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoContainer: {
    marginTop: 30,
    alignItems: "center",
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  appName: {
    fontFamily: "FontBold",
    fontSize: 32,
    letterSpacing: -1,
  },
  catchphrase: {
    fontFamily: "FontBold",
    fontSize: 42,
    textAlign: "center",
    lineHeight: 52,
    marginBottom: 40,
  },
  actionContainer: {
    width: "100%",
    alignItems: "center",
    gap: 20,
  },
  googleButton: {
    width: "100%",
    paddingVertical: 18,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  buttonText: {
    fontFamily: "FontBold",
    fontSize: 16,
  },
  legalText: {
    fontFamily: "FontRegular",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: "80%",
  },
  footer: {
    paddingBottom: 20,
  },
  brandText: {
    fontFamily: "FontMedium",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 2,
    opacity: 0.5,
  },
});

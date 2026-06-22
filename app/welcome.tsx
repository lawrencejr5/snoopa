WebBrowser.maybeCompleteAuthSession();
import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { registerForPushNotificationsAsync } from "@/utils/reg_push_notifications";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCustomAlert } from "@/context/CustomAlertContext";
import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvex, useMutation } from "convex/react";
import * as AppleAuthentication from "expo-apple-authentication";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

const WelcomePage = () => {
  const { theme } = useTheme();

  const { showCustomAlert } = useCustomAlert();

  const { signIn } = useAuthActions();

  const storePushToken = useMutation(api.users.storePushToken);

  const convex = useConvex();

  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
  const [appleLoading, setAppleLoading] = useState<boolean>(false);
  const [appleAvailable, setAppleAvailable] = useState<boolean>(false);

  // States for name collection modal (for hidden Apple emails)
  const [showNameModal, setShowNameModal] = useState<boolean>(false);
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [pendingAppleCredential, setPendingAppleCredential] =
    useState<any>(null);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  const decodeJwtPayload = (token: string): any => {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      const payload_b64url = parts[1];
      const base64 = payload_b64url.replace(/-/g, "+").replace(/_/g, "/");
      const padded_base64 = base64.padEnd(
        base64.length + ((4 - (base64.length % 4)) % 4),
        "=",
      );

      let json_str: string;
      if (typeof atob === "function") {
        json_str = atob(padded_base64);
      } else {
        const chars =
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        let buffer = "";
        const clean_str = padded_base64
          .replace(/=+$/, "")
          .replace(/[^A-Za-z0-9+/]/g, "");
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
        json_str = buffer;
      }
      return JSON.parse(json_str);
    } catch (e) {
      console.log("Error decoding JWT payload", e);
      return null;
    }
  };

  const submitAppleSignIn = async (
    credential: any,
    emailAddress: string,
    customFirstName?: string,
    customLastName?: string,
  ) => {
    const givenName =
      customFirstName || credential.fullName?.givenName || undefined;
    const familyName =
      customLastName || credential.fullName?.familyName || undefined;

    const appleArgs: Record<string, string> = {
      identityToken: credential.identityToken,
      user: credential.user,
      email: emailAddress,
    };
    if (givenName) {
      appleArgs.givenName = givenName;
    }
    if (familyName) {
      appleArgs.familyName = familyName;
    }

    const final = await signIn("apple", appleArgs);

    if (!final.signingIn) {
      throw new Error("Authentication failed. Please try again.");
    }

    const token = await registerForPushNotificationsAsync();
    if (token) {
      await storePushToken({ token });
    }
  };

  const completeAppleSignInWithName = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      showCustomAlert("Please enter both your first and last name.", "warning");
      return;
    }
    if (!pendingAppleCredential) return;

    setAppleLoading(true);
    setShowNameModal(false);
    try {
      await submitAppleSignIn(
        pendingAppleCredential.credential,
        pendingAppleCredential.emailAddress,
        firstName.trim(),
        lastName.trim(),
      );
    } catch (error: any) {
      console.log("Apple setup error", error);
      showCustomAlert("Setup failed. Please try again.", "danger");
    } finally {
      setAppleLoading(false);
      setPendingAppleCredential(null);
    }
  };

  const handleAppleLogin = async () => {
    setAppleLoading(true);
    try {
      if (Platform.OS !== "ios") {
        showCustomAlert("Fuck off you android user", "danger");
        return;
      }
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error("No identity token returned from Apple.");
      }

      let emailAddress = credential.email;
      if (!emailAddress) {
        const payload = decodeJwtPayload(credential.identityToken);
        if (payload && payload.email) {
          emailAddress = payload.email;
        }
      }

      if (!emailAddress) {
        throw new Error("Email address is required for authentication.");
      }

      const checkResult = await convex.query(api.users.check_apple_user, {
        apple_user_id: credential.user,
        email: emailAddress,
      });

      const isHiddenEmail =
        emailAddress.toLowerCase().endsWith("privaterelay.appleid.com") ||
        emailAddress.toLowerCase().includes("privately");

      if (!checkResult.exists && isHiddenEmail) {
        setPendingAppleCredential({
          credential,
          emailAddress,
        });
        setFirstName(credential.fullName?.givenName || "");
        setLastName(credential.fullName?.familyName || "");
        setShowNameModal(true);
        setAppleLoading(false);
        return;
      }

      await submitAppleSignIn(credential, emailAddress);
    } catch (error: any) {
      if (error?.code !== "ERR_REQUEST_CANCELED") {
        console.log("Apple Sign-in error", error);
        showCustomAlert(
          error?.message || "Apple Sign-in failed. Please try again.",
          "danger",
        );
      }
    } finally {
      setAppleLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      // 1. Create the return URL (must match your app.json scheme)
      const redirectTo = makeRedirectUri({
        scheme: "com.lawrencejr.snoopa",
        path: "/welcome",
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
              style={{ width: 120, height: 120, borderRadius: 50 }}
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

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <Pressable
            disabled={appleLoading || googleLoading}
            style={[
              styles.googleButton,
              {
                backgroundColor: !appleAvailable
                  ? Colors[theme].surface
                  : Colors[theme].text,
                borderWidth: !appleAvailable ? 2 : 0,
                borderColor: Colors[theme].border,
                opacity: googleLoading ? 0.7 : 1,
              },
            ]}
            onPress={handleAppleLogin}
          >
            {appleLoading ? (
              <ActivityIndicator
                size={"small"}
                color={
                  !appleAvailable
                    ? Colors[theme].text
                    : Colors[theme].background
                }
              />
            ) : (
              <>
                <Image
                  source={require("@/assets/icons/apple-logo.png")}
                  style={{
                    width: 25,
                    height: 25,
                    tintColor: !appleAvailable
                      ? Colors[theme].text
                      : Colors[theme].background,
                  }}
                />
                <Text
                  style={[
                    styles.buttonText,
                    {
                      color: !appleAvailable
                        ? Colors[theme].text
                        : Colors[theme].background,
                    },
                  ]}
                >
                  Continue with Apple
                </Text>
              </>
            )}
          </Pressable>

          <Pressable
            disabled={googleLoading || appleLoading}
            style={[
              styles.googleButton,
              {
                backgroundColor: appleAvailable
                  ? Colors[theme].surface
                  : Colors[theme].text,
                borderWidth: appleAvailable ? 2 : 0,
                borderColor: Colors[theme].border,
                opacity: googleLoading ? 0.7 : 1,
              },
            ]}
            onPress={handleGoogleLogin}
          >
            {googleLoading ? (
              <ActivityIndicator
                size={"small"}
                color={
                  appleAvailable ? Colors[theme].text : Colors[theme].background
                }
              />
            ) : (
              <>
                <Image
                  source={require("@/assets/icons/google.png")}
                  style={{ width: 22, height: 22 }}
                />
                <Text
                  style={[
                    styles.buttonText,
                    {
                      color: appleAvailable
                        ? Colors[theme].text
                        : Colors[theme].background,
                    },
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
            By continuing, you agree to our{" "}
            <Text
              style={styles.legalLink}
              onPress={() =>
                WebBrowser.openBrowserAsync("https://snoopa.lawjun.ng/terms")
              }
            >
              Terms & conditions
            </Text>{" "}
            and{" "}
            <Text
              style={styles.legalLink}
              onPress={() =>
                WebBrowser.openBrowserAsync("https://snoopa.lawjun.ng/privacy")
              }
            >
              Privacy Policy
            </Text>
            .
          </Text>
        </View>

        {/* Branding Footer */}
        <View>
          <Text
            style={[styles.brandText, { color: Colors[theme].text_secondary }]}
          >
            By Lawjun Labs
          </Text>
        </View>
      </View>

      <Modal
        visible={showNameModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowNameModal(false);
          setPendingAppleCredential(null);
        }}
      >
        <View style={styles.modalContainer}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: Colors[theme].surface,
                borderColor: Colors[theme].border,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: Colors[theme].text }]}>
              Almost there...
            </Text>
            <Text
              style={[
                styles.modalSubtitle,
                { color: Colors[theme].text_secondary },
              ]}
            >
              Since you chose to hide your email, let us know how we should
              address you.
            </Text>

            <Text
              style={[
                styles.inputLabel,
                { color: Colors[theme].text_secondary },
              ]}
            >
              FIRST NAME
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: Colors[theme].text,
                  backgroundColor: Colors[theme].background,
                  borderColor: Colors[theme].border,
                },
              ]}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Sherlock"
              placeholderTextColor={Colors[theme].text_secondary}
              autoCapitalize="words"
            />

            <Text
              style={[
                styles.inputLabel,
                { color: Colors[theme].text_secondary },
              ]}
            >
              LAST NAME
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: Colors[theme].text,
                  backgroundColor: Colors[theme].background,
                  borderColor: Colors[theme].border,
                },
              ]}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Holmes"
              placeholderTextColor={Colors[theme].text_secondary}
              autoCapitalize="words"
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={[
                  styles.modalButton,
                  { backgroundColor: Colors[theme].text },
                ]}
                onPress={completeAppleSignInWithName}
              >
                <Text
                  style={[
                    styles.modalButtonText,
                    { color: Colors[theme].background },
                  ]}
                >
                  Complete Setup
                </Text>
              </Pressable>

              <Pressable
                style={[styles.modalCancelButton]}
                onPress={() => {
                  setShowNameModal(false);
                  setPendingAppleCredential(null);
                }}
              >
                <Text
                  style={[
                    styles.modalCancelButtonText,
                    { color: Colors[theme].text_secondary },
                  ]}
                >
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    width: 140,
    height: 140,
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
    paddingVertical: 12,
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
  legalLink: {
    fontFamily: "FontBold",
    textDecorationLine: "underline",
  },
  brandText: {
    fontFamily: "FontMedium",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 2,
    opacity: 0.5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(20, 20, 20, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontFamily: "FontBold",
    fontSize: 24,
    marginBottom: 8,
    textAlign: "center",
  },
  modalSubtitle: {
    fontFamily: "FontRegular",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 24,
  },
  inputLabel: {
    fontFamily: "FontBold",
    fontSize: 11,
    letterSpacing: 1,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: "FontMedium",
    marginBottom: 16,
  },
  modalButtons: {
    width: "100%",
    marginTop: 8,
    gap: 12,
  },
  modalButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonText: {
    fontFamily: "FontBold",
    fontSize: 16,
  },
  modalCancelButton: {
    width: "100%",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelButtonText: {
    fontFamily: "FontBold",
    fontSize: 14,
  },
});

import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const WelcomePage = () => {
  const { theme } = useTheme();
  const router = useRouter();

  const handleGoogleLogin = () => {
    router.replace("/(tabs)");
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
            style={[
              styles.googleButton,
              { backgroundColor: Colors[theme].text },
            ]}
            onPress={handleGoogleLogin}
          >
            <Image
              source={require("@/assets/icons/google.png")}
              style={{ width: 24, height: 24 }}
            />
            <Text
              style={[styles.buttonText, { color: Colors[theme].background }]}
            >
              Continue with Google
            </Text>
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

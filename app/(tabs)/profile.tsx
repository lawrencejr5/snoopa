import Container from "@/components/Container";
import Loading from "@/components/Loading";
import TopUpModal from "@/components/TopUpModal";
import Colors from "@/constants/Colors";
import { useCustomAlert } from "@/context/CustomAlertContext";
import { useLoadingContext } from "@/context/LoadingContext";
import { useTheme } from "@/context/ThemeContext";
import { useUser } from "@/context/UserContext";
import { api } from "@/convex/_generated/api";
import { registerForPushNotificationsAsync } from "@/utils/reg_push_notifications";
import { useAuthActions } from "@convex-dev/auth/react";
import { useNavigation } from "@react-navigation/native";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

export default function ProfileScreen() {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  const { signedIn } = useUser();

  const { isLoading } = useConvexAuth();
  const { appLoading } = useLoadingContext();

  const { showCustomAlert } = useCustomAlert();

  const { signOut } = useAuthActions();

  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);

  // Snoop balance
  const snoop_balance = useQuery(api.snoops.get_snoop_balance) ?? 0;
  const snoop_grants = useQuery(api.snoops.get_snoop_grants) ?? [];
  const primary_grant = (snoop_grants as any[]).find(
    (g) => g.type === "free" || g.type === "monthly",
  );
  const snoop_total = primary_grant ? primary_grant.snoops : 30;
  const snoops_used = snoop_total - snoop_balance;
  const snoop_pct = snoop_total > 0 ? snoops_used / snoop_total : 0;
  const is_low = snoop_balance <= snoop_total * 0.3;

  const menuItems = [
    {
      label: "Profile",
      icon: require("@/assets/icons/profile.png"),
      route: "/account/profile",
    },
    {
      label: "Billing",
      icon: require("@/assets/icons/card.png"),
      route: "/account/billing",
    },
    {
      label: "Report & Feedback",
      icon: require("@/assets/icons/feedback.png"),
      route: "/account/feedback",
    },
    {
      label: "Theme",
      icon: require("@/assets/icons/moon.png"),
      route: "modal",
    },
    {
      label: "About Snoopa",
      icon: require("@/assets/icons/info.png"),
      route: "https://snoopa.lawjun.ng",
    },
    {
      label: "Terms and Conditions",
      icon: require("@/assets/icons/document.png"),
      route: "https://snoopa.lawjun.ng/terms",
    },
    {
      label: "Privacy Policy",
      icon: require("@/assets/icons/shield.png"),
      route: "https://snoopa.lawjun.ng/privacy",
    },
  ];

  const handlePress = (item: any) => {
    if (item.route === "modal") {
      setThemeModalVisible(true);
    } else if (item.route.startsWith("http")) {
      WebBrowser.openBrowserAsync(item.route);
    } else {
      router.push(item.route);
    }
  };

  const [signingOut, setSigningOut] = useState<boolean>(false);
  const remove_push_token = useMutation(api.users.removePushToken);

  const handleSignout = async () => {
    setSigningOut(true);
    try {
      // Removing push token
      try {
        const token = await registerForPushNotificationsAsync();
        if (token) await remove_push_token({ token });
      } catch (e) {
        console.warn("Could not remove token from server", e);
      }

      await signOut();
    } catch (err) {
      console.log(err);
      showCustomAlert("An error occured!", "danger");
    } finally {
      setSigningOut(false);
    }
  };

  const navigation = useNavigation();
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    const unsubscribe = navigation.addListener("tabPress" as any, (e: any) => {
      setAnimationKey((prev) => prev + 1);
    });
    return unsubscribe;
  }, [navigation]);

  if (isLoading || !signedIn || appLoading) return <Loading />;

  return (
    <Container>
      {/* Header */}
      <Animated.View
        key={`profile-header-${animationKey}`}
        entering={FadeInDown.duration(400)}
        style={styles.header}
      >
        <Text style={[styles.headerTitle, { color: Colors[theme].text }]}>
          Profile
        </Text>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 50 }}
      >
        {/* User & Snoop Card */}
        <Animated.View
          key={`profile-user-snoop-${animationKey}`}
          entering={FadeInDown.delay(100).duration(400)}
          style={[
            styles.userSnoopCard,
            {
              backgroundColor: Colors[theme].surface,
              borderColor: Colors[theme].border,
            },
          ]}
        >
          {/* User Details & Plan Row */}
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={[styles.userName, { color: Colors[theme].text }]}>
                {signedIn?.fullname}
              </Text>
              <Text
                style={[
                  styles.userEmail,
                  { color: Colors[theme].text_secondary, marginBottom: 0 },
                ]}
              >
                {signedIn?.email}
              </Text>
            </View>
            <View
              style={[
                styles.planBadge,
                { backgroundColor: Colors[theme].text_secondary + "15" },
              ]}
            >
              <Text
                style={[
                  styles.planText,
                  { color: Colors[theme].text, textTransform: "capitalize" },
                ]}
              >
                {signedIn?.plan} Plan
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View
            style={{
              height: 1,
              backgroundColor: Colors[theme].border,
              marginVertical: 16,
            }}
          />

          {/* Snoop Progress Header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <View>
              <Text
                style={{
                  color: Colors[theme].text,
                  fontFamily: "FontBold",
                  fontSize: 14,
                  letterSpacing: -0.3,
                }}
              >
                Snoop Balance
              </Text>
              <Text
                style={{
                  color: Colors[theme].text_secondary,
                  fontFamily: "FontMedium",
                  fontSize: 11,
                  marginTop: 2,
                }}
              >
                {snoops_used} of {snoop_total} used
              </Text>
            </View>
            <Pressable
              onPress={() => setShowTopUp(true)}
              style={[
                styles.topUpBtn,
                {
                  backgroundColor: Colors[theme].primary,
                  borderColor: Colors[theme].primary + "40",
                },
              ]}
            >
              <Text
                style={{
                  color: Colors[theme].background,
                  fontFamily: "FontBold",
                  fontSize: 11,
                  letterSpacing: 0.5,
                }}
              >
                TOP UP
              </Text>
            </Pressable>
          </View>

          {/* Progress track */}
          <View
            style={{
              height: 6,
              borderRadius: 3,
              backgroundColor: Colors[theme].border,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${snoop_pct * 100}%`,
                height: 6,
                borderRadius: 3,
                backgroundColor: Colors[theme].text_secondary,
              }}
            />
          </View>

          {/* Low warning */}
          {snoop_pct >= 0.75 && (
            <Text
              style={{
                color: snoop_pct >= 1.0 ? Colors[theme].danger : Colors[theme].warning,
                fontFamily: "FontMedium",
                fontSize: 11,
                marginTop: 8,
              }}
            >
              {snoop_pct >= 1.0
                ? "Snoops exhausted — top up or upgrade to resume snooping 🐾"
                : "Running low — top up or upgrade to keep tracking 🐾"}
            </Text>
          )}
        </Animated.View>

        {/* Upgrade Card */}
        {signedIn?.is_premium !== true && (
          <Animated.View
            key={`profile-upgrade-${animationKey}`}
            entering={FadeInDown.delay(200).duration(400)}
            style={[
              styles.upgradeCard,
              {
                backgroundColor: "transparent",
                borderWidth: 1,
                borderRadius: 20,
                borderColor: Colors[theme].border,
              },
            ]}
          >
            <Text style={[styles.upgradeTitle, { color: Colors[theme].text }]}>
              Want more from Snoopa?
            </Text>
            <Text
              style={[styles.upgradeDescription, { color: Colors[theme].text }]}
            >
              Unlock unlimited tracking, deeper insights, and faster updates with
              Pro.
            </Text>
            <Pressable
              style={[
                styles.upgradeButton,
                {
                  backgroundColor: Colors[theme].text,
                  borderWidth: 1,
                  borderColor: Colors[theme].border,
                },
              ]}
              onPress={() => router.push("/account/billing")}
            >
              <Text
                style={[
                  styles.upgradeButtonText,
                  { color: Colors[theme].background },
                ]}
              >
                Upgrade to Pro
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Settings List */}
        <Animated.View
          key={`profile-menu-${animationKey}`}
          entering={FadeInDown.delay(300).duration(400)}
          style={styles.menuContainer}
        >
          {menuItems.map((item, index) => (
            <Pressable
              key={index}
              style={[
                styles.menuItem,
                { borderBottomColor: Colors[theme].border },
              ]}
              onPress={() => handlePress(item)}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 15 }}
              >
                <Image
                  source={item.icon}
                  style={{
                    width: 22,
                    height: 22,
                    tintColor: Colors[theme].text,
                  }}
                />
                <Text style={[styles.menuText, { color: Colors[theme].text }]}>
                  {item.label}
                </Text>
              </View>
              <Image
                source={
                  item.route.startsWith("http")
                    ? require("@/assets/icons/arrow-up.png")
                    : require("@/assets/icons/chevron-right.png")
                }
                style={[
                  {
                    width: 14,
                    height: 14,
                    tintColor: Colors[theme].text_secondary,
                  },
                  item.route.startsWith("http") && {
                    width: 20,
                    height: 20,
                    transform: [{ rotate: "45deg" }],
                  },
                ]}
              />
            </Pressable>
          ))}

          {/* Logout */}
          <Pressable
            onPress={handleSignout}
            disabled={signingOut}
            style={[
              styles.menuItem,
              {
                borderBottomWidth: 0,
                marginTop: 10,
                opacity: signingOut ? 0.5 : 1,
              },
            ]}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 15 }}
            >
              {signingOut ? (
                <ActivityIndicator
                  size={"small"}
                  color={Colors[theme].danger}
                />
              ) : (
                <Image
                  source={require("@/assets/icons/logout.png")}
                  style={{
                    width: 22,
                    height: 22,
                    tintColor: Colors[theme].danger,
                  }}
                />
              )}

              <Text style={[styles.menuText, { color: Colors[theme].danger }]}>
                Log Out
              </Text>
            </View>
          </Pressable>
        </Animated.View>
      </ScrollView>

      <TopUpModal visible={showTopUp} onClose={() => setShowTopUp(false)} />

      {/* Theme Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={themeModalVisible}
        onRequestClose={() => setThemeModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setThemeModalVisible(false)}
        >
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: Colors[theme].card,
                borderColor: Colors[theme].border,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: Colors[theme].text }]}>
              Select Theme
            </Text>

            {["System Default", "Light", "Dark"].map((mode) => (
              <Pressable
                key={mode}
                style={[
                  styles.themeOption,
                  { borderBottomColor: Colors[theme].border },
                ]}
                onPress={() => {
                  setThemeModalVisible(false);
                }}
              >
                <Text
                  style={{
                    fontFamily: "FontMedium",
                    fontSize: 16,
                    color: Colors[theme].text,
                  }}
                >
                  {mode}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </Container>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: "FontBold",
    letterSpacing: -1,
  },
  userSnoopCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 10,
    marginBottom: 20,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  userName: {
    fontSize: 18,
    fontFamily: "FontBold",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: "FontMedium",
    marginBottom: 8,
  },
  planBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  planText: {
    fontSize: 12,
    fontFamily: "FontBold",
  },
  topUpBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  upgradeCard: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 30,
  },
  upgradeTitle: {
    fontSize: 18,
    fontFamily: "FontBold",
    marginBottom: 5,
  },
  upgradeDescription: {
    fontSize: 14,
    fontFamily: "FontMedium",
    opacity: 0.8,
    marginBottom: 20,
    lineHeight: 20,
  },
  upgradeButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  upgradeButtonText: {
    fontFamily: "FontBold",
    fontSize: 14,
  },
  menuContainer: {
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  menuText: {
    fontSize: 16,
    fontFamily: "GeistMedium",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "80%",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "FontBold",
    marginBottom: 15,
  },
  themeOption: {
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
});

import Container from "@/components/Container";
import Loading from "@/components/Loading";
import Colors from "@/constants/Colors";
import { useCustomAlert } from "@/context/CustomAlertContext";
import { useLoadingContext } from "@/context/LoadingContext";
import { useTheme } from "@/context/ThemeContext";
import { useUser } from "@/context/UserContext";
import { api } from "@/convex/_generated/api";
import { registerForPushNotificationsAsync } from "@/utils/reg_push_notifications";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
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

export default function AccountScreen() {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  const { signedIn } = useUser();

  const { isLoading } = useConvexAuth();
  const { appLoading } = useLoadingContext();

  const { showCustomAlert } = useCustomAlert();

  const { signOut } = useAuthActions();

  const [themeModalVisible, setThemeModalVisible] = useState(false);

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
      route: "/account/about",
    },
    {
      label: "Terms and Conditions",
      icon: require("@/assets/icons/document.png"),
      route: "/account/terms",
    },
    {
      label: "Privacy Policy",
      icon: require("@/assets/icons/shield.png"),
      route: "/account/privacy",
    },
  ];

  const handlePress = (item: any) => {
    if (item.route === "modal") {
      setThemeModalVisible(true);
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

  if (isLoading || !signedIn || appLoading) return <Loading />;

  return (
    <Container>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Image
            source={require("@/assets/icons/arrow-up.png")}
            style={[
              styles.backIcon,
              { tintColor: Colors[theme].text, width: 30, height: 30 },
            ]}
          />
        </Pressable>
        <Text style={[styles.headerTitle, { color: Colors[theme].text }]}>
          Settings
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 50 }}
      >
        {/* User Card */}
        <View
          style={[
            styles.userCard,
            {
              backgroundColor: Colors[theme].surface,
              borderColor: Colors[theme].border,
            },
          ]}
        >
          <View>
            <Text style={[styles.userName, { color: Colors[theme].text }]}>
              {signedIn?.fullname}
            </Text>
            <Text
              style={[
                styles.userEmail,
                { color: Colors[theme].text_secondary },
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

        {/* Upgrade Card */}
        <View
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
        </View>

        {/* Settings List */}
        <View style={styles.menuContainer}>
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
                source={require("@/assets/icons/chevron-right.png")}
                style={{
                  width: 14,
                  height: 14,
                  tintColor: Colors[theme].text_secondary,
                }}
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
        </View>
      </ScrollView>

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
                {/* Selected Indicator could go here */}
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
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginBottom: 10,
  },
  backButton: {
    padding: 5,
    paddingLeft: 0,
    borderRadius: 20,
  },
  backIcon: {
    width: 24,
    height: 24,
    transform: [{ rotate: "-90deg" }],
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "FontBold",
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 20,
    marginBottom: 20,
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

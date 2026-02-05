import Container from "@/components/Container";
import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function AccountScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  const menuItems = [
    { label: "Profile", icon: require("@/assets/icons/profile.png") },
    { label: "Billing", icon: require("@/assets/icons/card.png") }, // Placeholder for billing/subs
    {
      label: "Report & Feedback",
      icon: require("@/assets/icons/feedback.png"),
    },
    { label: "Theme", icon: require("@/assets/icons/moon.png") },
    { label: "About Snoopa", icon: require("@/assets/icons/info.png") },
    {
      label: "Terms and Conditions",
      icon: require("@/assets/icons/document.png"),
    },
    { label: "Privacy Policy", icon: require("@/assets/icons/shield.png") },
  ];

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
              John Doe
            </Text>
            <Text
              style={[
                styles.userEmail,
                { color: Colors[theme].text_secondary },
              ]}
            >
              john.doe@example.com
            </Text>
          </View>
          <View
            style={[
              styles.planBadge,
              { backgroundColor: Colors[theme].text_secondary + "15" },
            ]}
          >
            <Text style={[styles.planText, { color: Colors[theme].text }]}>
              Free Plan
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
            style={[styles.menuItem, { borderBottomWidth: 0, marginTop: 10 }]}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 15 }}
            >
              <Image
                source={require("@/assets/icons/logout.png")}
                style={{
                  width: 22,
                  height: 22,
                  tintColor: Colors[theme].danger,
                }}
              />
              <Text style={[styles.menuText, { color: Colors[theme].danger }]}>
                Log Out
              </Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </Container>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingVertical: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  avatar: {
    width: 30,
    height: 30,
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
});

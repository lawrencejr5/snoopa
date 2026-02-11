import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { useUser } from "@/context/UserContext";
import { chatSessions } from "@/dummy_data/sessions";

import { DrawerContentComponentProps } from "@react-navigation/drawer";
import { useRouter } from "expo-router";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export const SideMenu = (props: DrawerContentComponentProps) => {
  const { theme } = useTheme();
  const router = useRouter();

  const { signedIn } = useUser();

  return (
    <View
      style={[
        styles.drawerContainer,
        { backgroundColor: Colors[theme].background },
      ]}
    >
      {/* Logo Section */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          marginBottom: 35,
          marginTop: 10,
        }}
      >
        <Text
          style={{
            fontFamily: "FontBold",
            fontSize: 22,
            color: Colors[theme].text,
            letterSpacing: -0.5,
          }}
        >
          Snoopa
        </Text>
      </View>

      {/* Header / New Chat */}
      <View style={{ marginBottom: 25 }}>
        <Pressable
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingVertical: 12,
          }}
          onPress={() => {}}
        >
          <Image
            source={require("@/assets/icons/ai-assistant.png")}
            style={{ width: 22, height: 22, tintColor: Colors[theme].text }}
          />
          <Text
            style={{
              fontFamily: "FontBold",
              fontSize: 16,
              color: Colors[theme].text,
            }}
          >
            New Chat
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/watchlist" as any)}
          style={[
            styles.menuItem,
            {
              marginBottom: 15,
              paddingHorizontal: 0,
            },
          ]}
        >
          <Image
            source={require("@/assets/icons/eyes.png")}
            style={{
              width: 20,
              height: 20,
              tintColor: Colors[theme].primary,
              marginRight: 12,
            }}
          />
          <Text
            style={{
              fontFamily: "FontBold",
              fontSize: 15,
              color: Colors[theme].text,
            }}
          >
            My Watchlist
          </Text>
        </Pressable>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Watchlist Link */}

        {/* Recent Sessions */}
        <View style={{ marginBottom: 30 }}>
          <Text
            style={[styles.menuHeader, { color: Colors[theme].text_secondary }]}
          >
            RECENT SESSIONS
          </Text>
          {chatSessions.map((session) => (
            <Pressable
              key={session.id}
              style={[
                styles.menuItem,
                {
                  backgroundColor: session.active
                    ? Colors[theme].surface
                    : "transparent",
                },
              ]}
            >
              <Image
                source={require("@/assets/icons/clock-thick.png")}
                style={{
                  width: 16,
                  height: 16,
                  tintColor: session.active
                    ? Colors[theme].primary
                    : Colors[theme].text_secondary,
                  marginRight: 10,
                }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    fontFamily: session.active ? "FontBold" : "FontMedium",
                    fontSize: 14,
                    color: Colors[theme].text,
                  }}
                >
                  {session.title}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    fontFamily: "FontRegular",
                    fontSize: 12,
                    color: Colors[theme].text_secondary,
                  }}
                >
                  {session.excerpt}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      {/* Footer */}
      <View
        style={{
          paddingTop: 20,
          borderTopWidth: 1,
          borderTopColor: Colors[theme].border,
        }}
      >
        <Pressable
          onPress={() => router.push("/account" as any)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View>
            <Text
              style={{
                fontFamily: "FontBold",
                fontSize: 14,
                color: Colors[theme].text,
              }}
            >
              {signedIn?.fullname}
            </Text>
            <Text
              style={{
                fontFamily: "FontRegular",
                fontSize: 12,
                color: Colors[theme].text_secondary,
                textTransform: "capitalize",
              }}
            >
              {signedIn?.plan} Plan
            </Text>
          </View>
          <Image
            source={require("@/assets/icons/settings.png")}
            style={{ width: 20, height: 20, tintColor: Colors[theme].text }}
          />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  menuHeader: {
    fontSize: 12,
    fontFamily: "FontBold",
    marginBottom: 15,
    letterSpacing: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 5,
  },
});

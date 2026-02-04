import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { chatSessions } from "@/dummy_data/sessions";
import { watchlistData } from "@/dummy_data/watchlist";
import { DrawerContentComponentProps } from "@react-navigation/drawer";
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
  const activeSnoops = watchlistData.filter((i) => i.status === "active");

  return (
    <View
      style={[
        styles.drawerContainer,
        { backgroundColor: Colors[theme].background },
      ]}
    >
      {/* Header / New Chat */}
      <View style={{ marginBottom: 30, marginTop: 10 }}>
        <Pressable
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            backgroundColor: Colors[theme].surface,
            padding: 12,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: Colors[theme].border,
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
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
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
                source={require("@/assets/icons/voice.png")}
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

        {/* Watchlist Quick View */}
        <View>
          <Text
            style={[styles.menuHeader, { color: Colors[theme].text_secondary }]}
          >
            ACTIVE SNOOPS
          </Text>
          {activeSnoops.length > 0 ? (
            activeSnoops.map((snoop) => (
              <Pressable key={snoop.id} style={styles.menuItem}>
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: Colors[theme].success,
                    marginRight: 12,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: "FontMedium",
                      fontSize: 14,
                      color: Colors[theme].text,
                    }}
                  >
                    {snoop.title}
                  </Text>
                </View>
              </Pressable>
            ))
          ) : (
            <Text
              style={{
                fontFamily: "FontRegular",
                color: Colors[theme].text_secondary,
                fontSize: 13,
                fontStyle: "italic",
              }}
            >
              No active snoops.
            </Text>
          )}
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
          style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
        >
          <Image
            source={require("@/assets/images/avatar.png")}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: Colors[theme].surface,
            }} // Placeholder avatar
          />
          <View>
            <Text
              style={{
                fontFamily: "FontBold",
                fontSize: 14,
                color: Colors[theme].text,
              }}
            >
              User Account
            </Text>
            <Text
              style={{
                fontFamily: "FontRegular",
                fontSize: 12,
                color: Colors[theme].text_secondary,
              }}
            >
              Free Plan
            </Text>
          </View>
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

import Container from "@/components/Container";
import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  const notifications = useQuery(api.notifications.get_notifications);
  const markAllRead = useMutation(api.notifications.mark_all_read);

  // Mark all as read when the screen opens
  useEffect(() => {
    markAllRead();
  }, []);

  const isLoading = notifications === undefined;

  const handleNotificationPress = (item: {
    watchlist_id?: Id<"watchlist">;
  }) => {
    if (item.watchlist_id) {
      router.push({
        pathname: "/snoop/[id]",
        params: { id: item.watchlist_id },
      });
    }
  };

  return (
    <Container>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Image
            source={require("@/assets/icons/arrow-up.png")}
            style={{
              width: 30,
              height: 30,
              tintColor: Colors[theme].text,
              transform: [{ rotate: "-90deg" }],
            }}
          />
        </Pressable>
        <Text style={[styles.headerTitle, { color: Colors[theme].text }]}>
          Notifications
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && (
          <View style={{ marginTop: 80, alignItems: "center" }}>
            <ActivityIndicator color={Colors[theme].primary} />
          </View>
        )}

        {!isLoading &&
          notifications.map((item) => (
            <Pressable
              key={item._id}
              onPress={() => handleNotificationPress(item)}
              style={({ pressed }) => [
                styles.notificationItem,
                {
                  backgroundColor: item.read
                    ? "transparent"
                    : Colors[theme].surface,
                  borderColor: Colors[theme].border,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <View style={styles.notificationHeader}>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  {/* Unread dot */}
                  {!item.read && (
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: "#FF3B30",
                      }}
                    />
                  )}
                  <View
                    style={[
                      styles.typeIndicator,
                      {
                        backgroundColor:
                          item.type === "alert"
                            ? Colors[theme].success
                            : item.type === "system"
                              ? Colors[theme].warning
                              : Colors[theme].text_secondary,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.typeText,
                      { color: Colors[theme].text_secondary },
                    ]}
                  >
                    {item.type.toUpperCase()}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.timestamp,
                    { color: Colors[theme].text_secondary },
                  ]}
                >
                  {timeAgo(item._creationTime)}
                </Text>
              </View>

              <Text style={[styles.title, { color: Colors[theme].text }]}>
                {item.title}
              </Text>
              <Text style={[styles.message, { color: Colors[theme].text }]}>
                {item.message}
              </Text>

              {item.watchlist_id && (
                <Text
                  style={{
                    marginTop: 10,
                    fontSize: 12,
                    fontFamily: "FontMedium",
                    color: Colors[theme].primary,
                  }}
                >
                  Tap to view snoop →
                </Text>
              )}
            </Pressable>
          ))}

        {!isLoading && notifications.length === 0 && (
          <View style={{ marginTop: 100, alignItems: "center", opacity: 0.5 }}>
            <Image
              source={require("@/assets/icons/bells.png")}
              style={{
                width: 40,
                height: 40,
                tintColor: Colors[theme].text,
                marginBottom: 15,
              }}
            />
            <Text
              style={{
                fontFamily: "FontMedium",
                color: Colors[theme].text,
                fontSize: 16,
              }}
            >
              All caught up
            </Text>
          </View>
        )}
      </ScrollView>
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
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "FontBold",
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  notificationItem: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
  },
  notificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  typeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  typeText: {
    fontSize: 11,
    fontFamily: "FontBold",
    letterSpacing: 1,
  },
  timestamp: {
    fontSize: 12,
    fontFamily: "FontRegular",
  },
  title: {
    fontSize: 16,
    fontFamily: "FontBold",
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14,
    fontFamily: "FontRegular",
    lineHeight: 22,
    opacity: 0.8,
  },
});

import Container from "@/components/Container";
import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function SnoopDetailsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams();

  // Fetch watchlist item and logs from backend
  const snoop = useQuery(
    api.watchlist.get_watchlist_item,
    id ? { watchlist_id: id as Id<"watchlist"> } : "skip",
  );

  const logs = useQuery(
    api.watchlist.get_watchlist_logs,
    id ? { watchlist_id: id as Id<"watchlist"> } : "skip",
  );

  if (!snoop) {
    return (
      <Container>
        <Text
          style={{
            color: Colors[theme].text,
            marginTop: 50,
            textAlign: "center",
          }}
        >
          Snoop not found.
        </Text>
      </Container>
    );
  }

  return (
    <Container>
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
        {/* <Text style={[styles.headerTitle, { color: Colors[theme].text }]}>Details</Text> */}
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Content */}
        <View style={styles.contentContainer}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: Colors[theme].primary + "20" },
            ]}
          >
            <View
              style={[
                styles.pulsingDot,
                { backgroundColor: Colors[theme].primary },
              ]}
            />
            <Text style={[styles.statusText, { color: Colors[theme].primary }]}>
              CURRENTLY TRACKING
            </Text>
          </View>

          <Text style={[styles.title, { color: Colors[theme].text }]}>
            {snoop.title}
          </Text>

          <Text
            style={[
              styles.description,
              { color: Colors[theme].text_secondary },
            ]}
          >
            {snoop.condition}
          </Text>

          {/* Keywords */}
          {snoop.keywords && snoop.keywords.length > 0 && (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 6,
                marginTop: 14,
              }}
            >
              {snoop.keywords.map((kw, i) => (
                <View
                  key={i}
                  style={{
                    backgroundColor: Colors[theme].primary + "20",
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                  }}
                >
                  <Text
                    style={{
                      color: Colors[theme].primary,
                      fontFamily: "FontMedium",
                      fontSize: 12,
                    }}
                  >
                    {kw}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 15,
              gap: 8,
            }}
          >
            <Image
              source={require("@/assets/icons/eyes.png")}
              style={{
                width: 16,
                height: 16,
                tintColor: Colors[theme].text_secondary,
              }}
            />
            <Text
              style={{
                fontFamily: "FontMedium",
                fontSize: 13,
                color: Colors[theme].text_secondary,
              }}
            >
              Sources: {snoop.sources.length > 0 ? snoop.sources[0] : "None"}
            </Text>
          </View>
        </View>

        {/* Scent Log */}
        <View style={styles.logSection}>
          <Text
            style={[
              styles.sectionTitle,
              { color: Colors[theme].text_secondary },
            ]}
          >
            SCENT LOG
          </Text>

          <View
            style={[
              styles.logContainer,
              {
                backgroundColor: Colors[theme].surface,
                borderColor: Colors[theme].border,
              },
            ]}
          >
            {logs && logs.length > 0 ? (
              logs.map((log, index) => (
                <View
                  key={log._id}
                  style={[
                    styles.logItem,
                    index !== logs.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: Colors[theme].border + "50",
                    },
                  ]}
                >
                  <View style={{ width: 50 }}>
                    <Text
                      style={[
                        styles.logTime,
                        { color: Colors[theme].text_secondary },
                      ]}
                    >
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.logAction, { color: Colors[theme].text }]}
                    >
                      {log.action}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 4,
                      }}
                    >
                      <View
                        style={[
                          styles.verificationDot,
                          {
                            backgroundColor: log.verified
                              ? Colors[theme].success
                              : Colors[theme].warning,
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.verificationText,
                          { color: Colors[theme].text_secondary },
                        ]}
                      >
                        {log.verified
                          ? `Verified (${log.outcome})`
                          : "Unverified"}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={{ padding: 20, alignItems: "center" }}>
                <Text
                  style={{
                    fontFamily: "FontRegular",
                    color: Colors[theme].text_secondary,
                    fontStyle: "italic",
                  }}
                >
                  No activity logged yet.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Footer Action */}
      <View
        style={[
          styles.footer,
          {
            borderTopColor: Colors[theme].border,
            backgroundColor: Colors[theme].background,
          },
        ]}
      >
        <Pressable
          style={[
            styles.stopButton,
            {
              backgroundColor: Colors[theme].surface,
              borderColor: Colors[theme].danger,
            },
          ]}
        >
          <Text
            style={[styles.stopButtonText, { color: Colors[theme].danger }]}
          >
            Stop Tracking
          </Text>
        </Pressable>
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: {
    paddingRight: 8,
    paddingVertical: 5,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "FontBold",
  },
  contentContainer: {
    marginTop: 10,
    marginBottom: 40,
  },
  statusBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 15,
    gap: 6,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "FontBold",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 28,
    fontFamily: "FontBold",
    marginBottom: 15,
    letterSpacing: -1,
    lineHeight: 34,
  },
  description: {
    fontSize: 16,
    fontFamily: "FontRegular",
    lineHeight: 24,
    opacity: 0.9,
  },
  logSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "FontBold",
    letterSpacing: 1,
    marginBottom: 15,
    textTransform: "uppercase",
  },
  logContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  logItem: {
    flexDirection: "row",
    padding: 15,
  },
  logTime: {
    fontSize: 13,
    fontFamily: "FontMedium",
    opacity: 0.7,
  },
  logAction: {
    fontSize: 14,
    fontFamily: "FontMedium",
    lineHeight: 20,
  },
  verificationDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  verificationText: {
    fontSize: 11,
    fontFamily: "FontRegular",
  },
  footer: {
    position: "absolute",
    bottom: 15,
    left: 0,
    right: 0,
    padding: 30,
    borderTopWidth: 1,
  },
  stopButton: {
    width: "100%",
    paddingVertical: 10,
    borderRadius: 15,
    alignItems: "center",
    borderWidth: 1,
  },
  stopButtonText: {
    fontFamily: "FontBold",
    fontSize: 16,
    letterSpacing: 0.5,
  },
});

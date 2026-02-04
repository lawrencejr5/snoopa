import Container from "@/components/Container";
import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { watchlistData } from "@/dummy_data/watchlist";
import { useEffect } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
};

const PulsingDot = ({ color }: { color: string }) => {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.ease }),
        withTiming(0.4, { duration: 1000, easing: Easing.ease }),
      ),
      -1,
      true,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: color,
          marginRight: 6,
        },
        animatedStyle,
      ]}
    />
  );
};

export default function WatchlistScreen() {
  const { theme } = useTheme();
  const activeSnoops = watchlistData.filter((i) => i.status === "active");
  const closedSnoops = watchlistData.filter((i) => i.status === "completed");

  return (
    <Container>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: Colors[theme].text }]}>
          Watchlist
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: Colors[theme].danger + "15",
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
            gap: 4,
          }}
        >
          <PulsingDot color={Colors[theme].danger} />
          <Text
            style={{
              color: Colors[theme].danger,
              fontSize: 10,
              fontFamily: "FontBold",
              letterSpacing: 1,
            }}
          >
            LIVE
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: Colors[theme].card,
                borderColor: Colors[theme].border,
              },
            ]}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <PulsingDot color={Colors[theme].success} />
              <Text style={[styles.statNumber, { color: Colors[theme].text }]}>
                {activeSnoops.length}
              </Text>
            </View>
            <Text
              style={[
                styles.statLabel,
                { color: Colors[theme].text_secondary },
              ]}
            >
              Active Snoops
            </Text>
          </View>
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: Colors[theme].card,
                borderColor: Colors[theme].border,
              },
            ]}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Text style={[styles.statNumber, { color: Colors[theme].text }]}>
                {watchlistData.length}
              </Text>
            </View>
            <Text
              style={[
                styles.statLabel,
                { color: Colors[theme].text_secondary },
              ]}
            >
              Total Tracked
            </Text>
          </View>
        </View>

        {/* Active Snoops */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: Colors[theme].text }]}>
            Active Snoops
          </Text>
          {activeSnoops.map((item) => (
            <View
              key={item.id}
              style={[
                styles.card,
                {
                  backgroundColor: Colors[theme].surface,
                  borderColor: Colors[theme].border,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: Colors[theme].text }]}>
                  {item.title}
                </Text>
                <View style={styles.statusBadge}>
                  <PulsingDot color={Colors[theme].success} />
                  <Text
                    style={{
                      color: Colors[theme].success,
                      fontSize: 11,
                      fontFamily: "FontBold",
                    }}
                  >
                    WATCHING
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  styles.cardDescription,
                  { color: Colors[theme].text_secondary },
                ]}
                numberOfLines={2}
              >
                {item.description}
              </Text>

              <View
                style={[
                  styles.cardFooter,
                  { borderTopColor: Colors[theme].border },
                ]}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Image
                    source={require("@/assets/icons/clock.png")}
                    style={{
                      width: 14,
                      height: 14,
                      tintColor: Colors[theme].text_secondary,
                      marginRight: 6,
                    }}
                  />
                  <Text
                    style={{
                      color: Colors[theme].text_secondary,
                      fontFamily: "FontMedium",
                      fontSize: 13,
                    }}
                  >
                    Checked {formatTimeAgo(item.lastChecked)}
                  </Text>
                </View>
                <Pressable>
                  <Text
                    style={{
                      color: Colors[theme].primary,
                      fontFamily: "FontBold",
                      fontSize: 13,
                    }}
                  >
                    View Details
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        {/* Closed/Confirmed Snoops */}
        {closedSnoops.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: Colors[theme].text }]}>
              Past Snoops
            </Text>
            {closedSnoops.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: Colors[theme].card,
                    borderColor: Colors[theme].border,
                    opacity: 0.6,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <Text
                    style={[styles.cardTitle, { color: Colors[theme].text }]}
                  >
                    {item.title}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: Colors[theme].border },
                    ]}
                  >
                    <Text
                      style={{
                        color: Colors[theme].text_secondary,
                        fontSize: 11,
                        fontFamily: "FontBold",
                      }}
                    >
                      CONFIRMED
                    </Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.cardDescription,
                    { color: Colors[theme].text_secondary },
                  ]}
                  numberOfLines={1}
                >
                  {item.description}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Container>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingVertical: 20,
    paddingHorizontal: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "FontBold",
    letterSpacing: -1,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 15,
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statNumber: {
    fontSize: 32,
    fontFamily: "FontBold",
    marginBottom: 5,
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "FontMedium",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "FontBold",
    marginBottom: 15,
    textTransform: "uppercase",
    letterSpacing: 1,
    opacity: 0.7,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: "FontBold",
    flex: 1,
    marginRight: 10,
    letterSpacing: -0.5,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardDescription: {
    fontSize: 15,
    fontFamily: "FontRegular",
    marginBottom: 16,
    lineHeight: 22,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 5,
    paddingTop: 15,
    borderTopWidth: 1,
  },
});

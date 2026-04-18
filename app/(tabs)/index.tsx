import AddWatchlistModal from "@/components/AddWatchlistModal";
import Container from "@/components/Container";
import Loading from "@/components/Loading";
import TrackTopicModal from "@/components/TrackTopicModal";
import Colors from "@/constants/Colors";
import { useLoadingContext } from "@/context/LoadingContext";
import { useTheme } from "@/context/ThemeContext";
import { useUser } from "@/context/UserContext";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Octicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

// ---------------------------------------------------------------------------
// Pulsing Dot
// ---------------------------------------------------------------------------
const PulsingDot = ({ color, size = 6 }: { color: string; size?: number }) => {
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
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
};

const formatTimeAgo = (timestamp: number) => {
  const now = Date.now();
  const seconds = Math.floor((now - timestamp) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
};

// ---------------------------------------------------------------------------
// Trending Topic Pill
// ---------------------------------------------------------------------------
const TopicPill = ({
  topic,
  trackerCount,
  onTrack,
}: {
  topic: string;
  trackerCount: number;
  onTrack: () => void;
}) => {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.topicPill,
        {
          backgroundColor: Colors[theme].surface,
          borderColor: Colors[theme].border,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={[styles.topicName, { color: Colors[theme].text }]}
          numberOfLines={1}
        >
          {topic}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            marginTop: 4,
          }}
        >
          <Image
            source={require("@/assets/icons/tracked.png")}
            style={{
              width: 10,
              height: 10,
              tintColor: Colors[theme].text_secondary,
            }}
          />
          <Text
            style={{
              color: Colors[theme].text_secondary,
              fontFamily: "FontMedium",
              fontSize: 11,
            }}
          >
            {trackerCount} tracking
          </Text>
        </View>
      </View>
      <Pressable
        onPress={onTrack}
        style={[styles.trackBtn, { borderColor: Colors[theme].primary + "40" }]}
      >
        <Text
          style={{
            color: Colors[theme].primary,
            fontFamily: "FontBold",
            fontSize: 11,
            letterSpacing: 0.5,
          }}
        >
          TRACK
        </Text>
      </Pressable>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Active Snoop Card (compact version)
// ---------------------------------------------------------------------------
function SnoopCard({
  item,
}: {
  item: {
    _id: Id<"watchlist">;
    title: string;
    condition: string;
    status: "active" | "completed" | "inactive";
    last_checked: number;
  };
}) {
  const { theme } = useTheme();
  const router = useRouter();

  const unseenCount =
    useQuery(api.log.get_unseen_logs_count, {
      watchlist_id: item._id,
    }) ?? 0;

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const seconds = Math.floor((now - timestamp) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  const isActive = item.status === "active";

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/snoop/[id]",
          params: { id: item._id },
        })
      }
      style={[
        styles.snoopCard,
        {
          backgroundColor: Colors[theme].surface,
          borderColor: Colors[theme].border,
          opacity: isActive ? 1 : 0.5,
        },
      ]}
    >
      <View style={styles.snoopCardRow}>
        {/* Status indicator */}
        <View style={{ marginRight: 12, paddingTop: 2 }}>
          {isActive ? (
            <PulsingDot color={Colors[theme].success} size={8} />
          ) : (
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: Colors[theme].text_secondary,
                opacity: 0.4,
              }}
            />
          )}
        </View>

        {/* Title & metadata */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: Colors[theme].text,
              fontFamily: "FontBold",
              fontSize: 15,
              letterSpacing: -0.3,
            }}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginTop: 4,
            }}
          >
            <Text
              style={{
                color: Colors[theme].text_secondary,
                fontFamily: "FontMedium",
                fontSize: 11,
              }}
            >
              {isActive
                ? "Watching"
                : item.status === "completed"
                  ? "Confirmed"
                  : "Stopped"}
            </Text>
            <Text
              style={{
                color: Colors[theme].text_secondary,
                fontFamily: "FontRegular",
                fontSize: 11,
              }}
            >
              · {formatTimeAgo(item.last_checked)}
            </Text>
          </View>
        </View>

        {/* Unseen badge */}
        {unseenCount > 0 && (
          <View
            style={[
              styles.unseenBadge,
              { backgroundColor: Colors[theme].success + "20" },
            ]}
          >
            <Text
              style={{
                color: Colors[theme].success,
                fontFamily: "FontBold",
                fontSize: 11,
              }}
            >
              {unseenCount}
            </Text>
          </View>
        )}

        {/* Arrow */}
        <Image
          source={require("@/assets/icons/chevron-right.png")}
          style={{
            width: 14,
            height: 14,
            tintColor: Colors[theme].text_secondary,
            opacity: 0.5,
            marginLeft: 8,
          }}
        />
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Briefing Card Swipe
// ---------------------------------------------------------------------------
function BriefingCardSwipe({ item, width }: { item: any; width: number }) {
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => {
        if (item.watchlist_id) {
          router.push({
            pathname: "/snoop/[id]",
            params: { id: item.watchlist_id },
          });
        }
      }}
      style={[
        styles.briefingCardSwipe,
        {
          width: width - 40,
          backgroundColor: Colors[theme].surface,
          borderColor: Colors[theme].border,
        },
      ]}
    >
      <View style={styles.briefHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Octicons name="sparkle-fill" size={14} color={Colors[theme].text} />
          <Text
            style={[
              styles.sectionLabel,
              { color: Colors[theme].text, marginBottom: 0, fontSize: 11 },
            ]}
          >
            Briefing
          </Text>
        </View>
        <Text
          style={{
            color: Colors[theme].text_secondary,
            fontFamily: "FontMedium",
            fontSize: 10,
          }}
        >
          {formatTimeAgo(item._creationTime)}
        </Text>
      </View>

      <Text
        style={{
          color: Colors[theme].text,
          fontFamily: "FontBold",
          fontSize: 16,
          marginBottom: 6,
        }}
        numberOfLines={1}
      >
        {item.title}
      </Text>
      <Text
        style={{
          color: Colors[theme].text_secondary,
          fontFamily: "FontRegular",
          fontSize: 13,
          lineHeight: 20,
        }}
        numberOfLines={3}
      >
        {item.message}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Home Dashboard
// ---------------------------------------------------------------------------
export default function HomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { isLoading } = useConvexAuth();
  const { appLoading } = useLoadingContext();
  const { signedIn } = useUser();
  const navigation = useNavigation();
  const [animationKey, setAnimationKey] = useState(0);
  const [activeBriefIndex, setActiveBriefIndex] = useState(0);

  useEffect(() => {
    const unsubscribe = navigation.addListener("tabPress" as any, (e: any) => {
      setAnimationKey((prev) => prev + 1);
    });
    return unsubscribe;
  }, [navigation]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState("");

  // Data queries
  const watchlistData = useQuery(api.watchlist.get_watchlists) || [];
  const trendingTopics = useQuery(api.watchlist.get_trending_topics) || [];
  const unreadCount = useQuery(api.notifications.unread_count) ?? 0;

  const activeSnoops = watchlistData
    .filter((i: any) => i.status === "active")
    .sort((a: any, b: any) => b.last_checked - a.last_checked); // Latest first
  const allSnoops = watchlistData;

  const notifications = useQuery(api.notifications.get_notifications) || [];
  const latestBriefings = notifications.slice(0, 5); // Show up to 5 briefs in swiper

  if (isLoading || !signedIn || appLoading) return <Loading />;

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <Container>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <View>
          <Text
            style={{
              color: Colors[theme].text_secondary,
              fontFamily: "FontMedium",
              fontSize: 13,
              marginBottom: 4,
            }}
          >
            {currentDate}
          </Text>
          <Text
            style={[
              styles.headerTitle,
              { color: Colors[theme].text, fontSize: 32 },
            ]}
          >
            SNOOPA
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <Pressable
            onPress={() => router.push("/notifications" as any)}
            style={{ position: "relative", marginTop: 10 }}
          >
            <Image
              source={require("@/assets/icons/bells.png")}
              style={{
                width: 24,
                height: 24,
                tintColor: Colors[theme].text,
              }}
            />
            {unreadCount > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: -2,
                  right: -2,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: "#FF3B30",
                }}
              />
            )}
          </Pressable>
        </View>
      </Animated.View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Trending Topics */}
        {trendingTopics.length > 0 && (
          <Animated.View
            key={`trending-${animationKey}`}
            entering={FadeInDown.delay(100).duration(500)}
          >
            <View style={styles.sectionHeader}>
              <Text
                style={[
                  styles.sectionLabel,
                  { color: Colors[theme].text_secondary },
                ]}
              >
                WHAT PEOPLE ARE TRACKING...
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Image
                  source={require("@/assets/icons/tracked.png")}
                  style={{
                    width: 12,
                    height: 12,
                    tintColor: Colors[theme].text_secondary,
                    opacity: 0.6,
                  }}
                />
                <Text
                  style={{
                    color: Colors[theme].text_secondary,
                    fontFamily: "FontMedium",
                    fontSize: 11,
                    opacity: 0.6,
                  }}
                >
                  {trendingTopics.length} topics
                </Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingRight: 20 }}
              snapToInterval={260} // pill width (250) + gap (10)
              decelerationRate="fast"
              snapToAlignment="start"
            >
              {trendingTopics.map((t) => (
                <TopicPill
                  key={t.topic}
                  topic={t.topic}
                  trackerCount={t.tracker_count}
                  onTrack={() => {
                    setSelectedTopic(t.topic);
                    setShowTrackModal(true);
                  }}
                />
              ))}
            </ScrollView>
          </Animated.View>
        )}
        {/* Briefing Section */}
        {latestBriefings.length > 0 && (
          <Animated.View
            key={`briefing-${animationKey}`}
            entering={FadeInDown.delay(200).duration(500)}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Text
                  style={[
                    styles.sectionLabel,
                    { color: Colors[theme].text_secondary },
                  ]}
                >
                  RECENT BRIEFINGS
                </Text>
              </View>
              <Pressable onPress={() => router.push("/notifications" as any)}>
                <Text
                  style={{
                    color: Colors[theme].primary,
                    fontFamily: "FontBold",
                    fontSize: 11,
                  }}
                >
                  SEE ALL
                </Text>
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              onScroll={(e) => {
                const x = e.nativeEvent.contentOffset.x;
                const snapWidth = width - 40 + 12; // Card width + gap
                const index = Math.round(x / snapWidth);
                if (index !== activeBriefIndex) setActiveBriefIndex(index);
              }}
              scrollEventThrottle={16}
              snapToInterval={width - 40 + 12} // width - 40 (card) + 12 (gap)
              decelerationRate="fast"
              snapToAlignment="start"
              style={{ marginHorizontal: -20 }}
              contentContainerStyle={{ paddingHorizontal: 20 }}
            >
              {latestBriefings.map((item, index) => (
                <View
                  key={item._id}
                  style={{
                    marginRight: index === latestBriefings.length - 1 ? 0 : 12,
                  }}
                >
                  <BriefingCardSwipe item={item} width={width} />
                </View>
              ))}
            </ScrollView>

            {/* Pagination Dots */}
            {latestBriefings.length > 1 && (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 6,
                  marginTop: 14,
                }}
              >
                {latestBriefings.map((_, i) => (
                  <View
                    key={i}
                    style={{
                      width: activeBriefIndex === i ? 16 : 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor:
                        activeBriefIndex === i
                          ? Colors[theme].primary
                          : Colors[theme].text_secondary + "40",
                    }}
                  />
                ))}
              </View>
            )}
          </Animated.View>
        )}

        {/* Active Snoops List */}
        <Animated.View
          key={`active-snoops-${animationKey}`}
          entering={FadeInDown.delay(300).duration(500)}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Text
                style={[
                  styles.sectionLabel,
                  { color: Colors[theme].text_secondary },
                ]}
              >
                ACTIVE SNOOPS
              </Text>
            </View>
            {activeSnoops.length > 0 && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: Colors[theme].success + "15",
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 20,
                  gap: 4,
                }}
              >
                <PulsingDot color={Colors[theme].success} size={5} />
                <Text
                  style={{
                    color: Colors[theme].success,
                    fontFamily: "FontBold",
                    fontSize: 10,
                    letterSpacing: 0.5,
                  }}
                >
                  {activeSnoops.length} LIVE
                </Text>
              </View>
            )}
          </View>

          {allSnoops.length === 0 ? (
            <View style={styles.emptyState}>
              <Image
                source={require("@/assets/images/splash-icon.png")}
                style={{
                  width: 80,
                  height: 80,
                  opacity: 0.3,
                  marginBottom: 16,
                }}
              />
              <Text
                style={{
                  color: Colors[theme].text,
                  fontFamily: "FontBold",
                  fontSize: 18,
                  marginBottom: 8,
                  letterSpacing: -0.5,
                }}
              >
                No snoops yet
              </Text>
              <Text
                style={{
                  color: Colors[theme].text_secondary,
                  fontFamily: "FontRegular",
                  fontSize: 14,
                  textAlign: "center",
                  lineHeight: 20,
                  maxWidth: 260,
                }}
              >
                Tap the + button to start tracking something. I'll keep my nose
                to the ground.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {activeSnoops.slice(0, 3).map((item) => (
                <SnoopCard key={item._id} item={item as any} />
              ))}
              <Pressable
                onPress={() => router.push("/(tabs)/watchlist")}
                style={{ alignSelf: "flex-end", marginTop: 8 }}
              >
                <Text
                  style={{
                    color: Colors[theme].primary,
                    fontFamily: "FontBold",
                    fontSize: 12,
                  }}
                >
                  See more
                </Text>
              </Pressable>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* FAB */}
      <Pressable
        onPress={() => setShowAddModal(true)}
        style={[
          styles.fab,
          {
            backgroundColor: Colors[theme].primary,
          },
        ]}
      >
        <Text
          style={{
            fontSize: 28,
            color: Colors[theme].background,
            fontFamily: "FontLight",
            marginTop: -2,
          }}
        >
          +
        </Text>
      </Pressable>

      {/* Modals */}
      <AddWatchlistModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      <TrackTopicModal
        visible={showTrackModal}
        topic={selectedTopic}
        onClose={() => setShowTrackModal(false)}
      />
    </Container>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  header: {
    paddingVertical: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: "FontBold",
    letterSpacing: -1,
  },
  section: {
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "FontBold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  topicPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    width: 250,
    gap: 12,
  },
  topicName: {
    fontFamily: "FontBold",
    fontSize: 13,
    letterSpacing: -0.2,
  },
  trackBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  briefingCardSwipe: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    height: 170,
  },
  briefHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  snoopCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginVertical: 5,
  },
  snoopCardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  unseenBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 0,
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

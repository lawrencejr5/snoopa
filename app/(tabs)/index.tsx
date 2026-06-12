import AddWatchlistModal from "@/components/AddWatchlistModal";
import Container from "@/components/Container";
import Loading from "@/components/Loading";
import TrackTopicModal from "@/components/TrackTopicModal";
import {
  CommandsModal,
  ConfirmationModal,
  RenameModal,
} from "@/components/WatchlistOptionsModal";
import Colors from "@/constants/Colors";
import { useCustomAlert } from "@/context/CustomAlertContext";
import { useLoadingContext } from "@/context/LoadingContext";
import { useTheme } from "@/context/ThemeContext";
import { useUser } from "@/context/UserContext";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Octicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
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
import Svg, { Circle } from "react-native-svg";

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

// ---------------------------------------------------------------------------
// Avatar ring with snoop progress
// ---------------------------------------------------------------------------
const AVATAR_MAP: Record<string, any> = {
  chill: require("@/assets/images/avatars/chill.png"),
  gay: require("@/assets/images/avatars/gay.png"),
  relax: require("@/assets/images/avatars/relax.png"),
  shy: require("@/assets/images/avatars/shy.png"),
  swaga: require("@/assets/images/avatars/swaga.png"),
};

function AvatarSnoopRing({
  avatar,
  remaining,
  total,
  size = 48,
  strokeWidth = 3,
  color,
  bgColor,
}: {
  avatar: string | undefined;
  remaining: number;
  total: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  bgColor: string;
}) {
  const { theme } = useTheme();

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const used = total > 0 ? Math.min(total - remaining, total) : 0;
  const progress = total > 0 ? used / total : 0;
  // Progress goes from 12 o'clock (top), clockwise
  const strokeDashoffset = circumference * (1 - progress);

  const avatarSrc =
    avatar && AVATAR_MAP[avatar]
      ? AVATAR_MAP[avatar]
      : require("@/assets/images/splash-icon.png");

  return (
    <View style={{ width: size, height: size, position: "relative" }}>
      <Svg
        width={size}
        height={size}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        {/* Track ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={bgColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Image
        source={avatarSrc}
        style={{
          width: size - strokeWidth * 2 - 8,
          height: size - strokeWidth * 2 - 8,
          borderRadius: (size - strokeWidth * 2 - 2) / 2,
          position: "absolute",
          top: strokeWidth + 4,
          left: strokeWidth + 4,
          backgroundColor: Colors[theme].surface,
        }}
      />
    </View>
  );
}

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
  onLongPress,
}: {
  item: {
    _id: Id<"watchlist">;
    title: string;
    condition: string;
    status: "active" | "completed" | "inactive";
    last_checked: number;
  };
  onLongPress?: () => void;
}) {
  const { theme } = useTheme();
  const router = useRouter();

  const scale = useSharedValue(1);

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

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/snoop/[id]",
          params: { id: item._id },
        })
      }
      onPressIn={() => {
        scale.value = withTiming(0.96, { duration: 100 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 150 });
      }}
      onLongPress={onLongPress}
      delayLongPress={300}
    >
      <Animated.View
        style={[
          styles.snoopCard,
          {
            backgroundColor: Colors[theme].surface,
            borderColor: Colors[theme].border,
            opacity: isActive ? 1 : 0.5,
          },
          animatedStyle,
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
      </Animated.View>
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

  // Options Modal State
  const [selectedSnoop, setSelectedSnoop] = useState<{
    _id: Id<"watchlist">;
    title: string;
    status: "active" | "completed" | "inactive";
  } | null>(null);
  const [showCommands, setShowCommands] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Alert and Mutations
  const { showCustomAlert } = useCustomAlert();
  const deactivateWatchlist = useMutation(api.watchlist.deactivate_watchlist);
  const reactivateWatchlist = useMutation(api.watchlist.reactivate_watchlist);
  const updateWatchlist = useMutation(api.watchlist.update_watchlist_item);
  const deleteWatchlist = useMutation(api.watchlist.delete_watchlist_item);

  // Action Handlers
  const handleLongPress = (item: any) => {
    setSelectedSnoop(item);
    setShowCommands(true);
  };

  const handlePauseResume = async () => {
    if (!selectedSnoop) return;
    const is_paused = selectedSnoop.status === "inactive";
    setIsProcessing(true);
    try {
      if (is_paused) {
        await reactivateWatchlist({ watchlist_id: selectedSnoop._id });
        showCustomAlert("Watchlist tracking resumed", "success");
      } else {
        await deactivateWatchlist({ watchlist_id: selectedSnoop._id });
        showCustomAlert("Watchlist tracking paused", "success");
      }
      setShowCommands(false);
    } catch (e) {
      console.error(e);
      showCustomAlert("Failed to update tracking status", "danger");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRename = async (newTitle: string) => {
    if (!selectedSnoop || !newTitle.trim()) return;
    setIsProcessing(true);
    try {
      await updateWatchlist({
        watchlist_id: selectedSnoop._id,
        title: newTitle.trim(),
      });
      showCustomAlert("Watchlist renamed successfully", "success");
      setShowRename(false);
    } catch (e) {
      console.error(e);
      showCustomAlert("Failed to rename watchlist", "danger");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedSnoop) return;
    setIsProcessing(true);
    try {
      await deleteWatchlist({ watchlist_id: selectedSnoop._id });
      showCustomAlert("Watchlist deleted successfully", "success");
      setShowConfirmation(false);
    } catch (e) {
      console.error(e);
      showCustomAlert("Failed to delete watchlist", "danger");
    } finally {
      setIsProcessing(false);
    }
  };

  // Data queries
  const watchlistData = useQuery(api.watchlist.get_watchlists) || [];
  const trendingTopics = (
    useQuery(api.watchlist.get_trending_topics) || []
  ).slice(0, 7);
  const unreadCount = useQuery(api.notifications.unread_count) ?? 0;
  const snoop_balance = useQuery(api.snoops.get_snoop_balance) ?? 0;
  const snoop_grants = useQuery(api.snoops.get_snoop_grants) ?? [];
  // Total snoops from first non-top-up grant (free/monthly)
  const primary_grant = snoop_grants.find(
    (g: any) => g.type === "free" || g.type === "monthly",
  );
  const snoop_total = primary_grant ? primary_grant.snoops : 30;

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
        {/* Left — Avatar ring + title */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <AvatarSnoopRing
            avatar={(signedIn as any)?.avatar}
            remaining={snoop_balance}
            total={snoop_total}
            size={48}
            strokeWidth={3}
            color={Colors[theme].text}
            bgColor={Colors[theme].border}
          />
          <View>
            <Text
              style={{
                color: Colors[theme].text_secondary,
                fontFamily: "FontMedium",
                fontSize: 11,
                marginBottom: 2,
              }}
            >
              {currentDate}
            </Text>
            <Text style={[styles.headerTitle, { color: Colors[theme].text }]}>
              SNOOPA
            </Text>
          </View>
        </View>

        {/* Right — Notification bell */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <Pressable
            onPress={() => router.push("/notifications" as any)}
            style={{ position: "relative" }}
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
        {activeSnoops.length > 0 && (
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
                  RECENT BRIEFING(S)
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
              {latestBriefings.length > 0 ? (
                latestBriefings.map((item, index) => (
                  <View
                    key={item._id}
                    style={{
                      marginRight:
                        index === latestBriefings.length - 1 ? 0 : 12,
                    }}
                  >
                    <BriefingCardSwipe item={item} width={width} />
                  </View>
                ))
              ) : (
                <View
                  style={[
                    styles.briefingCardSwipe,
                    {
                      width: width - 40,
                      backgroundColor: Colors[theme].surface,
                      borderColor: Colors[theme].border,
                      justifyContent: "center",
                      alignItems: "center",
                      gap: 12,
                    },
                  ]}
                >
                  <Octicons
                    name="info"
                    size={20}
                    color={Colors[theme].text_secondary}
                  />
                  <Text
                    style={{
                      color: Colors[theme].text_secondary,
                      fontFamily: "FontMedium",
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    No briefings for you yet
                  </Text>
                </View>
              )}
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
                ACTIVE WATCHLISTS
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
                <SnoopCard
                  key={item._id}
                  item={item as any}
                  onLongPress={() => handleLongPress(item)}
                />
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

      {selectedSnoop && (
        <>
          <CommandsModal
            visible={showCommands}
            onClose={() => setShowCommands(false)}
            snoop={{ status: selectedSnoop.status, title: selectedSnoop.title }}
            onTerminate={() => {
              setShowCommands(false);
              setTimeout(() => setShowConfirmation(true), 300);
            }}
            onPauseResume={handlePauseResume}
            onRename={() => {
              setShowCommands(false);
              setTimeout(() => setShowRename(true), 300);
            }}
            isProcessing={isProcessing}
            hideSourceAndCondition={true}
          />

          <RenameModal
            visible={showRename}
            onClose={() => setShowRename(false)}
            currentTitle={selectedSnoop.title}
            onSave={handleRename}
            isProcessing={isProcessing}
          />

          <ConfirmationModal
            visible={showConfirmation}
            onClose={() => setShowConfirmation(false)}
            onConfirm={handleConfirmDelete}
            title="Delete Watchlist?"
            message={`Are you sure you want to delete "${selectedSnoop.title}"? This will permanently remove all logs, chat history, and sources associated with this snoop.`}
            isProcessing={isProcessing}
          />
        </>
      )}
    </Container>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  header: {
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
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

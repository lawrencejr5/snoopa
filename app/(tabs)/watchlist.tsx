import AddWatchlistModal from "@/components/AddWatchlistModal";
import PremiumFeatureModal from "@/components/PremiumFeatureModal";
import Container from "@/components/Container";
import Loading from "@/components/Loading";
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
} from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

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

// ---------------------------------------------------------------------------
// Simplified Snoop Card — title only, no condition
// ---------------------------------------------------------------------------
type WatchlistItem = {
  _id: import("@/convex/_generated/dataModel").Id<"watchlist">;
  title: string;
  condition: string;
  status: "active" | "completed" | "inactive";
  last_checked: number;
  [key: string]: unknown;
};

function ActiveSnoopCard({
  item,
  router,
  onLongPress,
}: {
  item: WatchlistItem;
  theme: string;
  router: ReturnType<typeof useRouter>;
  onLongPress?: () => void;
}) {
  const unseenCount =
    useQuery(api.chat.get_unseen_chats_count, {
      watchlist_id: item._id,
    }) ?? 0;

  const { theme } = useTheme();
  const scale = useSharedValue(1);

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
          styles.card,
          {
            backgroundColor: Colors[theme].surface,
            borderColor: Colors[theme].border,
          },
          animatedStyle,
        ]}
      >
        <View style={styles.cardHeader}>
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <PulsingDot color={Colors[theme].success} />
            <Text style={[styles.cardTitle, { color: Colors[theme].text }]}>
              {item.title}
            </Text>
          </View>
          {unseenCount > 0 && (
            <View
              style={{
                backgroundColor: Colors[theme].success + "20",
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 10,
              }}
            >
              <Text
                style={{
                  color: Colors[theme].success,
                  fontSize: 11,
                  fontFamily: "FontBold",
                }}
              >
                {unseenCount} new
              </Text>
            </View>
          )}
        </View>

        <View
          style={[styles.cardFooter, { borderTopColor: Colors[theme].border }]}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Image
              source={require("@/assets/icons/clock.png")}
              style={{
                width: 13,
                height: 13,
                tintColor: Colors[theme].text_secondary,
                marginRight: 5,
              }}
            />
            <Text
              style={{
                color: Colors[theme].text_secondary,
                fontFamily: "FontMedium",
                fontSize: 12,
              }}
            >
              Last checked {formatTimeAgo(item.last_checked)}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text
              style={{
                color: Colors[theme].primary,
                fontFamily: "FontBold",
                fontSize: 12,
              }}
            >
              View Details
            </Text>
            {unseenCount > 0 && (
              <View
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 4,
                  backgroundColor: "#FF3B30",
                  marginBottom: 8,
                }}
              />
            )}
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

function InactiveSnoopCard({
  item,
  router,
  onLongPress,
}: {
  item: WatchlistItem;
  router: ReturnType<typeof useRouter>;
  onLongPress?: () => void;
}) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

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
          styles.card,
          {
            backgroundColor: Colors[theme].card,
            borderColor: Colors[theme].border,
            opacity: 0.6,
          },
          animatedStyle,
        ]}
      >
        <View style={styles.cardHeader}>
          <Text
            style={[styles.cardTitle, { color: Colors[theme].text }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: Colors[theme].border,
              },
            ]}
          >
            <Text
              style={{
                color: Colors[theme].text_secondary,
                fontSize: 11,
                fontFamily: "FontBold",
              }}
            >
              {item.status === "inactive" ? "STOPPED" : "CONFIRMED"}
            </Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

export default function WatchlistScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  const { isLoading } = useConvexAuth();
  const { appLoading } = useLoadingContext();
  const { signedIn } = useUser();
  const navigation = useNavigation();
  const [animationKey, setAnimationKey] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // Options Modal State
  const [selectedSnoop, setSelectedSnoop] = useState<{
    _id: import("@/convex/_generated/dataModel").Id<"watchlist">;
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

  useEffect(() => {
    const unsubscribe = navigation.addListener("tabPress" as any, (e: any) => {
      setAnimationKey((prev) => prev + 1);
    });
    return unsubscribe;
  }, [navigation]);

  const watchlistData = useQuery(api.watchlist.get_watchlists) || [];
  const is_locked = watchlistData.length >= 2 && signedIn?.is_premium !== true;
  const snoop_balance = useQuery(api.snoops.get_snoop_balance) ?? 0;
  const snoop_grants = useQuery(api.snoops.get_snoop_grants) ?? [];
  const primary_grant = (snoop_grants as any[]).find(
    (g) => g.type === "free" || g.type === "monthly",
  );
  const snoop_total = primary_grant ? primary_grant.snoops : 30;
  const snoops_used = snoop_total - snoop_balance;

  const activeSnoops = watchlistData.filter((i) => i.status === "active");
  const closedSnoops = watchlistData.filter(
    (i) => i.status === "completed" || i.status === "inactive",
  );

  if (isLoading || !signedIn || appLoading || !watchlistData)
    return <Loading />;

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
        contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {watchlistData.length === 0 ? (
          /* Empty State */
          <Animated.View
            key={`empty-${animationKey}`}
            entering={FadeInDown.duration(500)}
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              paddingHorizontal: 20,
            }}
          >
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: "transparent",
                  borderColor: Colors[theme].border,
                },
              ]}
            >
              <Image
                source={require("@/assets/images/splash-icon.png")}
                style={{
                  width: 100,
                  height: 100,
                  marginBottom: 20,
                }}
              />
              <Text
                style={{
                  color: Colors[theme].text,
                  fontFamily: "FontBold",
                  fontSize: 20,
                  marginBottom: 10,
                  letterSpacing: -0.5,
                }}
              >
                No Snoops Yet
              </Text>
              <Text
                style={{
                  color: Colors[theme].text_secondary,
                  fontFamily: "FontRegular",
                  fontSize: 15,
                  textAlign: "center",
                  lineHeight: 22,
                  marginBottom: 25,
                }}
              >
                Your watchlist is empty. Start tracking events, prices, or
                anything you want to keep an eye on.
              </Text>
              <Pressable
                onPress={() => setShowAddModal(true)}
                style={{
                  backgroundColor: Colors[theme].primary,
                  paddingVertical: 14,
                  paddingHorizontal: 30,
                  borderRadius: 12,
                }}
              >
                <Text
                  style={{
                    color: Colors[theme].background,
                    fontFamily: "FontBold",
                    fontSize: 15,
                  }}
                >
                  Start Tracking
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        ) : (
          <>
            {/* Stats Section */}
            <Animated.View
              key={`stats-${animationKey}`}
              entering={FadeInDown.delay(100).duration(400)}
              style={styles.statsContainer}
            >
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
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <PulsingDot color={Colors[theme].success} />
                  <Text
                    style={[styles.statNumber, { color: Colors[theme].text }]}
                  >
                    {activeSnoops.length}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.statLabel,
                    { color: Colors[theme].text_secondary },
                  ]}
                >
                  Tracking
                </Text>
              </View>
              {/* Snoop Balance Card */}
              <View
                style={[
                  styles.statCard,
                  {
                    backgroundColor: Colors[theme].card,
                    borderColor: Colors[theme].border,
                  },
                ]}
              >
                <View style={{ alignItems: "center", width: "100%" }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "baseline",
                      gap: 2,
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={[styles.statNumber, { color: Colors[theme].text }]}
                    >
                      {snoops_used}
                    </Text>
                    <Text
                      style={{
                        color: Colors[theme].text_secondary,
                        fontFamily: "FontMedium",
                        fontSize: 11,
                      }}
                    >
                      /{snoop_total}
                    </Text>
                  </View>
                  {/* Mini progress bar */}
                  {/* <View
                    style={{
                      width: "100%",
                      height: 3,
                      borderRadius: 2,
                      backgroundColor: Colors[theme].border,
                      marginBottom: 8,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        width: `${snoop_total > 0 ? (snoop_balance / snoop_total) * 100 : 0}%`,
                        height: 3,
                        borderRadius: 2,
                        backgroundColor:
                          snoop_balance > snoop_total * 0.3
                            ? Colors[theme].success
                            : Colors[theme].danger,
                      }}
                    />
                  </View> */}
                </View>
                <Text
                  style={[
                    styles.statLabel,
                    { color: Colors[theme].text_secondary },
                  ]}
                >
                  Snoops Used
                </Text>
              </View>
            </Animated.View>

            {/* Active Snoops */}
            {activeSnoops.length > 0 && (
              <Animated.View
                key={`active-${animationKey}`}
                entering={FadeInDown.delay(200).duration(400)}
                style={styles.section}
              >
                <Text
                  style={[styles.sectionTitle, { color: Colors[theme].text }]}
                >
                  Active Watchlists
                </Text>
                {activeSnoops.map((item) => (
                  <ActiveSnoopCard
                    key={item._id}
                    item={item as WatchlistItem}
                    theme={theme}
                    router={router}
                    onLongPress={() => handleLongPress(item)}
                  />
                ))}
              </Animated.View>
            )}

            {/* Closed/Confirmed Snoops */}
            {closedSnoops.length > 0 && (
              <Animated.View
                key={`closed-${animationKey}`}
                entering={FadeInDown.delay(300).duration(400)}
                style={styles.section}
              >
                <Text
                  style={[styles.sectionTitle, { color: Colors[theme].text }]}
                >
                  Inactive Snoops
                </Text>
                {closedSnoops.map((item) => (
                  <InactiveSnoopCard
                    key={item._id}
                    item={item as WatchlistItem}
                    router={router}
                    onLongPress={() => handleLongPress(item)}
                  />
                ))}
              </Animated.View>
            )}
          </>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <Pressable
        onPress={() => {
          if (is_locked) {
            setShowPremiumModal(true);
          } else {
            setShowAddModal(true);
          }
        }}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: Colors[theme].primary,
            opacity: pressed ? 0.82 : 1,
            transform: [{ scale: pressed ? 0.96 : 1 }],
          },
        ]}
      >
        {is_locked ? (
          <Octicons
            name="lock"
            size={18}
            color={Colors[theme].background}
          />
        ) : (
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
        )}
      </Pressable>

      <AddWatchlistModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      <PremiumFeatureModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        featureName="Unlimited Watchlists"
        featureDescription="Free accounts are limited to tracking up to 2 watchlists concurrently. Upgrade to Pro to track unlimited topics and monitor all your custom intelligence streams! 🔒"
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
  emptyCard: {
    width: "100%",
    maxWidth: 400,
    padding: 0,
    alignItems: "center",
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
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "FontBold",
    flex: 1,
    marginRight: 10,
    letterSpacing: -0.3,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});

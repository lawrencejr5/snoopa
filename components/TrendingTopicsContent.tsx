import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface TrendingTopicsContentProps {
  onTrackTopic: (topic: string, suggestedCondition?: string) => void;
  onClose?: () => void;
}

export default function TrendingTopicsContent({
  onTrackTopic,
  onClose,
}: TrendingTopicsContentProps) {
  const { theme } = useTheme();
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>(
    {},
  );

  const toggleExpand = (key: string) => {
    setExpandedTopics((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Query user country topics (defaults to user's country if set)
  const userTrendingResult = useQuery(api.watchlist.get_trending_topics, {});
  // Query worldwide topics strictly
  const worldTrendingResult = useQuery(api.watchlist.get_trending_topics, {
    country_code: "WORLD",
  });

  const isLoading =
    userTrendingResult === undefined && worldTrendingResult === undefined;

  const hasCountryTopics =
    !Array.isArray(userTrendingResult) &&
    userTrendingResult?.is_fallback === false &&
    userTrendingResult?.country_code !== "WORLD" &&
    (userTrendingResult?.topics?.length ?? 0) > 0;

  const userCountryName =
    !Array.isArray(userTrendingResult) && userTrendingResult?.country_name
      ? userTrendingResult.country_name
      : "Country";

  const userFlagEmoji =
    !Array.isArray(userTrendingResult) && userTrendingResult?.flag_emoji
      ? userTrendingResult.flag_emoji
      : "🌐";

  const [selectedTab, setSelectedTab] = useState<"country" | "worldwide">(
    hasCountryTopics ? "country" : "worldwide",
  );

  // Sync selected tab if data loads later
  React.useEffect(() => {
    if (hasCountryTopics) {
      setSelectedTab("country");
    } else {
      setSelectedTab("worldwide");
    }
  }, [hasCountryTopics]);

  const activeTopics =
    selectedTab === "country" && hasCountryTopics
      ? !Array.isArray(userTrendingResult)
        ? userTrendingResult?.topics || []
        : []
      : !Array.isArray(worldTrendingResult)
        ? worldTrendingResult?.topics || []
        : Array.isArray(userTrendingResult)
          ? userTrendingResult
          : userTrendingResult?.topics || [];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.modalTitle, { color: Colors[theme].text }]}>
            Trending Topics
          </Text>
          <Text
            style={[
              styles.modalSubtitle,
              { color: Colors[theme].text_secondary },
            ]}
          >
            Curated facts & intel ready to track
          </Text>
        </View>
        {onClose && (
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={[
              styles.closeBtn,
              {
                backgroundColor: Colors[theme].surface,
                borderColor: Colors[theme].border,
              },
            ]}
          >
            <Image
              source={require("@/assets/icons/chevron-down.png")}
              style={{
                width: 14,
                height: 14,
                tintColor: Colors[theme].text,
              }}
            />
          </Pressable>
        )}
      </View>

      {/* Tabs */}
      <View
        style={[
          styles.tabContainer,
          {
            backgroundColor: Colors[theme].surface,
            borderColor: Colors[theme].border,
          },
        ]}
      >
        {hasCountryTopics ? (
          <>
            <Pressable
              onPress={() => setSelectedTab("country")}
              style={[
                styles.tabBtn,
                selectedTab === "country" && [
                  styles.activeTabBtn,
                  {
                    backgroundColor: Colors[theme].card,
                    borderColor: Colors[theme].milk,
                  },
                ],
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      selectedTab === "country"
                        ? Colors[theme].milk
                        : Colors[theme].text_secondary,
                  },
                ]}
              >
                {userFlagEmoji} {userCountryName}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setSelectedTab("worldwide")}
              style={[
                styles.tabBtn,
                selectedTab === "worldwide" && [
                  styles.activeTabBtn,
                  {
                    backgroundColor: Colors[theme].card,
                    borderColor: Colors[theme].milk,
                  },
                ],
              ]}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Image
                  source={require("@/assets/icons/globe.png")}
                  style={{
                    width: 14,
                    height: 14,
                    tintColor:
                      selectedTab === "worldwide"
                        ? Colors[theme].milk
                        : Colors[theme].text_secondary,
                  }}
                />
                <Text
                  style={[
                    styles.tabText,
                    {
                      color:
                        selectedTab === "worldwide"
                          ? Colors[theme].milk
                          : Colors[theme].text_secondary,
                    },
                  ]}
                >
                  Worldwide
                </Text>
              </View>
            </Pressable>
          </>
        ) : (
          <View
            style={[
              styles.tabBtn,
              styles.activeTabBtn,
              {
                backgroundColor: Colors[theme].card,
                borderColor: Colors[theme].milk,
                width: "100%",
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
              <Image
                source={require("@/assets/icons/globe.png")}
                style={{
                  width: 14,
                  height: 14,
                  tintColor: Colors[theme].milk,
                }}
              />
              <Text style={[styles.tabText, { color: Colors[theme].milk }]}>
                Worldwide
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors[theme].primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {activeTopics.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text
                style={[
                  styles.emptyText,
                  { color: Colors[theme].text_secondary },
                ]}
              >
                No trending topics available right now.
              </Text>
            </View>
          ) : (
            activeTopics.map((item, index) => {
              const cardKey = item.topic + index;
              const isExpanded = !!expandedTopics[cardKey];

              return (
                <View
                  key={cardKey}
                  style={[
                    styles.card,
                    {
                      backgroundColor: Colors[theme].card,
                      borderColor: Colors[theme].border,
                    },
                  ]}
                >
                  {/* Category Badge */}
                  <View style={styles.cardHeader}>
                    <View
                      style={[
                        styles.categoryBadge,
                        {
                          backgroundColor: Colors[theme].surface,
                          borderColor: Colors[theme].border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryText,
                          { color: Colors[theme].milk },
                        ]}
                      >
                        {item.category?.toUpperCase() || "WORLD"}
                      </Text>
                    </View>
                  </View>

                  {/* Topic Title */}
                  <Text
                    style={[styles.topicTitle, { color: Colors[theme].text }]}
                  >
                    {item.topic}
                  </Text>

                  {/* Summary (1 line max by default, full when expanded) */}
                  {item.summary ? (
                    <Text
                      numberOfLines={isExpanded ? undefined : 1}
                      style={[
                        styles.summaryText,
                        { color: Colors[theme].text_secondary },
                      ]}
                    >
                      {item.summary}
                    </Text>
                  ) : null}

                  {/* See More & Track Button */}
                  <View style={styles.cardFooter}>
                    <Pressable
                      onPress={() => toggleExpand(cardKey)}
                      hitSlop={8}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        paddingVertical: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "FontMedium",
                          fontSize: 12,
                          color: Colors[theme].text_secondary,
                        }}
                      >
                        {isExpanded ? "See Less" : "See More"}
                      </Text>
                      <Image
                        source={
                          isExpanded
                            ? require("@/assets/icons/chevron-up.png")
                            : require("@/assets/icons/chevron-down.png")
                        }
                        style={{
                          width: 12,
                          height: 12,
                          tintColor: Colors[theme].text_secondary,
                        }}
                      />
                    </Pressable>

                    <Pressable
                      onPress={() =>
                        onTrackTopic(item.topic, item.suggested_condition)
                      }
                      style={({ pressed }) => [
                        styles.trackBtn,
                        {
                          backgroundColor: "transparent",
                          borderColor: Colors[theme].border,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.trackBtnText,
                          { color: Colors[theme].text },
                        ]}
                      >
                        Track
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: "FontBold",
    fontSize: 22,
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontFamily: "FontMedium",
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabContainer: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  activeTabBtn: {
    borderWidth: 1,
  },
  tabText: {
    fontFamily: "FontBold",
    fontSize: 13,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  listContent: {
    gap: 12,
    paddingBottom: 40,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: "FontMedium",
    fontSize: 14,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryText: {
    fontFamily: "FontBold",
    fontSize: 10,
    letterSpacing: 1,
  },
  topicTitle: {
    fontFamily: "FontBold",
    fontSize: 17,
    letterSpacing: -0.3,
  },
  summaryText: {
    fontFamily: "FontRegular",
    fontSize: 13,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 4,
  },
  trackBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  trackBtnText: {
    fontFamily: "FontBold",
    fontSize: 13,
  },
});

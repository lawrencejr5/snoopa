import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";

interface TrendingTopicsContentProps {
  onTrackTopic: (topic: string, suggestedCondition?: string) => void;
  onClose?: () => void;
}

export default function TrendingTopicsContent({
  onTrackTopic,
  onClose,
}: TrendingTopicsContentProps) {
  const { theme } = useTheme();

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
            <Text
              style={{
                color: Colors[theme].text,
                fontSize: 16,
                fontFamily: "FontBold",
              }}
            >
              ✕
            </Text>
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
            activeTopics.map((item, index) => (
              <View
                key={item.topic + index}
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

                {/* Summary */}
                {item.summary ? (
                  <Text
                    style={[
                      styles.summaryText,
                      { color: Colors[theme].text_secondary },
                    ]}
                  >
                    {item.summary}
                  </Text>
                ) : null}

                {/* Suggested Condition & Track Button */}
                <View style={styles.cardFooter}>
                  {item.suggested_condition ? (
                    <View
                      style={[
                        styles.conditionPill,
                        { backgroundColor: Colors[theme].surface },
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.conditionText,
                          { color: Colors[theme].lightgreen },
                        ]}
                      >
                        ⚡️ {item.suggested_condition}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ flex: 1 }} />
                  )}

                  <Pressable
                    onPress={() =>
                      onTrackTopic(item.topic, item.suggested_condition)
                    }
                    style={({ pressed }) => [
                      styles.trackBtn,
                      {
                        backgroundColor: Colors[theme].primary,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Text style={styles.trackBtnText}>+ Track</Text>
                  </Pressable>
                </View>
              </View>
            ))
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
  conditionPill: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  conditionText: {
    fontFamily: "FontMedium",
    fontSize: 11,
  },
  trackBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  trackBtnText: {
    color: "#141414",
    fontFamily: "FontBold",
    fontSize: 13,
  },
});

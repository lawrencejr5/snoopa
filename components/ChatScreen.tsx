import Container from "@/components/Container";
import TypeWriter from "@/components/TypeWriter";
import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { useUser } from "@/context/UserContext";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRoute } from "@react-navigation/native";
import { useAction, useMutation, useQuery } from "convex/react";
import { useNavigation } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { TextInput } from "react-native-gesture-handler";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import FormatText from "./FormatText";

export default function ChatScreen() {
  const { theme } = useTheme();
  const [input, setInput] = useState<string>("");
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const scrollViewRef = useRef<ScrollView>(null);
  const userMessageYPositions = useRef<Map<string, number>>(new Map());
  const userHasScrolled = useRef(false);

  // Scroll to the last user message's Y position with a small delay
  // so layout has time to settle (fixes partial-scroll bug).
  // Skips scrolling if the user has manually dragged the scroll view.
  const scrollToLastUserMessage = useCallback(() => {
    if (userHasScrolled.current) return;
    setTimeout(() => {
      if (userHasScrolled.current) return;
      const positions = userMessageYPositions.current;
      if (positions.size === 0) return;

      let maxY = -1;
      positions.forEach((y) => {
        if (y > maxY) maxY = y;
      });

      if (maxY >= 0 && scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: maxY, animated: true });
      }
    }, 100);
  }, []);

  const sessionId = route.params?.sessionId as Id<"sessions"> | undefined;

  const messages = useQuery(
    api.chat.get_messages,
    sessionId ? { session_id: sessionId } : "skip",
  );

  const session = useQuery(
    api.session.get_session,
    sessionId ? { session_id: sessionId } : "skip",
  );

  // Get saved message IDs to restore saved state
  const savedMessageIds = useQuery(
    api.watchlist.get_saved_message_ids,
    sessionId ? { session_id: sessionId } : "skip",
  );

  const sendMessage = useAction(api.chat.send_message);
  const detectIntent = useAction(api.chat.detect_intent);
  const addWatchlist = useMutation(api.watchlist.add_watchlist_item);
  const markChatsSeen = useMutation(api.chat.mark_chats_seen);
  const unreadCount = useQuery(api.notifications.unread_count) ?? 0;
  const { signedIn } = useUser();

  const [sending, setSending] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState<Id<"chats"> | null>(
    null,
  );
  const [snoopingText, setSnoopingText] = useState("Snooping...");
  const lastProcessedMessageIdRef = useRef<string | null>(null);
  const [isHere, setIsHere] = useState(false);
  const [expandedUserMessages, setExpandedUserMessages] = useState<{
    [key: string]: boolean;
  }>({});
  const [truncatedUserMessages, setTruncatedUserMessages] = useState<{
    [key: string]: boolean;
  }>({});

  // Track saving and saved state for watchlist items
  const [savingWatchlist, setSavingWatchlist] = useState<{
    [key: string]: boolean;
  }>({});
  const [savedWatchlist, setSavedWatchlist] = useState<{
    [key: string]: boolean;
  }>({});
  const [expandedWatchlist, setExpandedWatchlist] = useState<{
    [key: string]: boolean;
  }>({});

  // Populate savedWatchlist from database when savedMessageIds loads
  useEffect(() => {
    if (savedMessageIds && savedMessageIds.length > 0) {
      const savedState: { [key: string]: boolean } = {};
      savedMessageIds.forEach((msgId) => {
        savedState[msgId] = true;
      });
      setSavedWatchlist(savedState);
    }
  }, [savedMessageIds]);

  // Check if we are loading messages for an existing session

  // Use this effect to reset internal state when switching sessions
  useEffect(() => {
    setIsHere(false);
    setTypingMessageId(null);
    lastProcessedMessageIdRef.current = null;
    userMessageYPositions.current.clear();
  }, [sessionId]);

  // Mark all snoopa messages as seen when a chat session is opened
  useEffect(() => {
    if (sessionId) {
      markChatsSeen({ session_id: sessionId }).catch(() => {});
    }
  }, [sessionId]);

  // Optimistic UI: track pending user message
  const [pendingContent, setPendingContent] = useState<string | null>(null);

  // Merge real messages with optimistic pending message
  const displayMessages = useMemo(() => {
    const real = messages || [];

    // If we have a pending message, check if it already appeared in real messages
    if (pendingContent) {
      const alreadySaved = real.some(
        (m) => m.role === "user" && m.content === pendingContent,
      );
      if (alreadySaved) {
        // Will be cleared by the effect below
        return real;
      }
      // Inject a fake optimistic message at the end
      return [
        ...real,
        {
          _id: "pending" as Id<"chats">,
          _creationTime: Date.now(),
          session_id: sessionId as Id<"sessions">,
          role: "user" as const,
          content: pendingContent,
          type: undefined,
          sources: undefined,
        },
      ];
    }

    return real;
  }, [messages, pendingContent, sessionId]);

  // Clear pending content once the real message appears from the DB
  useEffect(() => {
    if (pendingContent && messages) {
      const alreadySaved = messages.some(
        (m) => m.role === "user" && m.content === pendingContent,
      );
      if (alreadySaved) {
        setPendingContent(null);
      }
    }
  }, [messages, pendingContent]);

  useEffect(() => {
    if (displayMessages.length > 0) {
      if (!isHere) {
        // First load, don't type anything, just mark the last message as seen
        lastProcessedMessageIdRef.current =
          displayMessages[displayMessages.length - 1]._id;
        setIsHere(true);
        return;
      }

      const lastMsg = displayMessages[displayMessages.length - 1];
      if (lastMsg._id !== lastProcessedMessageIdRef.current) {
        lastProcessedMessageIdRef.current = lastMsg._id;
        if (lastMsg.role === "snoopa" && lastMsg.type !== "watchlist") {
          setTypingMessageId(lastMsg._id);
        }
      }
    }
  }, [displayMessages, isHere]); // Added isHere to dependencies

  // Remove old timer effect — snoopingText is now set based on detected intent

  const handleSend = async () => {
    if (!input.trim() || sending || typingMessageId) return;

    // Reset manual-scroll override so auto-scroll resumes for the new message
    userHasScrolled.current = false;

    const content = input.trim();
    setInput("");
    setPendingContent(content); // Optimistic: show message immediately

    // Scroll to the new user message after it renders
    setTimeout(() => scrollToLastUserMessage(), 200);
    setSending(true);
    setSnoopingText("Snooping"); // Default while we detect intent

    try {
      // Detect intent first so we can show a contextual loading message
      const intent = await detectIntent({ content });

      // Update loading text based on detected intent
      if (intent === "SEARCH") {
        setSnoopingText("Snooping the web");
      } else if (intent === "WATCHLIST") {
        setSnoopingText("Setting up watchlist");
      } else {
        setSnoopingText("Snooping");
      }

      const result = (await sendMessage({
        session_id: sessionId ?? undefined,
        content,
        intent,
      })) as { response: string; session_id: string };

      // If this was a new session, navigate to it
      if (!sessionId && result?.session_id) {
        navigation.setParams({ sessionId: result.session_id });
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  const isBusy = sending || typingMessageId !== null;
  const isLoading =
    sessionId && messages === undefined && displayMessages.length === 0;

  // Delimiter function
  const extractConfirmationMessage = (content: string) => {
    const delimiterIndex = content.indexOf("---WATCHLIST_DATA---");
    if (delimiterIndex !== -1) {
      return content.substring(0, delimiterIndex).trim();
    }
    return content;
  };

  // Handle save
  const handleSaveWatchlist = async (
    msgId: Id<"chats">,
    watchlistData: {
      title: string;
      keywords: string[];
      condition: string;
      canonical_topic?: string;
      tier?: number;
    },
    sessionId: Id<"sessions">,
  ) => {
    if (savedWatchlist[msgId] || savingWatchlist[msgId] || !signedIn?._id)
      return;

    setSavingWatchlist((prev) => ({
      ...prev,
      [msgId]: true,
    }));

    try {
      await addWatchlist({
        user_id: signedIn._id,
        title: watchlistData.title,
        keywords: watchlistData.keywords,
        condition: watchlistData.condition,
        canonical_topic: watchlistData.canonical_topic,
        tier: watchlistData.tier,
        message_id: msgId,
        session_id: sessionId,
      });

      setSavedWatchlist((prev) => ({
        ...prev,
        [msgId]: true,
      }));
    } catch (error) {
      console.error("Failed to save watchlist:", error);
    } finally {
      setSavingWatchlist((prev) => ({
        ...prev,
        [msgId]: false,
      }));
    }
  };

  return (
    <Container>
      {/* Header */}
      <View
        style={{
          paddingVertical: 20,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Pressable onPress={() => navigation.openDrawer()}>
          <Image
            source={require("@/assets/icons/bars.png")}
            style={{ width: 22, height: 22, tintColor: Colors[theme].text }}
          />
        </Pressable>
        <View style={{ flex: 1, paddingHorizontal: 15, alignItems: "center" }}>
          <Text
            numberOfLines={1}
            style={{
              color: Colors[theme].text,
              fontFamily: "FontBold",
              fontSize: 18,
              letterSpacing: -0.5,
              width: 220,
              textAlign: "center",
            }}
          >
            {session?.title || "Snoopa"}
          </Text>
        </View>
        <Pressable
          onPress={() => navigation.push("notifications/index")}
          style={{ position: "relative" }}
        >
          <Image
            source={require("@/assets/icons/bells.png")}
            style={{ width: 25, height: 25, tintColor: Colors[theme].text }}
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
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollToLastUserMessage()}
        onScrollBeginDrag={() => {
          userHasScrolled.current = true;
        }}
      >
        {isLoading ? (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <View style={{ width: "100%", alignItems: "center" }}>
              <Image
                source={require("@/assets/images/splash-icon.png")}
                style={{
                  height: 80,
                  width: 80,
                  opacity: 0.5,
                  marginBottom: 20,
                }}
              />
              <Text
                style={{
                  color: Colors[theme].text_secondary,
                  fontFamily: "FontMedium",
                  fontSize: 16,
                }}
              >
                Getting chat ready...
              </Text>
            </View>
          </View>
        ) : displayMessages.length === 0 && !sending ? (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <View
              style={{
                width: "100%",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Image
                source={require("@/assets/images/splash-icon.png")}
                style={{ height: 150, width: 150, alignSelf: "center" }}
              />
              <Text
                style={{
                  color: Colors[theme].text,
                  fontFamily: "FontBold",
                  fontSize: 22,
                  textAlign: "center",
                  marginTop: 20,
                  width: "90%",
                }}
              >
                I’ve got the scent. What am I tracking today?
              </Text>
            </View>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 10 }}>
            {displayMessages.map((msg) => {
              if (msg.role === "user") {
                const isExpanded = expandedUserMessages[msg._id] || false;
                const isTruncated = truncatedUserMessages[msg._id] || false;
                return (
                  <View
                    key={msg._id}
                    onLayout={(e) => {
                      userMessageYPositions.current.set(
                        msg._id,
                        e.nativeEvent.layout.y,
                      );
                    }}
                    style={[
                      styles.user_chat,
                      { backgroundColor: Colors[theme].surface },
                    ]}
                  >
                    <View style={{ position: "relative" }}>
                      <Text
                        numberOfLines={
                          isTruncated && !isExpanded ? 5 : undefined
                        }
                        onTextLayout={(e) => {
                          if (
                            !truncatedUserMessages[msg._id] &&
                            e.nativeEvent.lines.length > 5
                          ) {
                            setTruncatedUserMessages((prev) => ({
                              ...prev,
                              [msg._id]: true,
                            }));
                          }
                        }}
                        style={{
                          color: Colors[theme].text,
                          fontFamily: "FontRegular",
                          fontSize: 15,
                          lineHeight: 22,
                        }}
                      >
                        {msg.content}
                      </Text>

                      {/* Fade overlay when collapsed and text is long */}
                      {isTruncated && !isExpanded && (
                        <View
                          pointerEvents="none"
                          style={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: 25,
                          }}
                        >
                          {/* Simulated gradient: 5 strips from transparent → surface */}
                          {[0, 0.3, 0.5, 0.7].map((opacity, i) => (
                            <View
                              key={i}
                              style={{
                                flex: 1,
                                backgroundColor: Colors[theme].surface,
                                opacity,
                              }}
                            />
                          ))}
                        </View>
                      )}
                    </View>

                    {/* View more / View less toggle */}
                    {isTruncated && (
                      <Pressable
                        onPress={() =>
                          setExpandedUserMessages((prev) => ({
                            ...prev,
                            [msg._id]: !prev[msg._id],
                          }))
                        }
                        style={{ marginTop: 6 }}
                      >
                        <Text
                          style={{
                            color: Colors[theme].text_secondary,
                            fontFamily: "FontMedium",
                            fontSize: 13,
                            textAlign: "right",
                          }}
                        >
                          {isExpanded ? "View less" : "View more"}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                );
              }

              // Snoopa Messages
              return (
                <View key={msg._id} style={styles.snoopa_container}>
                  {msg.type === "watchlist" ? (
                    <>
                      {/* Confirmation Message (Regular Chat Style) */}
                      <View
                        style={[
                          styles.snoopa_bubble,
                          { backgroundColor: "transparent" },
                        ]}
                      >
                        <SnoopaHead />

                        {typingMessageId === msg._id ? (
                          <TypeWriter
                            content={msg.content}
                            onComplete={() => setTypingMessageId(null)}
                            speed={10}
                          />
                        ) : (
                          <FormatText>
                            {extractConfirmationMessage(msg.content)}
                          </FormatText>
                        )}
                      </View>

                      {/* Watchlist Card */}
                      {(() => {
                        try {
                          const delimiterIndex = msg.content.indexOf(
                            "---WATCHLIST_DATA---",
                          );
                          if (delimiterIndex !== -1) {
                            const jsonStr = msg.content
                              .substring(delimiterIndex + 20)
                              .trim();
                            const watchlistData = JSON.parse(jsonStr);

                            const isSaving = savingWatchlist[msg._id] || false;
                            const isSaved = savedWatchlist[msg._id] || false;

                            return (
                              <View
                                style={[
                                  styles.status_card,
                                  {
                                    backgroundColor: Colors[theme].surface,
                                    borderColor: Colors[theme].border,
                                    marginTop: 12,
                                  },
                                ]}
                              >
                                <View
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    marginBottom: 10,
                                    gap: 6,
                                  }}
                                >
                                  <Image
                                    source={require("@/assets/icons/eyes.png")}
                                    style={{
                                      width: 14,
                                      height: 14,
                                      tintColor: Colors[theme].primary,
                                    }}
                                  />
                                  <Text
                                    style={{
                                      color: Colors[theme].primary,
                                      fontSize: 11,
                                      fontFamily: "FontBold",
                                      textTransform: "uppercase",
                                      letterSpacing: 0.5,
                                    }}
                                  >
                                    WATCHLIST ITEM
                                  </Text>
                                </View>

                                <Text
                                  style={{
                                    color: Colors[theme].text,
                                    fontFamily: "FontBold",
                                    fontSize: 16,
                                    marginBottom: 8,
                                    letterSpacing: -0.3,
                                  }}
                                >
                                  {watchlistData.title}
                                </Text>

                                {/* Toggle Details Button */}
                                <Pressable
                                  onPress={() =>
                                    setExpandedWatchlist((prev) => ({
                                      ...prev,
                                      [msg._id]: !prev[msg._id],
                                    }))
                                  }
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "flex-end",
                                    gap: 4,
                                  }}
                                >
                                  <Text
                                    style={{
                                      color: Colors[theme].primary,
                                      fontFamily: "FontMedium",
                                      fontSize: 13,
                                    }}
                                  >
                                    View Details
                                  </Text>
                                  <Image
                                    source={require("@/assets/icons/chevron-up.png")}
                                    style={{
                                      width: 12,
                                      height: 12,
                                      tintColor: Colors[theme].primary,
                                      transform: [
                                        {
                                          rotate: expandedWatchlist[msg._id]
                                            ? "0deg"
                                            : "180deg",
                                        },
                                      ],
                                    }}
                                  />
                                </Pressable>

                                {/* Collapsible Details */}
                                {expandedWatchlist[msg._id] && (
                                  <View style={{ marginTop: 12, gap: 10 }}>
                                    <View>
                                      <Text
                                        style={{
                                          color: Colors[theme].text_secondary,
                                          fontFamily: "FontBold",
                                          fontSize: 11,
                                          textTransform: "uppercase",
                                          letterSpacing: 0.5,
                                          marginBottom: 4,
                                        }}
                                      >
                                        Condition
                                      </Text>
                                      <Text
                                        style={{
                                          color: Colors[theme].text,
                                          fontFamily: "FontRegular",
                                          fontSize: 13,
                                          lineHeight: 18,
                                        }}
                                      >
                                        {watchlistData.condition}
                                      </Text>
                                    </View>
                                  </View>
                                )}

                                <Pressable
                                  onPress={() =>
                                    handleSaveWatchlist(
                                      msg._id,
                                      watchlistData,
                                      sessionId!,
                                    )
                                  }
                                  disabled={isSaved || isSaving}
                                  style={{
                                    backgroundColor: Colors[theme].primary,
                                    paddingVertical: 12,
                                    marginTop: 20,
                                    borderRadius: 10,
                                    alignItems: "center",
                                    flexDirection: "row",
                                    justifyContent: "center",
                                    gap: 8,
                                    opacity: isSaved ? 0.7 : 1,
                                  }}
                                >
                                  {isSaving && (
                                    <ActivityIndicator
                                      size="small"
                                      color={Colors[theme].background}
                                    />
                                  )}
                                  <Text
                                    style={{
                                      color: Colors[theme].background,
                                      fontFamily: "FontBold",
                                      fontSize: 14,
                                    }}
                                  >
                                    {isSaved
                                      ? "Saved!"
                                      : isSaving
                                        ? "Saving..."
                                        : "Save to Watchlist"}
                                  </Text>
                                </Pressable>
                              </View>
                            );
                          }
                        } catch (e) {
                          console.error("Failed to parse watchlist data:", e);
                          return null;
                        }
                        return null;
                      })()}
                    </>
                  ) : (
                    <View
                      style={[
                        styles.snoopa_bubble,
                        { backgroundColor: "transparent" },
                      ]}
                    >
                      <SnoopaHead />
                      {typingMessageId === msg._id ? (
                        <TypeWriter
                          content={msg.content}
                          onComplete={() => setTypingMessageId(null)}
                          speed={10}
                        />
                      ) : (
                        <FormatText>{msg.content}</FormatText>
                      )}
                    </View>
                  )}
                </View>
              );
            })}

            {/* Snooping... Indicator */}
            {sending && (
              <View style={styles.snoopa_container}>
                <View
                  style={[
                    styles.snoopa_bubble,
                    { backgroundColor: "transparent" },
                  ]}
                >
                  <SnoopingIndicator text={snoopingText} />
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Chat text input */}
      <KeyboardStickyView offset={{ opened: 70, closed: 0 }}>
        <View
          style={{
            width: "100%",
            backgroundColor: Colors[theme].card,
            borderRadius: 20,
            padding: 10,
            borderWidth: 1,
            borderColor: Colors[theme].border,
          }}
        >
          <TextInput
            multiline
            value={input}
            onChangeText={setInput}
            placeholder={isBusy ? "Snooping..." : "Talk to me boss..."}
            placeholderTextColor={Colors[theme].text_secondary}
            editable={!isBusy}
            style={{
              backgroundColor: "transparent",
              width: "100%",
              maxHeight: 100,
              color: Colors[theme].text,
              fontFamily: "FontMedium",
              fontSize: 15,
              marginBottom: 10,
              paddingHorizontal: 5,
            }}
          />
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View style={{ flexDirection: "row", gap: 15, paddingLeft: 5 }}>
              <Pressable>
                <Image
                  source={require("@/assets/icons/sliders.png")}
                  style={{
                    width: 22,
                    height: 22,
                    tintColor: Colors[theme].text_secondary,
                  }}
                />
              </Pressable>
            </View>

            <Pressable
              onPress={handleSend}
              disabled={isBusy || !input.trim()}
              style={{
                padding: 3,
                backgroundColor: Colors[theme].text,
                opacity: input && !isBusy ? 1 : 0.5,
                borderRadius: 20,
              }}
            >
              <Image
                source={require("@/assets/icons/arrow-up.png")}
                style={{
                  width: 20,
                  height: 20,
                  tintColor: Colors[theme].background,
                }}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardStickyView>
    </Container>
  );
}

const SnoopingIndicator = ({ text }: { text: string }) => {
  const { theme } = useTheme();

  // Animated dots: . → .. → ...
  const dot2Opacity = useSharedValue(0);
  const dot3Opacity = useSharedValue(0);

  useEffect(() => {
    dot2Opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 400 }),
        withTiming(1, { duration: 400 }),
        withTiming(1, { duration: 400 }),
        withTiming(0, { duration: 400 }),
      ),
      -1,
    );
    dot3Opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 400 }),
        withTiming(1, { duration: 400 }),
        withTiming(0, { duration: 400 }),
        withTiming(0, { duration: 400 }),
      ),
      -1,
    );
  }, []);

  const dot2Style = useAnimatedStyle(() => ({ opacity: dot2Opacity.value }));
  const dot3Style = useAnimatedStyle(() => ({ opacity: dot3Opacity.value }));

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 4,
        gap: 8,
      }}
    >
      {/* Logo */}
      <View
        style={{
          width: 28,
          height: 28,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Image
          source={require("@/assets/images/splash-icon.png")}
          style={[styles.snoopa_logo, { borderColor: Colors[theme].border }]}
        />
      </View>

      {/* "Snooping" + animated dots */}
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        <Text
          style={{
            fontFamily: "FontBold",
            fontSize: 13,
            color: Colors[theme].text_secondary,
          }}
        >
          {text}
        </Text>
        <Text
          style={{
            fontFamily: "FontBold",
            fontSize: 16,
            lineHeight: 18,
            color: Colors[theme].text_secondary,
          }}
        >
          .
        </Text>
        <Animated.Text
          style={[
            {
              fontFamily: "FontBold",
              fontSize: 16,
              lineHeight: 18,
              color: Colors[theme].text_secondary,
            },
            dot2Style,
          ]}
        >
          .
        </Animated.Text>
        <Animated.Text
          style={[
            {
              fontFamily: "FontBold",
              fontSize: 16,
              lineHeight: 18,
              color: Colors[theme].text_secondary,
            },
            dot3Style,
          ]}
        >
          .
        </Animated.Text>
      </View>
    </View>
  );
};

const SnoopaHead = () => {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 4,
        gap: 8,
      }}
    >
      <Image
        source={require("@/assets/images/splash-icon.png")}
        style={[styles.snoopa_logo, { borderColor: Colors[theme].border }]}
      />
      <Text
        style={{
          fontFamily: "FontBold",
          fontSize: 13,
          color: Colors[theme].text_secondary,
        }}
      >
        Snoopa
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  user_chat: {
    maxWidth: "90%",
    borderRadius: 20,
    borderBottomRightRadius: 4,
    alignSelf: "flex-end",
    padding: 16,
    marginBottom: 20,
  },
  snoopa_container: {
    marginBottom: 25,
    maxWidth: "95%",
  },
  snoopa_logo: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  snoopa_bubble: {
    flex: 1,
  },
  status_card: {
    flex: 1,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginTop: 2,
  },
});

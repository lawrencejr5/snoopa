import Container from "@/components/Container";
import TypeWriter from "@/components/TypeWriter";
import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRoute } from "@react-navigation/native";
import { useAction, useMutation, useQuery } from "convex/react";
import { useNavigation } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { TextInput } from "react-native-gesture-handler";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import Markdown from "react-native-markdown-display";

export default function ChatScreen() {
  const { theme } = useTheme();
  const [input, setInput] = useState<string>("");
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const scrollViewRef = useRef<ScrollView>(null);

  const sessionId = route.params?.sessionId as Id<"sessions"> | undefined;

  const messages = useQuery(
    api.chat.get_messages,
    sessionId ? { session_id: sessionId } : "skip",
  );
  const createSession = useMutation(api.session.create_session);
  const sendMessage = useAction(api.chat.send_message);

  const [sending, setSending] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState<Id<"chats"> | null>(
    null,
  );
  const lastProcessedMessageIdRef = useRef<string | null>(null);
  const [isHere, setIsHere] = useState(false);

  // Check if we are loading messages for an existing session
  const isLoading = sessionId && messages === undefined;

  // Use this effect to reset internal state when switching sessions
  useEffect(() => {
    setIsHere(false);
    setTypingMessageId(null);
    lastProcessedMessageIdRef.current = null;
  }, [sessionId]);

  // If messages is undefined (loading) or empty array, we handle it.
  const displayMessages = useMemo(() => messages || [], [messages]);

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
        if (lastMsg.role === "snoopa" && lastMsg.type !== "status") {
          setTypingMessageId(lastMsg._id);
        }
      }
    }
  }, [displayMessages, isHere]); // Added isHere to dependencies

  const handleSend = async () => {
    if (!input.trim() || sending || typingMessageId) return;

    const content = input.trim();
    setInput("");
    setSending(true);

    try {
      let currentSessionId = sessionId;

      if (!currentSessionId) {
        // Create session with first user message as title (truncated)
        const title =
          content.length > 30 ? content.substring(0, 27) + "..." : content;
        currentSessionId = await createSession({ title });

        // Update navigation params so we stay in this session
        navigation.setParams({ sessionId: currentSessionId });
      }

      await sendMessage({
        session_id: currentSessionId!,
        content,
      });
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      // We keep 'sending' true until the typing starts?
      // Actually, once this returns, the message is in the DB.
      // The effect above will catch the new message and set typingMessageId.
      setSending(false);
    }
  };

  const isBusy = sending || typingMessageId !== null;

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
        <Text
          style={{
            color: Colors[theme].text,
            fontFamily: "FontBold",
            fontSize: 18,
            letterSpacing: -0.5,
          }}
        >
          Snoopa
        </Text>
        <Pressable onPress={() => navigation.push("notifications/index")}>
          <Image
            source={require("@/assets/icons/bells.png")}
            style={{ width: 25, height: 25, tintColor: Colors[theme].text }}
          />
        </Pressable>
      </View>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() =>
          scrollViewRef.current?.scrollToEnd({ animated: true })
        }
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
            <View style={{ width: "100%" }}>
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
                return (
                  <View
                    key={msg._id}
                    style={[
                      styles.user_chat,
                      { backgroundColor: Colors[theme].surface },
                    ]}
                  >
                    <Text
                      style={{
                        color: Colors[theme].text,
                        fontFamily: "FontRegular",
                        fontSize: 15,
                        lineHeight: 22,
                      }}
                    >
                      {msg.content}
                    </Text>
                  </View>
                );
              }

              // Snoopa Messages
              return (
                <View key={msg._id} style={styles.snoopa_container}>
                  {msg.type === "status" ? (
                    <View
                      style={[
                        styles.status_card,
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
                          marginBottom: 8,
                          gap: 6,
                        }}
                      >
                        <Image
                          source={require("@/assets/icons/eyes.png")}
                          style={{
                            width: 14,
                            height: 14,
                            tintColor: Colors[theme].text_secondary,
                          }}
                        />
                        <Text
                          style={{
                            color: Colors[theme].text_secondary,
                            fontSize: 11,
                            fontFamily: "FontBold",
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                          }}
                        >
                          STATUS UPDATE
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: Colors[theme].text,
                          fontFamily: "FontMedium",
                          fontSize: 14,
                          lineHeight: 20,
                        }}
                      >
                        {msg.content}
                      </Text>
                      <Pressable
                        style={{
                          marginTop: 15,
                          backgroundColor: Colors[theme].primary,
                          paddingVertical: 10,
                          borderRadius: 10,
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: Colors[theme].background,
                            fontFamily: "FontBold",
                            fontSize: 13,
                          }}
                        >
                          View watch list
                        </Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.snoopa_bubble,
                        { backgroundColor: "transparent" },
                      ]}
                    >
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
                          style={[
                            styles.snoopa_logo,
                            { borderColor: Colors[theme].border },
                          ]}
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
                      {typingMessageId === msg._id ? (
                        <TypeWriter
                          content={msg.content}
                          onComplete={() => setTypingMessageId(null)}
                          speed={5}
                        />
                      ) : (
                        <Markdown
                          style={{
                            body: {
                              color: Colors[theme].text,
                              fontFamily: "FontRegular",
                              fontSize: 15,
                              lineHeight: 24,
                            },
                            heading1: {
                              color: Colors[theme].text,
                              fontFamily: "FontBold",
                              fontSize: 22,
                              marginBottom: 10,
                            },
                            heading2: {
                              color: Colors[theme].text,
                              fontFamily: "FontBold",
                              fontSize: 20,
                              marginBottom: 10,
                            },
                            strong: {
                              fontFamily: "FontBold",
                              color: Colors[theme].text,
                            },
                            bullet_list: {
                              marginBottom: 10,
                            },
                            ordered_list: {
                              marginBottom: 10,
                            },
                            code_inline: {
                              backgroundColor: Colors[theme].surface,
                              color: Colors[theme].primary,
                              fontFamily: "FontMedium",
                            },
                            fence: {
                              backgroundColor: Colors[theme].surface,
                              borderColor: Colors[theme].border,
                              borderWidth: 1,
                              padding: 10,
                              color: Colors[theme].text,
                            },
                          }}
                        >
                          {msg.content}
                        </Markdown>
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
                      style={[
                        styles.snoopa_logo,
                        { borderColor: Colors[theme].border },
                      ]}
                    />
                    <Text
                      style={{
                        fontFamily: "FontBold",
                        fontSize: 13,
                        color: Colors[theme].text_secondary,
                      }}
                    >
                      Snooping...
                    </Text>
                  </View>
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
                    width: 20,
                    height: 20,
                    tintColor: Colors[theme].text_secondary,
                  }}
                />
              </Pressable>
            </View>

            <Pressable
              onPress={handleSend}
              disabled={isBusy || !input.trim()}
              style={{
                padding: 6,
              }}
            >
              <Image
                source={require("@/assets/icons/arrow-up.png")}
                style={{
                  width: 22,
                  height: 22,
                  tintColor: Colors[theme].text,
                  opacity: input && !isBusy ? 1 : 0.5,
                }}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardStickyView>
    </Container>
  );
}

const styles = StyleSheet.create({
  user_chat: {
    maxWidth: "80%",
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

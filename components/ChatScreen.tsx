import Container from "@/components/Container";
import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRoute } from "@react-navigation/native";
import { useAction, useMutation, useQuery } from "convex/react";
import { useNavigation } from "expo-router";
import { useRef, useState } from "react";
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
  const createSession = useMutation(api.chat.create_session);
  const sendMessage = useAction(api.chat.send_message);

  const [sending, setSending] = useState(false);

  // If messages is undefined (loading) or empty array, we handle it.
  const displayMessages = messages || [];

  const handleSend = async () => {
    if (!input.trim() || sending) return;

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
      setSending(false);
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
        {displayMessages.length === 0 ? (
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
                      <Text
                        style={{
                          color: Colors[theme].text,
                          fontFamily: "FontRegular",
                          lineHeight: 24,
                          fontSize: 15,
                        }}
                      >
                        {msg.content}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
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
            placeholder="Talk to me boss..."
            placeholderTextColor={Colors[theme].text_secondary}
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
              disabled={sending || !input.trim()}
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
                  opacity: input && !sending ? 1 : 0.5,
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

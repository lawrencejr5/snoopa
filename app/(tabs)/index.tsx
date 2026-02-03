import Container from "@/components/Container";
import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { useState } from "react";
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

import { conversation } from "@/dummy_data/conversation";

export default function TabOneScreen() {
  const { theme } = useTheme();

  const [input, setInput] = useState<string>("");

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
        <Pressable>
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
          }}
        >
          Snoopa
        </Text>
        <Pressable>
          <Image
            source={require("@/assets/icons/bells.png")}
            style={{ width: 25, height: 25, tintColor: Colors[theme].text }}
          />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {conversation.length === 0 ? (
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
            {conversation.map((msg) => {
              if (msg.role === "user") {
                return (
                  <View
                    key={msg.id}
                    style={[
                      styles.user_chat,
                      { backgroundColor: Colors[theme].surface },
                    ]}
                  >
                    <Text
                      style={{
                        color: Colors[theme].text,
                        fontFamily: "FontMedium",
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
                <View key={msg.id} style={styles.snoopa_container}>
                  {msg.type === "status" ? (
                    <View
                      style={[
                        styles.status_card,
                        {
                          marginTop: 10,
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
                          SCENT CAUGHT
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
                      <Text
                        style={{
                          color: Colors[theme].text,
                          fontFamily: "FontMedium",
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
            borderRadius: 15,
            padding: 10,
          }}
        >
          <TextInput
            multiline
            value={input}
            onChangeText={setInput}
            placeholder="Talk to me boss..."
            style={{
              backgroundColor: "transparent",
              width: "100%",
              maxHeight: 80,
              color: Colors[theme].text,
              fontFamily: "FontMedium",
              fontSize: 15,
              marginBottom: 10,
            }}
          />
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Pressable style={{ padding: 5 }}>
              <Image
                source={require("@/assets/icons/sliders.png")}
                style={{ width: 15, height: 15, tintColor: Colors[theme].text }}
              />
            </Pressable>
            <Pressable style={{ padding: 5 }}>
              <Image
                source={require("@/assets/icons/arrow-up.png")}
                style={{
                  width: 22,
                  height: 22,
                  tintColor: Colors[theme].text,
                  opacity: input.length === 0 ? 0.5 : 1,
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
    borderRadius: 16,
    borderBottomRightRadius: 2,
    alignSelf: "flex-end",
    padding: 15,
    marginBottom: 15,
  },
  snoopa_container: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
    gap: 12,
    maxWidth: "95%",
  },

  snoopa_bubble: {
    flex: 1,
    paddingTop: 5,
  },
  status_card: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginTop: 2,
  },
});

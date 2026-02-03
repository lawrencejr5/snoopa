import Container from "@/components/Container";
import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { TextInput } from "react-native-gesture-handler";
import { KeyboardStickyView } from "react-native-keyboard-controller";

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

        <Pressable>
          <Image
            source={require("@/assets/icons/bells.png")}
            style={{ width: 25, height: 25, tintColor: Colors[theme].text }}
          />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <View style={{ width: "100%" }}>
            <Image
              source={require("@/assets/images/splash-icon.png")}
              style={{ height: 150, width: 150 }}
            />
            <Text
              style={{
                color: Colors[theme].text,
                fontFamily: "NunitoExtraBold",
                fontSize: 22,
              }}
            >
              Eyes open. What should I be watching for you?
            </Text>
          </View>
        </View>
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
              fontFamily: "NunitoMedium",
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

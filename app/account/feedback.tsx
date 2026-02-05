import Container from "@/components/Container";
import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function FeedbackScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const submitFeedback = () => {
    if (!feedback) {
      Alert.alert(
        "Empty Feedback",
        "Please describe your issue or suggestion.",
      );
      return;
    }
    Alert.alert(
      "Feedback Sent",
      "Thank you for your report. We'll look into it.",
    );
    router.back();
  };

  return (
    <Container>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Image
            source={require("@/assets/icons/arrow-up.png")}
            style={{
              width: 30,
              height: 30,
              tintColor: Colors[theme].text,
              transform: [{ rotate: "-90deg" }],
            }}
          />
        </Pressable>
        <Text style={[styles.headerTitle, { color: Colors[theme].text }]}>
          Report & Feedback
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <Text
          style={{
            fontFamily: "FontRegular",
            fontSize: 16,
            color: Colors[theme].text_secondary,
            marginBottom: 20,
            lineHeight: 24,
          }}
        >
          We value your input. Let us know if something isn't working or if you
          have an idea for Snoopa.
        </Text>

        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: Colors[theme].surface,
              borderColor: Colors[theme].border,
            },
          ]}
        >
          <TextInput
            style={[styles.textArea, { color: Colors[theme].text }]}
            multiline
            placeholder="Describe the issue or feedback..."
            placeholderTextColor={Colors[theme].text_secondary}
            numberOfLines={8}
            textAlignVertical="top"
            value={feedback}
            onChangeText={setFeedback}
          />
        </View>

        {/* Image Attachment */}
        <View style={{ marginBottom: 30 }}>
          <Text
            style={{
              fontFamily: "FontBold",
              fontSize: 14,
              color: Colors[theme].text,
              marginBottom: 10,
            }}
          >
            Attachments
          </Text>

          {image ? (
            <View style={{ position: "relative", alignSelf: "flex-start" }}>
              <Image
                source={{ uri: image }}
                style={{ width: 100, height: 100, borderRadius: 12 }}
              />
              <Pressable
                onPress={() => setImage(null)}
                style={{
                  position: "absolute",
                  top: -5,
                  right: -5,
                  backgroundColor: Colors[theme].background,
                  borderRadius: 10,
                }}
              >
                <Image
                  source={require("@/assets/icons/times.png")}
                  style={{
                    width: 20,
                    height: 20,
                    tintColor: Colors[theme].danger,
                  }}
                />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={pickImage}
              style={[
                styles.attachButton,
                { borderColor: Colors[theme].border },
              ]}
            >
              <Image
                source={require("@/assets/icons/card.png")}
                style={{
                  width: 24,
                  height: 24,
                  tintColor: Colors[theme].text_secondary,
                }}
              />
              <Text
                style={{
                  fontFamily: "FontMedium",
                  color: Colors[theme].text_secondary,
                }}
              >
                Attach Screenshot
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      {/* Fixed Footer */}
      <View style={{ paddingBottom: 20 }}>
        <Pressable
          onPress={submitFeedback}
          style={[
            styles.submitButton,
            { backgroundColor: Colors[theme].primary },
          ]}
        >
          <Text
            style={{
              color: Colors[theme].background,
              fontFamily: "FontBold",
              fontSize: 16,
            }}
          >
            Submit Report
          </Text>
        </Pressable>
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginBottom: 10,
  },
  backButton: {
    padding: 5,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "FontBold",
    letterSpacing: -0.5,
  },
  inputContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 15,
    marginBottom: 20,
  },
  textArea: {
    fontFamily: "FontRegular",
    fontSize: 16,
    minHeight: 150,
  },
  attachButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 15,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
    justifyContent: "center",
  },
  submitButton: {
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
  },
});

import Container from "@/components/Container";
import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useCustomAlert } from "@/context/CustomAlertContext";

export default function FeedbackScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const user = useQuery(api.users.get_current_user);
  const generateUploadUrl = useAction(api.feedback.generateUploadUrl);
  const submitFeedbackMutation = useMutation(api.feedback.submit_feedback);
  const { showCustomAlert } = useCustomAlert();

  const [images, setImages] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      allowsEditing: true,
      aspect: [3, 4], // Portrait
      quality: 1,
    });

    if (!result.canceled) {
      const newUris = result.assets.map((asset) => asset.uri);
      setImages([...images, ...newUris]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const submitFeedback = async () => {
    if (!feedback.trim()) {
      showCustomAlert("Please describe your issue or suggestion.", "warning");
      return;
    }

    if (!user) {
      showCustomAlert("You must be logged in to send feedback.", "danger");
      return;
    }

    setIsSubmitting(true);
    try {
      let storageIds: any[] = [];

      // 1. Upload all images
      if (images.length > 0) {
        await Promise.all(
          images.map(async (uri) => {
            const postUrl = await generateUploadUrl();
            const response = await fetch(uri);
            const blob = await response.blob();

            const uploadResponse = await fetch(postUrl, {
              method: "POST",
              headers: { "Content-Type": blob.type },
              body: blob,
            });

            const { storageId } = await uploadResponse.json();
            storageIds.push(storageId);
          }),
        );
      }

      // 2. Submit feedback
      await submitFeedbackMutation({
        user_id: user._id,
        content: feedback.trim(),
        images: storageIds.length > 0 ? storageIds : undefined,
      });

      showCustomAlert(
        "Thank you for your report. We'll look into it.",
        "success",
      );
      router.back();
    } catch (error) {
      console.error("Feedback submission error:", error);
      showCustomAlert("Failed to send feedback. Please try again later.", "danger");
    } finally {
      setIsSubmitting(false);
    }
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
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={Keyboard.dismiss} style={{ flex: 1 }}>
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
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <Text
              style={{
                fontFamily: "FontBold",
                fontSize: 14,
                color: Colors[theme].text,
              }}
            >
              Attachments ({images.length})
            </Text>
            {images.length > 0 && (
              <Pressable onPress={pickImage}>
                <Text
                  style={{
                    fontFamily: "FontMedium",
                    color: Colors[theme].primary,
                    fontSize: 14,
                  }}
                >
                  Add More
                </Text>
              </Pressable>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {images.map((uri, index) => (
                <View key={index} style={{ position: "relative" }}>
                  <Image
                    source={{ uri }}
                    style={{
                      width: 100,
                      height: 133, // Portrait ratio (3:4)
                      borderRadius: 12,
                    }}
                  />
                  <Pressable
                    onPress={() => removeImage(index)}
                    style={{
                      position: "absolute",
                      top: -5,
                      right: -5,
                      backgroundColor: Colors[theme].background,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: Colors[theme].border,
                    }}
                  >
                    <Image
                      source={require("@/assets/icons/times.png")}
                      style={{
                        width: 18,
                        height: 18,
                        tintColor: Colors[theme].danger,
                      }}
                    />
                  </Pressable>
                </View>
              ))}

              {images.length === 0 && (
                <Pressable
                  onPress={pickImage}
                  style={[
                    styles.attachButton,
                    {
                      borderColor: Colors[theme].border,
                    },
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
                    Attach Screenshots
                  </Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        </View>
        </Pressable>
      </ScrollView>

      {/* Fixed Footer */}
      <View style={{ paddingBottom: 20 }}>
        <Pressable
          onPress={submitFeedback}
          disabled={isSubmitting}
          style={[
            styles.submitButton,
            {
              backgroundColor: Colors[theme].primary,
              opacity: isSubmitting ? 0.7 : 1,
            },
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color={Colors[theme].background} />
          ) : (
            <Text
              style={{
                color: Colors[theme].background,
                fontFamily: "FontBold",
                fontSize: 16,
              }}
            >
              Submit Report
            </Text>
          )}
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

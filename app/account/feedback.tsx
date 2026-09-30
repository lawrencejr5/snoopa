import Container from "@/components/Container";
import Colors from "@/constants/Colors";
import { useCustomAlert } from "@/context/CustomAlertContext";
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
  Modal,
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
  const user = useQuery(api.users.get_current_user);
  const userFeedbacks = useQuery(
    api.feedback.get_user_feedbacks,
    user?._id ? { user_id: user._id } : "skip",
  );

  const generateUploadUrl = useAction(api.feedback.generateUploadUrl);
  const submitFeedbackMutation = useMutation(api.feedback.submit_feedback);
  const { showCustomAlert } = useCustomAlert();

  const [images, setImages] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");
  const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null);
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      allowsEditing: true,
      aspect: [3, 4],
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

      await submitFeedbackMutation({
        user_id: user._id,
        content: feedback.trim(),
        images: storageIds.length > 0 ? storageIds : undefined,
      });

      showCustomAlert(
        "Thank you for your report. We'll look into it.",
        "success",
      );
      setFeedback("");
      setImages([]);
      setActiveTab("history");
    } catch (error) {
      console.error("Feedback submission error:", error);
      showCustomAlert(
        "Failed to send feedback. Please try again later.",
        "danger",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "fulfilled":
        return {
          label: "Resolved",
          color: Colors[theme].success,
          bgColor: "rgba(106, 170, 102, 0.15)",
        };
      case "read":
        return {
          label: "Under Review",
          color: Colors[theme].milk,
          bgColor: "rgba(226, 226, 187, 0.15)",
        };
      case "unread":
      default:
        return {
          label: "Pending",
          color: Colors[theme].text_secondary,
          bgColor: "rgba(163, 163, 152, 0.15)",
        };
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

      {/* Tabs */}
      <View style={[styles.tabContainer, { borderColor: Colors[theme].border }]}>
        <Pressable
          onPress={() => setActiveTab("new")}
          style={[
            styles.tabButton,
            activeTab === "new" && {
              backgroundColor: Colors[theme].surface,
              borderColor: Colors[theme].border,
            },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "new"
                    ? Colors[theme].text
                    : Colors[theme].text_secondary,
                fontFamily: activeTab === "new" ? "FontBold" : "FontMedium",
              },
            ]}
          >
            Submit Feedback
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab("history")}
          style={[
            styles.tabButton,
            activeTab === "history" && {
              backgroundColor: Colors[theme].surface,
              borderColor: Colors[theme].border,
            },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === "history"
                      ? Colors[theme].text
                      : Colors[theme].text_secondary,
                  fontFamily: activeTab === "history" ? "FontBold" : "FontMedium",
                },
              ]}
            >
              Past Submissions
            </Text>
            {userFeedbacks && userFeedbacks.length > 0 && (
              <View
                style={[
                  styles.badgeCount,
                  { backgroundColor: Colors[theme].primary },
                ]}
              >
                <Text
                  style={{
                    color: Colors[theme].background,
                    fontSize: 11,
                    fontFamily: "FontBold",
                  }}
                >
                  {userFeedbacks.length}
                </Text>
              </View>
            )}
          </View>
        </Pressable>
      </View>

      {activeTab === "new" ? (
        <>
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
                  fontSize: 15,
                  color: Colors[theme].text_secondary,
                  marginBottom: 16,
                  lineHeight: 22,
                }}
              >
                We value your input. Let us know if something isn't working or if
                you have an idea for Snoopa.
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
                            height: 133,
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
        </>
      ) : (
        /* History Tab */
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 30, paddingTop: 10 }}
        >
          {userFeedbacks === undefined ? (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <ActivityIndicator color={Colors[theme].primary} />
            </View>
          ) : userFeedbacks.length === 0 ? (
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 60,
                gap: 12,
              }}
            >
              <Image
                source={require("@/assets/icons/feedback.png")}
                style={{
                  width: 48,
                  height: 48,
                  tintColor: Colors[theme].text_secondary,
                  opacity: 0.5,
                }}
              />
              <Text
                style={{
                  fontFamily: "FontBold",
                  fontSize: 16,
                  color: Colors[theme].text,
                }}
              >
                No Submissions Yet
              </Text>
              <Text
                style={{
                  fontFamily: "FontRegular",
                  fontSize: 14,
                  color: Colors[theme].text_secondary,
                  textAlign: "center",
                  maxWidth: 260,
                }}
              >
                Any feedback or bug reports you send to Snoopa will be tracked
                here.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {userFeedbacks.map((fb: any) => {
                const statusBadge = getStatusBadge(fb.status);
                const hasImages = fb.image_urls && fb.image_urls.length > 0;

                return (
                  <Pressable
                    key={fb._id}
                    onPress={() => setSelectedFeedback(fb)}
                    style={[
                      styles.card,
                      {
                        backgroundColor: Colors[theme].surface,
                        borderColor: Colors[theme].border,
                      },
                    ]}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 10,
                      }}
                    >
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: statusBadge.bgColor },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            { color: statusBadge.color },
                          ]}
                        >
                          {statusBadge.label}
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontFamily: "FontRegular",
                          fontSize: 12,
                          color: Colors[theme].text_secondary,
                        }}
                      >
                        {formatTimestamp(fb.timestamp || fb._creationTime)}
                      </Text>
                    </View>

                    <Text
                      numberOfLines={3}
                      style={{
                        fontFamily: "FontRegular",
                        fontSize: 15,
                        color: Colors[theme].text,
                        lineHeight: 22,
                        marginBottom: 10,
                      }}
                    >
                      {fb.content}
                    </Text>

                    {hasImages && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          marginTop: 4,
                        }}
                      >
                        <Image
                          source={require("@/assets/icons/card.png")}
                          style={{
                            width: 14,
                            height: 14,
                            tintColor: Colors[theme].text_secondary,
                          }}
                        />
                        <Text
                          style={{
                            fontFamily: "FontMedium",
                            fontSize: 12,
                            color: Colors[theme].text_secondary,
                          }}
                        >
                          {fb.image_urls.length}{" "}
                          {fb.image_urls.length === 1
                            ? "attachment"
                            : "attachments"}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* Details Modal */}
      <Modal
        visible={!!selectedFeedback}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedFeedback(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSelectedFeedback(null)}
          />
          {selectedFeedback && (
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: Colors[theme].background,
                  borderColor: Colors[theme].border,
                },
              ]}
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View>
                  <Text
                    style={[
                      styles.modalTitle,
                      { color: Colors[theme].text },
                    ]}
                  >
                    Feedback Details
                  </Text>
                  <Text
                    style={{
                      fontFamily: "FontRegular",
                      fontSize: 12,
                      color: Colors[theme].text_secondary,
                      marginTop: 2,
                    }}
                  >
                    {formatTimestamp(
                      selectedFeedback.timestamp || selectedFeedback._creationTime,
                    )}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setSelectedFeedback(null)}
                  style={[
                    styles.closeButton,
                    { backgroundColor: Colors[theme].surface },
                  ]}
                >
                  <Image
                    source={require("@/assets/icons/times.png")}
                    style={{
                      width: 16,
                      height: 16,
                      tintColor: Colors[theme].text,
                    }}
                  />
                </Pressable>
              </View>

              {/* Status Row */}
              <View style={{ marginBottom: 16, flexDirection: "row" }}>
                {(() => {
                  const badge = getStatusBadge(selectedFeedback.status);
                  return (
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: badge.bgColor },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: badge.color },
                        ]}
                      >
                        Status: {badge.label}
                      </Text>
                    </View>
                  );
                })()}
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: 350 }}
              >
                <Text
                  style={{
                    fontFamily: "FontRegular",
                    fontSize: 15,
                    color: Colors[theme].text,
                    lineHeight: 24,
                    marginBottom: 20,
                  }}
                >
                  {selectedFeedback.content}
                </Text>

                {/* Attachments Section in Modal */}
                {selectedFeedback.image_urls &&
                  selectedFeedback.image_urls.length > 0 && (
                    <View style={{ marginBottom: 15 }}>
                      <Text
                        style={{
                          fontFamily: "FontBold",
                          fontSize: 13,
                          color: Colors[theme].text_secondary,
                          marginBottom: 10,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        Attachments ({selectedFeedback.image_urls.length})
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                      >
                        <View style={{ flexDirection: "row", gap: 10 }}>
                          {selectedFeedback.image_urls.map(
                            (url: string, idx: number) => (
                              <Pressable
                                key={idx}
                                onPress={() => setExpandedImageUrl(url)}
                              >
                                <Image
                                  source={{ uri: url }}
                                  style={{
                                    width: 90,
                                    height: 120,
                                    borderRadius: 10,
                                    backgroundColor: Colors[theme].surface,
                                  }}
                                />
                              </Pressable>
                            ),
                          )}
                        </View>
                      </ScrollView>
                    </View>
                  )}
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>

      {/* Expanded Image Viewer Modal */}
      <Modal
        visible={!!expandedImageUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setExpandedImageUrl(null)}
      >
        <View style={styles.imageViewerOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setExpandedImageUrl(null)}
          />
          {expandedImageUrl && (
            <View style={{ width: "90%", height: "80%", justifyContent: "center" }}>
              <Pressable
                onPress={() => setExpandedImageUrl(null)}
                style={styles.imageViewerClose}
              >
                <Image
                  source={require("@/assets/icons/times.png")}
                  style={{
                    width: 20,
                    height: 20,
                    tintColor: Colors[theme].text,
                  }}
                />
              </Pressable>
              <Image
                source={{ uri: expandedImageUrl }}
                style={{
                  width: "100%",
                  height: "100%",
                  resizeMode: "contain",
                }}
              />
            </View>
          )}
        </View>
      </Modal>
    </Container>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
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
  tabContainer: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  tabText: {
    fontSize: 14,
  },
  badgeCount: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
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
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  statusBadgeText: {
    fontFamily: "FontBold",
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: "FontBold",
    fontSize: 20,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageViewerClose: {
    position: "absolute",
    top: -40,
    right: 0,
    zIndex: 10,
    padding: 8,
  },
});

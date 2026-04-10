import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { useUser } from "@/context/UserContext";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAction, useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function AddWatchlistModal({ visible, onClose }: Props) {
  const { theme } = useTheme();
  const router = useRouter();
  const { signedIn } = useUser();
  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const sendMessage = useAction(api.chat.send_message);

  const handleProceed = async () => {
    if (!prompt.trim() || isProcessing || !signedIn?._id) return;

    setIsProcessing(true);

    try {
      // Send the prompt as a WATCHLIST intent message — the AI will create the watchlist
      const result = (await sendMessage({
        content: prompt.trim(),
        intent: "WATCHLIST",
      })) as { response: string; session_id: string };

      // Parse the watchlist data from the response to find the created watchlist
      if (result?.session_id) {
        setPrompt("");
        onClose();

        // Navigate to the tabs index with session context
        router.push({
          pathname: "/(tabs)",
          params: { sessionId: result.session_id },
        });
      }
    } catch (error) {
      console.error("Failed to create watchlist:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (isProcessing) return;
    setPrompt("");
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: Colors[theme].card,
              borderColor: Colors[theme].border,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header icon */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: Colors[theme].primary + "12" },
            ]}
          >
            <Image
              source={require("@/assets/icons/eyes.png")}
              style={{
                width: 22,
                height: 22,
                tintColor: Colors[theme].primary,
              }}
            />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: Colors[theme].text }]}>
            New Snoop
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: Colors[theme].text_secondary },
            ]}
          >
            What do you want me to track?
          </Text>

          {/* Prompt Input */}
          <TextInput
            value={prompt}
            onChangeText={setPrompt}
            multiline
            placeholder='e.g. "Let me know when Eder Militão returns to training"'
            placeholderTextColor={Colors[theme].text_secondary + "80"}
            editable={!isProcessing}
            style={[
              styles.input,
              {
                color: Colors[theme].text,
                backgroundColor: Colors[theme].surface,
                borderColor: Colors[theme].border,
              },
            ]}
          />

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              onPress={handleClose}
              disabled={isProcessing}
              style={[
                styles.cancelBtn,
                { borderColor: Colors[theme].border },
              ]}
            >
              <Text
                style={{
                  color: Colors[theme].text_secondary,
                  fontFamily: "FontMedium",
                  fontSize: 14,
                }}
              >
                Cancel
              </Text>
            </Pressable>

            <Pressable
              onPress={handleProceed}
              disabled={!prompt.trim() || isProcessing}
              style={[
                styles.proceedBtn,
                {
                  backgroundColor: Colors[theme].primary,
                  opacity: !prompt.trim() || isProcessing ? 0.5 : 1,
                },
              ]}
            >
              {isProcessing ? (
                <ActivityIndicator
                  size="small"
                  color={Colors[theme].background}
                />
              ) : (
                <>
                  <Text
                    style={{
                      color: Colors[theme].background,
                      fontFamily: "FontBold",
                      fontSize: 14,
                    }}
                  >
                    Snoop it
                  </Text>
                  <Image
                    source={require("@/assets/icons/send.png")}
                    style={{
                      width: 14,
                      height: 14,
                      tintColor: Colors[theme].background,
                    }}
                  />
                </>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: "FontBold",
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "FontRegular",
    textAlign: "center",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontFamily: "FontRegular",
    fontSize: 14,
    lineHeight: 20,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  proceedBtn: {
    flex: 1.5,
    paddingVertical: 13,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});

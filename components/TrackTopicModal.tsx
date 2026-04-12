import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { useUser } from "@/context/UserContext";
import { api } from "@/convex/_generated/api";
import {
  default as BottomSheet,
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useAction } from "convex/react";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

interface Props {
  visible: boolean;
  topic: string;
  onClose: () => void;
}

export default function TrackTopicModal({ visible, topic, onClose }: Props) {
  const { theme } = useTheme();
  const router = useRouter();
  const { signedIn } = useUser();
  const bottomSheetRef = useRef<BottomSheet>(null);

  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Dynamic snap points depending on keyboard focus
  const snapPoints = useMemo(() => ["60%", "85%"], []);

  const initializeWatchlist = useAction(api.chat.initialize_watchlist);

  // Sync visibility with modal state
  useEffect(() => {
    if (visible && topic) {
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      bottomSheetRef.current?.snapToIndex(-1);
      setPrompt("");
    }
  }, [visible, topic]);

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
        setIsProcessing(false);
      }
      if (index === 1) {
        bottomSheetRef.current?.snapToIndex(1);
      }
    },
    [onClose],
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    [],
  );

  const handleProceed = async () => {
    if (!prompt.trim() || isProcessing || !signedIn?._id) return;

    setIsProcessing(true);

    try {
      // Combine topic context with user prompt
      const fullPrompt = `Topic: ${topic}. User Request: ${prompt.trim()}`;

      const result = await initializeWatchlist({
        prompt: fullPrompt,
      });

      if (result?.watchlist_id) {
        setPrompt("");
        onClose();

        router.push({
          pathname: "/snoop/[id]",
          params: { id: result.watchlist_id },
        });
      }
    } catch (error) {
      console.error("Failed to create watchlist from topic:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    bottomSheetRef.current?.close();
    onClose();
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enableContentPanningGesture={true}
      enableHandlePanningGesture={true}
      enableDynamicSizing={false}
      enableOverDrag={false}
      index={-1}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: Colors[theme].card }}
      handleIndicatorStyle={{ backgroundColor: Colors[theme].border }}
      enablePanDownToClose
    >
      <BottomSheetView
        style={{ flex: 1, paddingHorizontal: 24, paddingBottom: 24 }}
      >
        <View style={styles.sheetHeader}>
          <Text
            style={{
              color: Colors[theme].text_secondary,
              fontFamily: "FontBold",
              fontSize: 12,
              letterSpacing: 1,
            }}
          >
            TRACK TOPIC
          </Text>
          <Pressable onPress={handleClose} disabled={isProcessing}>
            <Image
              source={require("@/assets/icons/times.png")}
              style={{
                width: 16,
                height: 16,
                tintColor: Colors[theme].text_secondary,
              }}
            />
          </Pressable>
        </View>

        {/* Content Centered Stack */}
        <View style={{ alignItems: "center", marginTop: 10 }}>
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
          <Text style={[styles.topicTitle, { color: Colors[theme].text }]}>
            {topic}
          </Text>
          <Text
            style={[styles.subtitle, { color: Colors[theme].text_secondary }]}
          >
            What exactly do you want to track on this topic?
          </Text>
        </View>

        {/* Prompt Input */}
        <View style={{ width: "100%" }}>
          <TextInput
            value={prompt}
            onChangeText={setPrompt}
            onFocus={() => {
              setIsFocused(true);
              bottomSheetRef.current?.snapToIndex(1);
            }}
            onBlur={() => {
              setIsFocused(false);
              bottomSheetRef.current?.snapToIndex(0);
            }}
            multiline
            maxLength={300}
            placeholder={`e.g. "Notify me when ${topic} news leaks"`}
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
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            onPress={handleClose}
            disabled={isProcessing}
            style={[styles.cancelBtn, { borderColor: Colors[theme].border }]}
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
                  Confirm Tracking
                </Text>
                <Image
                  source={require("@/assets/icons/tracked.png")}
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
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  topicTitle: {
    fontSize: 20,
    fontFamily: "FontBold",
    textAlign: "center",
    marginBottom: 4,
    letterSpacing: -0.5,
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
    minHeight: 100,
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
    flex: 1.8,
    paddingVertical: 13,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});

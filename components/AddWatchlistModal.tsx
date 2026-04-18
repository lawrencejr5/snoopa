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
  onClose: () => void;
}

export default function AddWatchlistModal({ visible, onClose }: Props) {
  const { theme } = useTheme();
  const router = useRouter();
  const { signedIn } = useUser();
  const bottomSheetRef = useRef<BottomSheet>(null);

  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Dynamic snap points depending on keyboard focus
  const snapPoints = useMemo(() => ["50%", "85%"], []);

  // Directly initialize native watchlist instead of parsing text client-side
  const initializeWatchlist = useAction(api.chat.initialize_watchlist);

  // Typewriter Placeholder Logic
  const EXAMPLES = useMemo(
    () =>
      [
        "Track price drops on https://apple.com/iphone-15",
        "Monitor https://news.ycombinator.com for ai news",
        "Tell me when NVIDIA hits $1000 on https://bloomberg.com",
        "Keep me updated on Real Madrid injury news",
        "Watch https://tesla.com for Cybertruck updates",
        "Notify me when Bitcoin hits $100k",
        "Watch for job openings at https://google.com/careers",
        "Track PS5 Pro availability on https://bestbuy.com",
        "Follow news about the next OpenAI release",
        "Snoop on music festivals at https://coachella.com",
        "Alert me when Chelsea FC wins a match",
        "Track flight prices on https://skyscanner.com",
        "Monitor https://techcrunch.com for startup news",
      ].sort(() => Math.random() - 0.5),
    [],
  );

  const [placeholder, setPlaceholder] = useState("");
  const [exampleIndex, setExampleIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setPlaceholder("");
      setCharIndex(0);
      setIsDeleting(false);
      return;
    }

    const currentExample = EXAMPLES[exampleIndex];
    const typingSpeed = isDeleting ? 1 : 1;
    const pauseTime = 4000;

    const timeout = setTimeout(() => {
      if (!isDeleting && charIndex < currentExample.length) {
        const nextIndex = Math.min(charIndex + 3, currentExample.length);
        setPlaceholder(currentExample.substring(0, nextIndex));
        setCharIndex(nextIndex);
      } else if (isDeleting && charIndex > 0) {
        const nextIndex = Math.max(charIndex - 8, 0);
        setPlaceholder(currentExample.substring(0, nextIndex));
        setCharIndex(nextIndex);
      } else if (!isDeleting && charIndex === currentExample.length) {
        setTimeout(() => setIsDeleting(true), pauseTime);
      } else if (isDeleting && charIndex === 0) {
        setIsDeleting(false);
        setExampleIndex((prev) => (prev + 1) % EXAMPLES.length);
      }
    }, typingSpeed);

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, exampleIndex, visible, EXAMPLES]);

  // Sync visibility with modal state
  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      bottomSheetRef.current?.snapToIndex(-1);
      setPrompt("");
    }
  }, [visible]);

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
      const result = await initializeWatchlist({
        prompt: prompt.trim(),
      });

      if (result?.watchlist_id) {
        setPrompt("");
        onClose();

        // Navigate instantly to inherently instantiated dashboard mapping
        router.push({
          pathname: "/snoop/[id]",
          params: { id: result.watchlist_id },
        });
      }
    } catch (error) {
      console.error("Failed to create watchlist:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    bottomSheetRef.current?.close();
    onClose();
  };

  const handleInputChange = (text: string) => {
    const urlRegex =
      /(?:https?:\/\/)?([a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z][-a-zA-Z0-9.]*[a-zA-Z]{2,}(?:\/[^\s]*)?)/g;

    const cleanedText = text.replace(urlRegex, (match) => {
      if (match.length > 200 && match.includes("?")) {
        return match.split("?")[0];
      }
      return match;
    });

    setPrompt(cleanedText);
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
            NEW SNOOP
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

        {/* Content Centered Stack analogous to earlier design */}
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
          <Text
            style={[styles.subtitle, { color: Colors[theme].text_secondary }]}
          >
            What do you want me to track?
          </Text>
        </View>

        {/* Prompt Input */}
        <View style={{ width: "100%" }}>
          <TextInput
            value={prompt}
            onChangeText={handleInputChange}
            onFocus={() => {
              setIsFocused(true);
              bottomSheetRef.current?.snapToIndex(1);
            }}
            onBlur={() => {
              setIsFocused(false);
              bottomSheetRef.current?.snapToIndex(0);
            }}
            multiline
            maxLength={500}
            placeholder={`e.g. "${placeholder}"`}
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
          <Text
            style={{
              alignSelf: "flex-end",
              fontSize: 11,
              fontFamily: "FontMedium",
              color: Colors[theme].text_secondary + "80",
              marginBottom: 14,
              marginRight: 4,
            }}
          >
            {prompt.length}/500
          </Text>
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
                  Start tracking
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
    height: 100,
    textAlignVertical: "top",
    marginBottom: 10,
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

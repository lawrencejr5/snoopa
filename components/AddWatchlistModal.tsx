import Colors from "@/constants/Colors";
import { useCustomAlert } from "@/context/CustomAlertContext";
import { useTheme } from "@/context/ThemeContext";
import { useUser } from "@/context/UserContext";
import { api } from "@/convex/_generated/api";
import { posthogLogger } from "@/utils/posthog-logger";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useAction } from "convex/react";
import { useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import LottieView from "lottie-react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";

interface Props {
  visible: boolean;
  onClose: () => void;
}

type StepPhase = "input" | "generating" | "completed";

interface WatchlistPreview {
  title: string;
  keywords: string[];
  condition: string;
  canonical_topic: string;
  tier: number;
  search_type?: "general" | "news";
  time_range?: "day" | "any_time";
  final_snoop_text?: string;
}

const PROGRESS_STEPS = [
  {
    message: "Connecting to intel server...",
    animation: require("@/assets/animations/server.json"),
    icon: require("@/assets/icons/shield.png"),
  },
  {
    message: "Locking target onto topic...",
    animation: require("@/assets/animations/crosshair.json"),
    icon: require("@/assets/icons/eyes.png"),
  },
  {
    message: "Searching verified sources & databases...",
    animation: require("@/assets/animations/searching.json"),
    icon: require("@/assets/icons/search.png"),
  },
  {
    message: "Synthesizing initial snoop report...",
    animation: require("@/assets/animations/wench.json"),
    icon: require("@/assets/icons/document.png"),
  },
];

const isLottieSupported =
  Platform.OS !== "web" &&
  Boolean(
    UIManager.getViewManagerConfig &&
    (UIManager.getViewManagerConfig("LottieAnimationView") ||
      UIManager.getViewManagerConfig("LottieView")),
  );

function SafeLottie({
  source,
  style,
  autoPlay = true,
  loop = true,
  fallback,
}: {
  source: any;
  style?: any;
  autoPlay?: boolean;
  loop?: boolean;
  fallback: React.ReactNode;
}) {
  if (!isLottieSupported) {
    return <>{fallback}</>;
  }

  try {
    return (
      <LottieView
        source={source}
        style={style}
        autoPlay={autoPlay}
        loop={loop}
      />
    );
  } catch {
    return <>{fallback}</>;
  }
}

export default function AddWatchlistModal({ visible, onClose }: Props) {
  const { theme } = useTheme();
  const router = useRouter();
  const { signedIn } = useUser();
  const posthog = usePostHog();
  const { showCustomAlert } = useCustomAlert();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const inputRef = useRef<any>(null);

  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<StepPhase>("input");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [watchlistPreview, setWatchlistPreview] =
    useState<WatchlistPreview | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);
  const [errorText, setErrorText] = useState<string | null>(null);

  const snapPoints = useMemo(() => ["45%", "55%", "85%"], []);

  const generateWatchlistPreview = useAction(
    api.chat.generate_watchlist_preview,
  );
  const confirmAndCreateWatchlist = useAction(
    api.chat.confirm_and_create_watchlist,
  );

  const EXAMPLES = useMemo(
    () =>
      [
        "Track price drops for the iPhone 15 on https://apple.com/iphone-15",
        "Keep me updated on Real Madrid injury news",
        "Alert me when the continuation date for the Boruto anime is announced, also engage me with the rumors too",
        "Watch for job openings for software engineers at https://google.com/careers",
        "Let me know when the PS5 Pro is available on https://bestbuy.com",
        "Follow news about the next OpenAI release",
        "Track the Entain Bribery case and keep me posted on the court proceedings",
        "Track the VDM vs Blord saga on twitter and keep me updated with the latest gist",
        "Monitor https://www.promogen.app/ and alert me the moment their pricing changes",
        "Let me know when the listing date for the Dangote Refinery is announced",
      ].sort(() => Math.random() - 0.5),
    [],
  );

  const [placeholder, setPlaceholder] = useState("");

  const resetState = useCallback(() => {
    setPrompt("");
    setPhase("input");
    setValidationError(null);
    setWatchlistPreview(null);
    setIsSaving(false);
    setProgressIndex(0);
    setErrorText(null);
    inputRef.current?.clear();
    inputRef.current?.setNativeProps({ text: "" });
  }, []);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
      const randomExample =
        EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)];
      setPlaceholder(randomExample);
      resetState();
    } else {
      bottomSheetRef.current?.dismiss();
      resetState();
    }
  }, [visible, EXAMPLES, resetState]);

  // Handle periodic progress messages during generating phase
  useEffect(() => {
    if (phase !== "generating") return;

    // Ensure sheet snaps back to index 0 (55%) when generating
    bottomSheetRef.current?.snapToIndex(0);

    setProgressIndex(0);
    const interval = setInterval(() => {
      setProgressIndex((prev) =>
        prev < PROGRESS_STEPS.length - 1 ? prev + 1 : prev,
      );
    }, 2200);

    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase == "input") {
      bottomSheetRef.current?.snapToIndex(0);
    }
    if (phase == "generating") {
      bottomSheetRef.current?.snapToIndex(0);
    }
    if (phase === "completed") {
      bottomSheetRef.current?.snapToIndex(1);
    }
  }, [phase]);

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        Keyboard.dismiss();
        onClose();
        resetState();
      }
    },
    [onClose, resetState],
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

  const handleClose = () => {
    Keyboard.dismiss();
    bottomSheetRef.current?.dismiss();
    resetState();
    onClose();
  };

  const handleInputChange = (text: string) => {
    if (validationError) {
      setValidationError(null);
    }
    setPrompt(text);
  };

  const cleanUrlInText = (text: string) => {
    const urlRegex =
      /(?:https?:\/\/)?([a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z][-a-zA-Z0-9.]*[a-zA-Z]{2,}(?:\/[^\s]*)?)/g;

    return text.replace(urlRegex, (match) => {
      if (match.length > 200 && match.includes("?")) {
        return match.split("?")[0];
      }
      return match;
    });
  };

  const handleStartTracking = async () => {
    const cleaned = cleanUrlInText(prompt.trim());
    if (!cleaned || !signedIn?._id) return;

    const words = cleaned.split(/\s+/).filter(Boolean);
    if (words.length < 5) {
      setValidationError(
        "Snoopa needs a bit more detail (at least 5 words) to set up an accurate tracker.",
      );
      return;
    }

    Keyboard.dismiss();
    bottomSheetRef.current?.snapToIndex(0);
    setValidationError(null);
    setErrorText(null);
    setPhase("generating");
    posthog?.capture("watchlist_preview_requested");
    posthogLogger.info("watchlist_preview_requested", {
      source: "add_watchlist_modal",
    });

    try {
      const result = await generateWatchlistPreview({
        prompt: cleaned,
      });

      if (result?.title) {
        setWatchlistPreview({
          title: result.title,
          keywords: result.keywords || [],
          condition: result.condition,
          canonical_topic: result.canonical_topic || "",
          tier: result.tier ?? 3,
          search_type: result.search_type,
          time_range: result.time_range,
          final_snoop_text: result.final_snoop_text,
        });
        posthogLogger.info("watchlist_preview_generated", {
          source: "add_watchlist_modal",
        });
        setPhase("completed");
      } else {
        throw new Error("Failed to generate watchlist preview");
      }
    } catch (error: any) {
      posthogLogger.warn("watchlist_preview_generation_failed", {
        source: "add_watchlist_modal",
      });
      console.error("Failed to generate watchlist preview:", error);
      const msg = error?.message?.includes("FREE_LIMIT_REACHED")
        ? "You have reached the maximum limit of 2 watchlists on a free account. Upgrade to Pro for unlimited watchlists! 🔒"
        : "Failed to generate tracking intelligence. Please try again.";
      setErrorText(msg);
      setPhase("input");
    }
  };

  const handleEditPrompt = () => {
    setPhase("input");
    setErrorText(null);
    setTimeout(() => {
      inputRef.current?.setNativeProps({ text: prompt });
    }, 50);
  };

  const handleContinueToWatchlist = async () => {
    if (!watchlistPreview || isSaving) return;
    setIsSaving(true);
    setErrorText(null);

    try {
      const result = await confirmAndCreateWatchlist({
        prompt: prompt.trim(),
        title: watchlistPreview.title,
        keywords: watchlistPreview.keywords,
        condition: watchlistPreview.condition,
        canonical_topic: watchlistPreview.canonical_topic,
        tier: watchlistPreview.tier,
        search_type: watchlistPreview.search_type,
        time_range: watchlistPreview.time_range,
        final_snoop_text: watchlistPreview.final_snoop_text,
      });

      if (result?.watchlist_id) {
        const targetId = result.watchlist_id;
        posthog?.capture("watchlist_created", {
          search_type: watchlistPreview.search_type ?? "general",
          time_range: watchlistPreview.time_range ?? "any_time",
        });
        posthogLogger.info("watchlist_created", {
          source: "add_watchlist_modal",
          search_type: watchlistPreview.search_type ?? "general",
          time_range: watchlistPreview.time_range ?? "any_time",
        });
        handleClose();
        showCustomAlert("New watchlist created", "success");
        router.push({
          pathname: "/snoop/[id]",
          params: { id: targetId },
        });
      } else {
        throw new Error("Failed to confirm watchlist creation");
      }
    } catch (error: any) {
      posthogLogger.warn("watchlist_creation_failed", {
        source: "add_watchlist_modal",
      });
      console.error("Failed to save watchlist:", error);
      const msg = error?.message?.includes("FREE_LIMIT_REACHED")
        ? "You have reached the maximum limit of 2 watchlists on a free account. Upgrade to Pro for unlimited watchlists! 🔒"
        : "Failed to save watchlist. Please try again.";
      setErrorText(msg);
      setIsSaving(false);
    }
  };

  const wordCount = prompt.trim().split(/\s+/).filter(Boolean).length;
  const isTooShort = wordCount > 0 && wordCount < 5;
  const currentStep = PROGRESS_STEPS[progressIndex] || PROGRESS_STEPS[0];

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enableContentPanningGesture={phase === "input"}
      enableHandlePanningGesture={phase === "input"}
      enableDynamicSizing={false}
      enableOverDrag={false}
      index={0}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: Colors[theme].card }}
      handleIndicatorStyle={{ backgroundColor: Colors[theme].border }}
      enablePanDownToClose={phase === "input"}
    >
      <BottomSheetView style={{ flex: 1 }}>
        <Pressable
          onPress={Keyboard.dismiss}
          style={{ flex: 1, paddingHorizontal: 24, paddingBottom: 24 }}
        >
          {/* HEADER */}
          <View style={styles.sheetHeader}>
            <Text
              style={{
                color: Colors[theme].text_secondary,
                fontFamily: "FontBold",
                fontSize: 12,
                letterSpacing: 1,
              }}
            >
              {phase === "generating"
                ? "INITIALIZING TRACKER"
                : phase === "completed"
                  ? "TARGET LOCKED"
                  : "NEW WATCHLIST"}
            </Text>

            {phase !== "generating" && (
              <Pressable onPress={handleClose} hitSlop={10}>
                <Image
                  source={require("@/assets/icons/times.png")}
                  style={{
                    width: 14,
                    height: 14,
                    tintColor: Colors[theme].text_secondary,
                  }}
                />
              </Pressable>
            )}
          </View>

          {/* PHASE 1: INPUT */}
          {phase === "input" && (
            <View style={{ flex: 1, justifyContent: "space-between" }}>
              <View>
                {/* Centered Subtitle */}
                <View
                  style={{
                    alignItems: "center",
                    marginTop: 4,
                    marginBottom: 16,
                  }}
                >
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
                    style={[
                      styles.subtitle,
                      { color: Colors[theme].text_secondary },
                    ]}
                  >
                    What do you want me to track?
                  </Text>
                </View>

                {/* Error Banner if creation failed */}
                {errorText && (
                  <View
                    style={[
                      styles.errorBanner,
                      {
                        backgroundColor: "rgba(255, 69, 58, 0.12)",
                        borderColor: "rgba(255, 69, 58, 0.3)",
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: "#FF453A",
                        fontFamily: "FontMedium",
                        fontSize: 12,
                        textAlign: "center",
                      }}
                    >
                      {errorText}
                    </Text>
                  </View>
                )}

                {/* Prompt Input */}
                <View style={{ width: "100%" }}>
                  <BottomSheetTextInput
                    ref={inputRef}
                    defaultValue={prompt}
                    onChangeText={handleInputChange}
                    onFocus={() => {
                      bottomSheetRef.current?.snapToIndex(2);
                    }}
                    multiline
                    maxLength={1500}
                    placeholder={`e.g. "${placeholder}"`}
                    placeholderTextColor={Colors[theme].text_secondary + "80"}
                    style={[
                      styles.input,
                      {
                        color: Colors[theme].text,
                        backgroundColor: Colors[theme].surface,
                        borderColor:
                          validationError || isTooShort
                            ? Colors[theme].primary + "80"
                            : Colors[theme].border,
                      },
                    ]}
                  />

                  {/* Character & Word count info */}
                  <View style={styles.inputMetaRow}>
                    {validationError ? (
                      <Text
                        style={[
                          styles.validationText,
                          { color: Colors[theme].primary },
                        ]}
                      >
                        {validationError}
                      </Text>
                    ) : isTooShort ? (
                      <Text
                        style={[
                          styles.validationText,
                          { color: Colors[theme].text_secondary },
                        ]}
                      >
                        Need at least 5 words ({wordCount}/5)
                      </Text>
                    ) : (
                      <View />
                    )}

                    <Text
                      style={{
                        fontSize: 11,
                        fontFamily: "FontMedium",
                        color: Colors[theme].text_secondary + "80",
                      }}
                    >
                      {prompt.length}/1500
                    </Text>
                  </View>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actions}>
                <Pressable
                  onPress={handleClose}
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
                  onPress={handleStartTracking}
                  disabled={!prompt.trim() || wordCount < 5}
                  style={[
                    styles.proceedBtn,
                    {
                      backgroundColor: Colors[theme].primary,
                      opacity: !prompt.trim() || wordCount < 5 ? 0.4 : 1,
                    },
                  ]}
                >
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
                </Pressable>
              </View>
            </View>
          )}

          {/* PHASE 2: GENERATING (PROGRESS ANIMATION) */}
          {phase === "generating" && (
            <View style={styles.generatingContainer}>
              <View style={styles.lottieWrapper}>
                <SafeLottie
                  key={progressIndex}
                  source={currentStep.animation}
                  autoPlay
                  loop
                  style={{ width: 90, height: 90 }}
                  fallback={
                    <View
                      style={[
                        styles.fallbackIconBox,
                        { backgroundColor: Colors[theme].primary + "20" },
                      ]}
                    >
                      <Image
                        source={currentStep.icon}
                        style={{
                          width: 28,
                          height: 28,
                          tintColor: Colors[theme].primary,
                        }}
                      />
                    </View>
                  }
                />
              </View>

              <Text
                style={[styles.generatingTitle, { color: Colors[theme].text }]}
              >
                Setting Up Snoopa Intel
              </Text>

              <View
                style={[
                  styles.statusBox,
                  {
                    backgroundColor: Colors[theme].surface,
                    borderColor: Colors[theme].border,
                  },
                ]}
              >
                <ActivityIndicator size="small" color={Colors[theme].primary} />
                <Text
                  style={[styles.statusText, { color: Colors[theme].text }]}
                >
                  {currentStep.message}
                </Text>
              </View>

              {/* Step indicator dots */}
              <View style={styles.dotsRow}>
                {PROGRESS_STEPS.map((_, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.dot,
                      {
                        backgroundColor:
                          idx <= progressIndex
                            ? Colors[theme].primary
                            : Colors[theme].border,
                        width: idx === progressIndex ? 16 : 6,
                      },
                    ]}
                  />
                ))}
              </View>
            </View>
          )}

          {/* PHASE 3: COMPLETED (WATCHLIST PREVIEW CARD) */}
          {phase === "completed" && watchlistPreview && (
            <View
              style={{
                flex: 1,
                justifyContent: "space-between",
                paddingTop: 4,
              }}
            >
              <View style={{ alignItems: "center" }}>
                <View style={{ marginBottom: 4 }}>
                  <SafeLottie
                    source={require("@/assets/animations/magnifier-check.json")}
                    autoPlay
                    loop={false}
                    style={{ width: 60, height: 60 }}
                    fallback={
                      <View
                        style={[
                          styles.fallbackIconBox,
                          { backgroundColor: Colors[theme].primary + "20" },
                        ]}
                      >
                        <Image
                          source={require("@/assets/icons/check-fill.png")}
                          style={{
                            width: 28,
                            height: 28,
                            tintColor: Colors[theme].primary,
                          }}
                        />
                      </View>
                    }
                  />
                </View>

                <Text
                  style={[styles.completedTitle, { color: Colors[theme].text }]}
                >
                  Target Generated!
                </Text>
                <Text
                  style={[
                    styles.completedSubtitle,
                    { color: Colors[theme].text_secondary },
                  ]}
                >
                  Review the target details below. You can refine your prompt or
                  continue.
                </Text>

                {errorText && (
                  <View
                    style={[
                      styles.errorBanner,
                      {
                        backgroundColor: "rgba(255, 69, 58, 0.12)",
                        borderColor: "rgba(255, 69, 58, 0.3)",
                        width: "100%",
                        marginTop: 6,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: "#FF453A",
                        fontFamily: "FontMedium",
                        fontSize: 12,
                        textAlign: "center",
                      }}
                    >
                      {errorText}
                    </Text>
                  </View>
                )}

                {/* WATCHLIST CARD PREVIEW */}
                <View
                  style={[
                    styles.previewCard,
                    {
                      backgroundColor: Colors[theme].surface,
                      borderColor: Colors[theme].border,
                    },
                  ]}
                >
                  <View style={styles.cardHeaderRow}>
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: Colors[theme].primary + "20" },
                      ]}
                    >
                      <View
                        style={[
                          styles.badgeDot,
                          { backgroundColor: Colors[theme].primary },
                        ]}
                      />
                      <Text
                        style={[
                          styles.badgeText,
                          { color: Colors[theme].milk },
                        ]}
                      >
                        Tier {watchlistPreview.tier ?? 3} Tracker
                      </Text>
                    </View>

                    {watchlistPreview.canonical_topic ? (
                      <Text
                        style={[
                          styles.topicTag,
                          { color: Colors[theme].text_secondary },
                        ]}
                      >
                        #{watchlistPreview.canonical_topic}
                      </Text>
                    ) : null}
                  </View>

                  <Text
                    style={[styles.cardTitle, { color: Colors[theme].text }]}
                    numberOfLines={2}
                  >
                    {watchlistPreview.title}
                  </Text>

                  {watchlistPreview.condition ? (
                    <View
                      style={[
                        styles.conditionBox,
                        { backgroundColor: Colors[theme].card },
                      ]}
                    >
                      <Text
                        style={[
                          styles.conditionLabel,
                          { color: Colors[theme].text_secondary },
                        ]}
                      >
                        CONDITION
                      </Text>
                      <Text
                        style={[
                          styles.conditionText,
                          { color: Colors[theme].text },
                        ]}
                        numberOfLines={2}
                      >
                        {watchlistPreview.condition}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {/* ACTIONS */}
              <View style={styles.actions}>
                <Pressable
                  onPress={handleEditPrompt}
                  disabled={isSaving}
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
                    Refine prompt
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleContinueToWatchlist}
                  disabled={isSaving}
                  style={[
                    styles.proceedBtn,
                    {
                      backgroundColor: Colors[theme].primary,
                      opacity: isSaving ? 0.7 : 1,
                    },
                  ]}
                >
                  {isSaving ? (
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
                        Continue
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
            </View>
          )}
        </Pressable>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    marginTop: 4,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  fallbackIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "FontRegular",
    textAlign: "center",
  },
  errorBanner: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    fontFamily: "FontRegular",
    fontSize: 13,
    lineHeight: 18,
    height: 90,
    textAlignVertical: "top",
    marginBottom: 4,
  },
  inputMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  validationText: {
    fontSize: 11,
    fontFamily: "FontMedium",
    flex: 1,
    marginRight: 8,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  proceedBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  generatingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 10,
  },
  lottieWrapper: {
    width: 150,
    height: 150,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  generatingTitle: {
    fontSize: 16,
    fontFamily: "FontBold",
    textAlign: "center",
    marginBottom: 10,
  },
  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
    minWidth: 240,
    justifyContent: "center",
  },
  statusText: {
    fontSize: 12,
    fontFamily: "FontMedium",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  dot: {
    height: 5,
    borderRadius: 2.5,
  },
  completedTitle: {
    fontSize: 18,
    fontFamily: "FontBold",
    textAlign: "center",
    marginBottom: 2,
  },
  completedSubtitle: {
    fontSize: 12,
    fontFamily: "FontRegular",
    textAlign: "center",
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  previewCard: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "FontBold",
  },
  topicTag: {
    fontSize: 10,
    fontFamily: "FontMedium",
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: "FontBold",
    marginBottom: 6,
    lineHeight: 18,
  },
  conditionBox: {
    padding: 8,
    borderRadius: 8,
  },
  conditionLabel: {
    fontSize: 8,
    fontFamily: "FontBold",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  conditionText: {
    fontSize: 11,
    fontFamily: "FontRegular",
    lineHeight: 15,
  },
  continueBtn: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});

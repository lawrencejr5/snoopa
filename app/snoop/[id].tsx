import Container from "@/components/Container";
import FormatText from "@/components/FormatText";
import Loading from "@/components/Loading";
import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { useUser } from "@/context/UserContext";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Octicons, SimpleLineIcons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useAction, useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
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
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

// ---------------------------------------------------------------------------
// Terminal Cursor Blink
// ---------------------------------------------------------------------------
const BlinkingCursor = ({ color }: { color: string }) => {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 500 }),
        withTiming(1, { duration: 500 }),
      ),
      -1,
    );
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.Text
      style={[{ color, fontFamily: "FontBold", fontSize: 14 }, style]}
    >
      ▌
    </Animated.Text>
  );
};

// ---------------------------------------------------------------------------
// Commands Modal
// ---------------------------------------------------------------------------
function CommandsModal({
  visible,
  onClose,
  snoop,
  onTerminate,
  onPauseResume,
  onRename,
  onEdit,
  onAddSource,
  isProcessing,
}: {
  visible: boolean;
  onClose: () => void;
  snoop: { status: string; title: string };
  onTerminate: () => void;
  onPauseResume: () => void;
  onRename: () => void;
  onEdit: () => void;
  onAddSource: () => void;
  isProcessing: boolean;
}) {
  const { theme } = useTheme();

  const options = [
    {
      id: "add_source",
      label: "Add source URL",
      icon: "link",
      action: onAddSource,
      color: Colors[theme].text,
    },
    {
      id: "pause_resume",
      label: snoop.status === "inactive" ? "Resume tracking" : "Pause tracking",
      icon: snoop.status === "inactive" ? "play" : "pause",
      action: onPauseResume,
      color: Colors[theme].text,
    },
    {
      id: "edit",
      label: "Edit condition",
      icon: "document",
      action: onEdit,
      color: Colors[theme].text,
    },
    {
      id: "rename",
      label: "Rename watchlist",
      icon: "document",
      action: onRename,
      color: Colors[theme].text,
    },
    {
      id: "terminate",
      label: "Delete watchlist",
      icon: "times",
      action: onTerminate,
      color: Colors[theme].danger,
    },
  ];

  const bottomSheetRef = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
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

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={["45%"]}
      index={0}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: Colors[theme].card }}
      handleIndicatorStyle={{ backgroundColor: Colors[theme].border }}
    >
      <BottomSheetView
        style={{ flex: 1, paddingHorizontal: 24, paddingVertical: 8 }}
      >
        {/* Header */}
        <View style={cmdStyles.sheetHeader}>
          <Text
            style={{
              color: Colors[theme].text_secondary,
              fontFamily: "FontBold",
              fontSize: 12,
              letterSpacing: 1,
            }}
          >
            OPTIONS
          </Text>
          <Pressable onPress={() => bottomSheetRef.current?.dismiss()}>
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

        {/* Option List */}
        {options.map((o) => (
          <Pressable
            key={o.id}
            onPress={() => {
              o.action();
              bottomSheetRef.current?.dismiss();
            }}
            disabled={isProcessing}
            style={[
              cmdStyles.commandRow,
              { borderBottomColor: Colors[theme].border },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flex: 1,
                gap: 12,
              }}
            >
              <Text
                style={{
                  color: o.color,
                  fontFamily: "FontMedium",
                  fontSize: 15,
                }}
              >
                {o.label}
              </Text>
            </View>
            {o.icon === "link" ? (
              <Octicons
                name="link"
                size={16}
                color={o.color}
                style={{ opacity: 0.7 }}
              />
            ) : (
              <Image
                source={
                  o.icon === "play"
                    ? require("@/assets/icons/play.png")
                    : o.icon === "pause"
                      ? require("@/assets/icons/pause.png")
                      : o.icon === "document"
                        ? require("@/assets/icons/document.png")
                        : require("@/assets/icons/times.png")
                }
                style={{
                  width: 16,
                  height: 16,
                  tintColor: o.color,
                  opacity: 0.7,
                }}
              />
            )}
          </Pressable>
        ))}
      </BottomSheetView>
    </BottomSheetModal>
  );
}

// ---------------------------------------------------------------------------
// Rename Modal
// ---------------------------------------------------------------------------
function RenameModal({
  visible,
  onClose,
  currentTitle,
  onSave,
  isProcessing,
}: {
  visible: boolean;
  onClose: () => void;
  currentTitle: string;
  onSave: (newTitle: string) => void;
  isProcessing: boolean;
}) {
  const { theme } = useTheme();
  const [title, setTitle] = useState(currentTitle);

  useEffect(() => {
    if (visible) setTitle(currentTitle);
  }, [visible, currentTitle]);

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={cmdStyles.overlay} onPress={onClose}>
        <KeyboardStickyView offset={{ opened: 10, closed: 0 }}>
          <Pressable
            style={[
              cmdStyles.renameCard,
              {
                backgroundColor: Colors[theme].card,
                borderColor: Colors[theme].border,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text
              style={{
                color: Colors[theme].text,
                fontFamily: "FontBold",
                fontSize: 18,
                marginBottom: 16,
              }}
            >
              Rename Watchlist
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              style={{
                color: Colors[theme].text,
                backgroundColor: Colors[theme].surface,
                borderColor: Colors[theme].border,
                borderWidth: 1,
                borderRadius: 12,
                padding: 12,
                fontFamily: "FontRegular",
                fontSize: 15,
                marginBottom: 16,
              }}
              autoFocus
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={onClose}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: Colors[theme].border,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: Colors[theme].text_secondary,
                    fontFamily: "FontMedium",
                  }}
                >
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={() => onSave(title.trim())}
                disabled={!title.trim() || isProcessing}
                style={{
                  flex: 1.5,
                  paddingVertical: 12,
                  borderRadius: 10,
                  backgroundColor: Colors[theme].primary,
                  alignItems: "center",
                  opacity: !title.trim() ? 0.5 : 1,
                }}
              >
                {isProcessing ? (
                  <ActivityIndicator
                    size="small"
                    color={Colors[theme].background}
                  />
                ) : (
                  <Text
                    style={{
                      color: Colors[theme].background,
                      fontFamily: "FontBold",
                    }}
                  >
                    Save
                  </Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </KeyboardStickyView>
      </Pressable>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Edit Modal
// ---------------------------------------------------------------------------
function EditModal({
  visible,
  onClose,
  currentCondition,
  onSave,
  isProcessing,
}: {
  visible: boolean;
  onClose: () => void;
  currentCondition: string;
  onSave: (newCondition: string) => void;
  isProcessing: boolean;
}) {
  const { theme } = useTheme();
  const [condition, setCondition] = useState(currentCondition || "");

  useEffect(() => {
    if (visible) setCondition(currentCondition || "");
  }, [visible, currentCondition]);

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={cmdStyles.overlay} onPress={onClose}>
        <KeyboardStickyView offset={{ opened: 10, closed: 0 }}>
          <Pressable
            style={[
              cmdStyles.renameCard,
              {
                backgroundColor: Colors[theme].card,
                borderColor: Colors[theme].border,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text
              style={{
                color: Colors[theme].text,
                fontFamily: "FontBold",
                fontSize: 18,
                marginBottom: 16,
              }}
            >
              Edit Condition
            </Text>
            <TextInput
              multiline
              value={condition}
              onChangeText={setCondition}
              style={{
                color: Colors[theme].text,
                backgroundColor: Colors[theme].surface,
                borderColor: Colors[theme].border,
                borderWidth: 1,
                borderRadius: 12,
                padding: 12,
                fontFamily: "FontRegular",
                fontSize: 14,
                marginBottom: 16,
                minHeight: 80,
                textAlignVertical: "top",
              }}
              autoFocus
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={onClose}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: Colors[theme].border,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: Colors[theme].text_secondary,
                    fontFamily: "FontMedium",
                  }}
                >
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={() => onSave(condition.trim())}
                disabled={!condition.trim() || isProcessing}
                style={{
                  flex: 1.5,
                  paddingVertical: 12,
                  borderRadius: 10,
                  backgroundColor: Colors[theme].primary,
                  alignItems: "center",
                  opacity: !condition.trim() ? 0.5 : 1,
                }}
              >
                {isProcessing ? (
                  <ActivityIndicator
                    size="small"
                    color={Colors[theme].background}
                  />
                ) : (
                  <Text
                    style={{
                      color: Colors[theme].background,
                      fontFamily: "FontBold",
                    }}
                  >
                    Save
                  </Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </KeyboardStickyView>
      </Pressable>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const getFaviconUrl = (url?: string) => {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// Sources Sheet Modal
// ---------------------------------------------------------------------------
function SourcesSheet({
  visible,
  onClose,
  sources,
}: {
  visible: boolean;
  onClose: () => void;
  sources: any[];
}) {
  const { theme } = useTheme();
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
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

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={["60%"]}
      index={0}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: Colors[theme].card }}
      handleIndicatorStyle={{ backgroundColor: Colors[theme].border }}
    >
      <BottomSheetView
        style={{ flex: 1, paddingHorizontal: 24, paddingVertical: 8 }}
      >
        <View style={cmdStyles.sheetHeader}>
          <Text
            style={{
              color: Colors[theme].text_secondary,
              fontFamily: "FontBold",
              fontSize: 12,
              letterSpacing: 1,
            }}
          >
            SOURCES
          </Text>
          <Pressable onPress={() => bottomSheetRef.current?.dismiss()}>
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

        <ScrollView showsVerticalScrollIndicator={false}>
          {sources.map((s, idx) => (
            <Pressable
              key={idx}
              onPress={async () => {
                if (s.url) await WebBrowser.openAuthSessionAsync(s.url);
              }}
              style={{
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: Colors[theme].border,
              }}
            >
              <Text
                style={{
                  color: Colors[theme].text,
                  fontFamily: "FontMedium",
                  fontSize: 14,
                  marginBottom: 4,
                }}
              >
                {s.action}
              </Text>
              {s.url && (
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  {getFaviconUrl(s.url) ? (
                    <Image
                      source={{ uri: getFaviconUrl(s.url)! }}
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 7,
                        borderWidth: 1,
                        borderColor: Colors[theme].text,
                      }}
                    />
                  ) : (
                    <Octicons
                      name="link"
                      size={12}
                      color={Colors[theme].primary}
                    />
                  )}
                  <Text
                    style={{
                      color: Colors[theme].primary,
                      fontFamily: "FontRegular",
                      fontSize: 12,
                    }}
                    numberOfLines={1}
                  >
                    {new URL(s.url).hostname}
                  </Text>
                </View>
              )}
            </Pressable>
          ))}
          {sources.length === 0 && (
            <Text
              style={{
                color: Colors[theme].text_secondary,
                fontFamily: "FontMedium",
                textAlign: "center",
                marginTop: 20,
              }}
            >
              No sources recorded.
            </Text>
          )}
        </ScrollView>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

// ---------------------------------------------------------------------------
// Main Terminal Screen
// ---------------------------------------------------------------------------
export default function SnoopDetailsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { signedIn } = useUser();
  const scrollRef = useRef<ScrollView>(null);

  const [input, setInput] = useState("");
  const [showCommands, setShowCommands] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sending, setSending] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [selectedSources, setSelectedSources] = useState<any[]>([]);
  const [isSourceMode, setIsSourceMode] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Data
  const snoop = useQuery(
    api.watchlist.get_watchlist_item,
    id ? { watchlist_id: id as Id<"watchlist"> } : "skip",
  );
  const logs = useQuery(
    api.watchlist.get_watchlist_logs,
    id ? { watchlist_id: id as Id<"watchlist"> } : "skip",
  );
  const chatMessages = useQuery(
    api.chat.get_messages,
    id ? { watchlist_id: id as Id<"watchlist"> } : "skip",
  );
  const chatSources = useQuery(
    api.chat.get_session_sources,
    id ? { watchlist_id: id as Id<"watchlist"> } : "skip",
  );
  const monitoredSources = useQuery(
    api.chat.get_monitored_sources,
    id ? { watchlist_id: id as Id<"watchlist"> } : "skip",
  );

  // Mutations
  const deactivateWatchlist = useMutation(api.watchlist.deactivate_watchlist);
  const reactivateWatchlist = useMutation(api.watchlist.reactivate_watchlist);
  const updateWatchlist = useMutation(api.watchlist.update_watchlist_item);
  const deleteWatchlist = useMutation(api.watchlist.delete_watchlist_item);
  const markLogsSeen = useMutation(api.log.mark_logs_seen);
  const markChatsSeen = useMutation(api.chat.mark_chats_seen);
  const sendMessage = useAction(api.chat.send_message);

  // Mark seen on mount
  useEffect(() => {
    if (id) {
      markLogsSeen({ watchlist_id: id as Id<"watchlist"> }).catch(() => {});
      markChatsSeen({ watchlist_id: id as Id<"watchlist"> }).catch(() => {});
    }
  }, [id]);

  // Auto-scroll to bottom
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
  }, [logs, chatMessages]);

  // Merge logs + chat into a unified timeline
  const timeline = useMemo(() => {
    const entries: Array<{
      id: string;
      type: "log" | "user" | "snoopa" | "system";
      content: string;
      timestamp: number;
      verified?: boolean;
      url?: string;
    }> = [];

    // Add logs
    if (logs) {
      for (const log of logs) {
        if (log.type === "source") continue;
        entries.push({
          id: log._id,
          type: "log",
          content: log.action,
          timestamp: log.timestamp,
          verified: log.verified,
          url: log.url,
        });
      }
    }

    // Add chat messages
    if (chatMessages) {
      for (const msg of chatMessages) {
        // Skip watchlist confirmation messages (contains delimiter)
        const cleanContent = msg.content.includes("---WATCHLIST_DATA---")
          ? msg.content
              .substring(0, msg.content.indexOf("---WATCHLIST_DATA---"))
              .trim()
          : msg.content;

        entries.push({
          id: msg._id,
          type: msg.role === "user" ? "user" : "snoopa",
          content: cleanContent,
          timestamp: msg._creationTime,
        });
      }
    }

    // Sort chronologically
    entries.sort((a, b) => a.timestamp - b.timestamp);
    return entries;
  }, [logs, chatMessages]);

  // Format Date Header
  const getOrdinalSuffix = (i: number) => {
    const j = i % 10,
      k = i % 100;
    if (j == 1 && k != 11) return i + "st";
    if (j == 2 && k != 12) return i + "nd";
    if (j == 3 && k != 13) return i + "rd";
    return i + "th";
  };

  const formatDateHeader = (ts: number) => {
    const d = new Date(ts);
    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
    const day = d.getDate();
    const month = d.toLocaleDateString("en-US", { month: "short" });
    const year = d.getFullYear();
    return `${dayName}, ${getOrdinalSuffix(day)} ${month} ${year}`;
  };

  // Format timestamp for terminal
  const formatTerminalTime = (ts: number) => {
    const d = new Date(ts);
    let hours = d.getHours();
    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${hours}:${d.getMinutes().toString().padStart(2, "0")}${ampm}`;
  };

  // Handle send
  const handleSend = async () => {
    if (!input.trim() || sending || !id) return;
    const content = input.trim();
    setInput("");
    setSending(true);

    try {
      await sendMessage({
        watchlist_id: id as Id<"watchlist">,
        content,
        intent: isSourceMode ? "SOURCE" : undefined,
      });
      if (isSourceMode) {
        setIsSourceMode(false);
      }
    } catch (e) {
      console.error("Failed to send:", e);
    } finally {
      setSending(false);
    }
  };

  // Command handlers
  const handleTerminate = async () => {
    if (!id || isProcessing) return;
    setIsProcessing(true);
    try {
      await deleteWatchlist({ watchlist_id: id as Id<"watchlist"> });
      router.back();
    } catch (e) {
      console.error("Terminate failed:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePauseResume = async () => {
    if (!id || isProcessing) return;
    setIsProcessing(true);
    try {
      if (snoop?.status === "inactive") {
        await reactivateWatchlist({ watchlist_id: id as Id<"watchlist"> });
      } else {
        await deactivateWatchlist({ watchlist_id: id as Id<"watchlist"> });
      }
    } catch (e) {
      console.error("Pause/resume failed:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRename = async (newTitle: string) => {
    if (!id || isProcessing || !newTitle) return;
    setIsProcessing(true);
    try {
      await updateWatchlist({
        watchlist_id: id as Id<"watchlist">,
        title: newTitle,
      });
      setShowRename(false);
    } catch (e) {
      console.error("Rename failed:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = async (newCondition: string) => {
    if (!id || isProcessing || !newCondition) return;
    setIsProcessing(true);
    try {
      await updateWatchlist({
        watchlist_id: id as Id<"watchlist">,
        condition: newCondition,
      });
      setShowEdit(false);
    } catch (e) {
      console.error("Edit failed:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  if (snoop === undefined) return <Loading />;

  if (snoop === null) {
    return (
      <Container>
        <Text
          style={{
            color: Colors[theme].text,
            marginTop: 50,
            textAlign: "center",
          }}
        >
          Snoop not found.
        </Text>
      </Container>
    );
  }

  const isActive = snoop.status === "active";
  const statusColor = isActive
    ? Colors[theme].success
    : Colors[theme].text_secondary;

  const leftIconElement = isSourceMode ? (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        opacity: sending ? 0.5 : 1,
      }}
    >
      <Octicons name="link" size={18} color={Colors[theme].text} />
      <Text
        style={{
          color: Colors[theme].text,
          fontFamily: "FontMedium",
          fontSize: 13,
          marginLeft: 2,
        }}
      >
        source
      </Text>
      <Pressable disabled={sending} onPress={() => setIsSourceMode(false)}>
        <Octicons
          name="x"
          size={16}
          color={Colors[theme].text_secondary}
          style={{ padding: 4 }}
        />
      </Pressable>
      <View
        style={{
          width: 1,
          height: 20,
          backgroundColor: Colors[theme].border,
          marginHorizontal: 4,
        }}
      />
    </View>
  ) : (
    <Octicons
      name="command-palette"
      size={18}
      color={Colors[theme].text_secondary}
    />
  );

  const rightIconElement = (
    <Pressable
      onPress={handleSend}
      disabled={sending || !input.trim()}
      style={{
        padding: 6,
        backgroundColor: Colors[theme].primary,
        borderRadius: 8,
        opacity: input.trim() && !sending ? 1 : 0.3,
      }}
    >
      <Image
        source={require("@/assets/icons/arrow-up.png")}
        style={{
          width: 15,
          height: 15,
          tintColor: Colors[theme].background,
        }}
      />
    </Pressable>
  );

  return (
    <Container>
      {/* Terminal Header */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Image
            source={require("@/assets/icons/arrow-up.png")}
            style={{
              width: 24,
              height: 24,
              tintColor: Colors[theme].text,
              transform: [{ rotate: "-90deg" }],
            }}
          />
        </Pressable>

        <View style={{ flex: 1, alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: statusColor,
              }}
            />
            <Text
              numberOfLines={1}
              style={{
                color: Colors[theme].text,
                fontFamily: "FontBold",
                fontSize: 16,
                letterSpacing: -0.3,
                maxWidth: 200,
              }}
            >
              {snoop.title}
            </Text>
          </View>
          <Text
            style={{
              color: Colors[theme].text_secondary,
              fontFamily: "FontMedium",
              fontSize: 11,
              marginTop: 2,
              letterSpacing: 0.5,
            }}
          >
            {isActive
              ? "WATCHING"
              : snoop.status === "completed"
                ? "CONFIRMED"
                : "STOPPED"}
          </Text>
        </View>

        {/* Commands button */}
        <Pressable
          onPress={() => setShowCommands(true)}
          style={[styles.cmdButton]}
        >
          <SimpleLineIcons
            name="options-vertical"
            color={Colors[theme].text}
            size={16}
          />
        </Pressable>
      </Animated.View>

      {/* Watchlist Details - Outside Terminal Body */}
      <Animated.View
        entering={FadeInDown.delay(100).duration(400)}
        style={{ marginBottom: 12 }}
      >
        <Pressable
          onPress={() => setShowDetails(!showDetails)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: Colors[theme].surface,
            borderColor: Colors[theme].border,
            borderWidth: 1,
            borderRadius: 16,
          }}
        >
          <Text
            style={{
              fontFamily: "FontBold",
              fontSize: 13,
              color: Colors[theme].text,
              letterSpacing: 0.5,
            }}
          >
            WATCHLIST DETAILS
          </Text>
          <Octicons
            name={showDetails ? "chevron-up" : "chevron-down"}
            size={16}
            color={Colors[theme].text_secondary}
          />
        </Pressable>

        {showDetails && (
          <View style={{ marginTop: 12, paddingHorizontal: 16 }}>
            <Text
              style={{
                fontFamily: "FontMedium",
                fontSize: 12,
                color: Colors[theme].text_secondary,
                marginBottom: 4,
              }}
            >
              Condition
            </Text>
            <Text
              style={{
                fontFamily: "FontRegular",
                fontSize: 13,
                color: Colors[theme].text,
                lineHeight: 20,
                marginBottom: 16,
              }}
            >
              {snoop.condition}
            </Text>

            {snoop.keywords && snoop.keywords.length > 0 && (
              <>
                <Text
                  style={{
                    fontFamily: "FontMedium",
                    fontSize: 12,
                    color: Colors[theme].text_secondary,
                    marginBottom: 8,
                  }}
                >
                  Keywords
                </Text>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  {snoop.keywords.map((kw: string) => (
                    <View
                      key={kw}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 12,
                        backgroundColor: Colors[theme].surface,
                        borderWidth: 1,
                        borderColor: Colors[theme].border,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "FontMedium",
                          fontSize: 11,
                          color: Colors[theme].text,
                        }}
                      >
                        {kw}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {monitoredSources && monitoredSources.length > 0 && (
              <>
                <Text
                  style={{
                    fontFamily: "FontMedium",
                    fontSize: 12,
                    color: Colors[theme].text_secondary,
                    marginBottom: 8,
                    marginTop:
                      snoop.keywords && snoop.keywords.length > 0 ? 16 : 0,
                  }}
                >
                  Monitored Sources
                </Text>
                <View style={{ gap: 8 }}>
                  {monitoredSources.map((ms: any) => (
                    <Pressable
                      key={ms._id}
                      onPress={async () => {
                        if (ms.url)
                          await WebBrowser.openAuthSessionAsync(ms.url);
                      }}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        backgroundColor: Colors[theme].card,
                        padding: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: Colors[theme].border,
                      }}
                    >
                      <Octicons
                        name="link"
                        size={14}
                        color={Colors[theme].primary}
                      />
                      <Text
                        style={{
                          flex: 1,
                          fontFamily: "FontRegular",
                          fontSize: 13,
                          color: Colors[theme].text,
                        }}
                        numberOfLines={1}
                      >
                        {ms.url}
                      </Text>
                      <View
                        style={{
                          backgroundColor:
                            ms.source_weight === "primary"
                              ? Colors[theme].primary + "20"
                              : Colors[theme].border,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 8,
                        }}
                      >
                        <Text
                          style={{
                            color:
                              ms.source_weight === "primary"
                                ? Colors[theme].primary
                                : Colors[theme].text_secondary,
                            fontSize: 10,
                            fontFamily: "FontBold",
                            textTransform: "uppercase",
                          }}
                        >
                          {ms.source_weight}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </View>
        )}
      </Animated.View>

      {/* Terminal Body */}
      <View
        style={[
          styles.terminalBody,
          {
            backgroundColor: Colors[theme].surface,
            borderColor: Colors[theme].border,
          },
        ]}
      >
        {/* Terminal output */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Timeline entries */}
          {timeline.map((entry, index) => {
            const currentDateStr = formatDateHeader(entry.timestamp);
            const previousDateStr =
              index > 0
                ? formatDateHeader(timeline[index - 1].timestamp)
                : null;
            const showDateHeader = currentDateStr !== previousDateStr;

            const lgSources =
              logs?.filter(
                (l: any) => l.type === "source" && l.chat_id === entry.id,
              ) || [];
            const chSources =
              chatSources
                ?.filter((s: any) => s.chat_id === entry.id)
                .map((s: any) => ({
                  action: s.title,
                  url: s.url,
                })) || [];
            const entrySources = [...lgSources, ...chSources];

            return (
              <React.Fragment key={entry.id}>
                {showDateHeader && (
                  <View style={{ marginVertical: 16, alignItems: "center" }}>
                    <Text
                      style={{
                        fontFamily: "FontMedium",
                        fontSize: 12,
                        color: Colors[theme].text_secondary,
                      }}
                    >
                      {currentDateStr}
                    </Text>
                  </View>
                )}
                {index > 0 && !showDateHeader && (
                  <View
                    style={{
                      height: 1,
                      backgroundColor: Colors[theme].border,
                      borderStyle: "dashed",
                      marginVertical: 12,
                    }}
                  />
                )}
                <Animated.View
                  entering={FadeInDown.delay(
                    Math.min(index * 30, 300),
                  ).duration(300)}
                  style={styles.termEntry}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <Text
                      style={{
                        color:
                          entry.type === "log"
                            ? Colors[theme].success
                            : entry.type === "user"
                              ? Colors[theme].warning
                              : "#fff",
                        fontFamily: "FontBold",
                        fontSize: 15,
                      }}
                    >
                      {entry.type === "log"
                        ? "Log"
                        : entry.type === "user"
                          ? "You"
                          : "Snoopa"}
                    </Text>
                    <Text
                      style={{
                        color: Colors[theme].text_secondary,
                        fontFamily: "FontMedium",
                        fontSize: 11,
                        marginHorizontal: 6,
                      }}
                    >
                      |
                    </Text>
                    <Text
                      style={[
                        styles.termTime,
                        { color: Colors[theme].text_secondary },
                      ]}
                    >
                      {formatTerminalTime(entry.timestamp)}
                    </Text>
                    <Octicons
                      name="chevron-right"
                      size={10}
                      color={Colors[theme].text_secondary}
                      style={{ marginHorizontal: 6 }}
                    />
                  </View>

                  {entry.type === "log" ? (
                    <Pressable
                      onPress={async () => {
                        if (entry.url)
                          await WebBrowser.openAuthSessionAsync(entry.url);
                      }}
                      style={{ width: "100%" }}
                    >
                      <Text
                        style={[
                          styles.termContent,
                          { color: Colors[theme].lightgreen },
                        ]}
                      >
                        {entry.content}
                      </Text>
                    </Pressable>
                  ) : entry.type === "user" ? (
                    <View style={{ width: "100%" }}>
                      <Text
                        style={[
                          styles.termContent,
                          { color: Colors[theme].milk },
                        ]}
                      >
                        {entry.content}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ width: "100%" }}>
                      <FormatText>{entry.content}</FormatText>
                      {entrySources.length > 0 && (
                        <Pressable
                          onPress={() => {
                            setSelectedSources(entrySources);
                            setShowSources(true);
                          }}
                          style={{
                            marginTop: 12,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            backgroundColor: Colors[theme].border,
                            alignSelf: "flex-start",
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 8,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                            }}
                          >
                            {entrySources.slice(0, 3).map((s, i) => {
                              const fav = getFaviconUrl(s.url);
                              return fav ? (
                                <Image
                                  key={i}
                                  source={{ uri: fav }}
                                  style={{
                                    width: 14,
                                    height: 14,
                                    borderRadius: 7,
                                    marginLeft: i > 0 ? -4 : 0,
                                    borderWidth: 1,
                                    borderColor: Colors[theme].text,
                                    backgroundColor: Colors[theme].surface,
                                  }}
                                />
                              ) : null;
                            })}
                          </View>
                          <Text
                            style={{
                              color: Colors[theme].text,
                              fontFamily: "FontMedium",
                              fontSize: 13,
                              marginLeft: 4,
                            }}
                          >
                            Sources
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </Animated.View>
              </React.Fragment>
            );
          })}

          {/* Sending indicator */}
          {sending && (
            <View style={styles.termEntry}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <Text
                  style={{
                    color: Colors[theme].text,
                    fontFamily: "FontBold",
                    fontSize: 12,
                  }}
                >
                  Snoopa
                </Text>
                <Text
                  style={{
                    color: Colors[theme].text_secondary,
                    fontFamily: "FontMedium",
                    fontSize: 11,
                    marginHorizontal: 6,
                  }}
                >
                  |
                </Text>
                <Text
                  style={[
                    styles.termTime,
                    { color: Colors[theme].text_secondary },
                  ]}
                >
                  [...]
                </Text>
                <Octicons
                  name="chevron-right"
                  size={10}
                  color={Colors[theme].text_secondary}
                  style={{ marginHorizontal: 6 }}
                />
              </View>
              <BlinkingCursor color={Colors[theme].text} />
            </View>
          )}

          {/* Empty state */}
          {timeline.length === 0 && !sending && (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <Text
                style={{
                  color: Colors[theme].text_secondary,
                  fontFamily: "FontRegular",
                  fontSize: 13,
                  fontStyle: "italic",
                }}
              >
                No activity logged yet. The watch has begun.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Terminal Input */}
      <KeyboardStickyView offset={{ opened: 10, closed: 0 }}>
        <Animated.View
          layout={LinearTransition.duration(300)}
          style={[
            styles.inputBar,
            {
              backgroundColor: Colors[theme].card,
              borderColor: Colors[theme].border,
              flexDirection: isFocused ? "column" : "row",
              alignItems: isFocused ? "stretch" : "center",
            },
          ]}
        >
          {!isFocused && (
            <Animated.View entering={FadeIn} exiting={FadeOut}>
              {leftIconElement}
            </Animated.View>
          )}

          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Talk to me boss..."
            placeholderTextColor={Colors[theme].text_secondary + "60"}
            editable={!sending}
            maxLength={300}
            multiline={true}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            style={{
              flex: isFocused ? undefined : 1,
              color: Colors[theme].text,
              fontFamily: "FontMedium",
              fontSize: 14,
              paddingVertical: isFocused ? 4 : 0,
              paddingHorizontal: isFocused ? 4 : 10,
              minHeight: isFocused ? 20 : undefined,
              maxHeight: 70,
              textAlignVertical: "top",
            }}
          />

          {!isFocused && (
            <Animated.View entering={FadeIn} exiting={FadeOut}>
              {rightIconElement}
            </Animated.View>
          )}

          {isFocused && (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(200)}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 8,
                paddingHorizontal: 4,
              }}
            >
              {leftIconElement}
              {rightIconElement}
            </Animated.View>
          )}
        </Animated.View>
      </KeyboardStickyView>

      {/* Commands Modal */}
      <CommandsModal
        visible={showCommands}
        onClose={() => setShowCommands(false)}
        snoop={{ status: snoop.status, title: snoop.title }}
        onTerminate={handleTerminate}
        onPauseResume={handlePauseResume}
        onRename={() => {
          setShowCommands(false);
          setTimeout(() => setShowRename(true), 300);
        }}
        onEdit={() => {
          setShowCommands(false);
          setTimeout(() => setShowEdit(true), 300);
        }}
        onAddSource={() => {
          setShowCommands(false);
          setTimeout(() => setIsSourceMode(true), 300);
        }}
        isProcessing={isProcessing}
      />

      {/* Rename Modal */}
      <RenameModal
        visible={showRename}
        onClose={() => setShowRename(false)}
        currentTitle={snoop.title}
        onSave={handleRename}
        isProcessing={isProcessing}
      />

      {/* Edit Modal */}
      <EditModal
        visible={showEdit}
        onClose={() => setShowEdit(false)}
        currentCondition={snoop.condition}
        onSave={handleEdit}
        isProcessing={isProcessing}
      />

      {/* Sources Sheet */}
      <SourcesSheet
        visible={showSources}
        onClose={() => setShowSources(false)}
        sources={selectedSources}
      />
    </Container>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  header: {
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backButton: {
    padding: 4,
    borderRadius: 10,
  },
  cmdButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  terminalBody: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 8,
  },
  terminalTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  termDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  termEntry: {
    marginBottom: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
  },
  termTime: {
    fontFamily: "FontMedium",
    fontSize: 12,
    opacity: 0.6,
  },
  termContent: {
    fontFamily: "FontRegular",
    fontSize: 15,
    lineHeight: 19,
  },
  systemText: {
    fontFamily: "FontMedium",
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.8,
  },
  divider: {
    borderTopWidth: 1,
    borderStyle: "dashed",
    marginVertical: 12,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});

const cmdStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    padding: 16,
  },
  sheet: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  commandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  renameCard: {
    width: "90%",
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    alignSelf: "center",
  },
});

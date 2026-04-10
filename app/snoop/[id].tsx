import Container from "@/components/Container";
import Loading from "@/components/Loading";
import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { useUser } from "@/context/UserContext";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { KeyboardStickyView } from "react-native-keyboard-controller";

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
  isProcessing,
}: {
  visible: boolean;
  onClose: () => void;
  snoop: { status: string; title: string };
  onTerminate: () => void;
  onPauseResume: () => void;
  onRename: () => void;
  onEdit: () => void;
  isProcessing: boolean;
}) {
  const { theme } = useTheme();

  const commands = [
    {
      cmd: snoop.status === "inactive" ? "/resume" : "/pause",
      label:
        snoop.status === "inactive" ? "Resume tracking" : "Pause tracking",
      icon: snoop.status === "inactive" ? "play" : "pause",
      action: onPauseResume,
      color: Colors[theme].warning,
    },
    {
      cmd: "/edit",
      label: "Edit tracking condition",
      icon: "document",
      action: onEdit,
      color: Colors[theme].primary,
    },
    {
      cmd: "/rename",
      label: "Rename watchlist",
      icon: "document",
      action: onRename,
      color: Colors[theme].primary,
    },
    {
      cmd: "/terminate",
      label: "Terminate watchlist",
      icon: "times",
      action: onTerminate,
      color: Colors[theme].danger,
    },
  ];

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={cmdStyles.overlay} onPress={onClose}>
        <Pressable
          style={[
            cmdStyles.sheet,
            {
              backgroundColor: Colors[theme].card,
              borderColor: Colors[theme].border,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={cmdStyles.sheetHeader}>
            <Text
              style={{
                color: Colors[theme].success,
                fontFamily: "FontBold",
                fontSize: 12,
                letterSpacing: 1,
              }}
            >
              COMMANDS
            </Text>
            <Pressable onPress={onClose}>
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

          {/* Command List */}
          {commands.map((c) => (
            <Pressable
              key={c.cmd}
              onPress={() => {
                c.action();
                onClose();
              }}
              disabled={isProcessing}
              style={[
                cmdStyles.commandRow,
                { borderBottomColor: Colors[theme].border },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 12 }}>
                <Text
                  style={{
                    color: c.color,
                    fontFamily: "FontBold",
                    fontSize: 14,
                    minWidth: 90,
                  }}
                >
                  {c.cmd}
                </Text>
                <Text
                  style={{
                    color: Colors[theme].text_secondary,
                    fontFamily: "FontRegular",
                    fontSize: 13,
                  }}
                >
                  {c.label}
                </Text>
              </View>
              <Image
                source={
                  c.icon === "play"
                    ? require("@/assets/icons/play.png")
                    : c.icon === "pause"
                      ? require("@/assets/icons/pause.png")
                      : c.icon === "document"
                        ? require("@/assets/icons/document.png")
                        : require("@/assets/icons/times.png")
                }
                style={{
                  width: 14,
                  height: 14,
                  tintColor: c.color,
                  opacity: 0.7,
                }}
              />
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
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
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={cmdStyles.overlay} onPress={onClose}>
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
          <Text style={{ color: Colors[theme].text, fontFamily: "FontBold", fontSize: 18, marginBottom: 16 }}>
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
              <Text style={{ color: Colors[theme].text_secondary, fontFamily: "FontMedium" }}>Cancel</Text>
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
                <ActivityIndicator size="small" color={Colors[theme].background} />
              ) : (
                <Text style={{ color: Colors[theme].background, fontFamily: "FontBold" }}>Save</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
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
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={cmdStyles.overlay} onPress={onClose}>
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
          <Text style={{ color: Colors[theme].text, fontFamily: "FontBold", fontSize: 18, marginBottom: 16 }}>
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
              <Text style={{ color: Colors[theme].text_secondary, fontFamily: "FontMedium" }}>Cancel</Text>
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
                <ActivityIndicator size="small" color={Colors[theme].background} />
              ) : (
                <Text style={{ color: Colors[theme].background, fontFamily: "FontBold" }}>Save</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
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
    snoop?.session_id ? { session_id: snoop.session_id } : "skip",
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
    }
    if (snoop?.session_id) {
      markChatsSeen({ session_id: snoop.session_id }).catch(() => {});
    }
  }, [id, snoop?.session_id]);

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
          ? msg.content.substring(0, msg.content.indexOf("---WATCHLIST_DATA---")).trim()
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

  // Format timestamp for terminal
  const formatTerminalTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  // Handle send
  const handleSend = async () => {
    if (!input.trim() || sending || !snoop?.session_id) return;
    const content = input.trim();
    setInput("");
    setSending(true);

    try {
      await sendMessage({
        session_id: snoop.session_id,
        content,
      });
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
        <Text style={{ color: Colors[theme].text, marginTop: 50, textAlign: "center" }}>
          Snoop not found.
        </Text>
      </Container>
    );
  }

  const isActive = snoop.status === "active";
  const statusColor = isActive ? Colors[theme].success : Colors[theme].text_secondary;

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
            {isActive ? "WATCHING" : snoop.status === "completed" ? "CONFIRMED" : "STOPPED"}
          </Text>
        </View>

        {/* Commands button */}
        <Pressable
          onPress={() => setShowCommands(true)}
          style={[
            styles.cmdButton,
            {
              backgroundColor: Colors[theme].success + "15",
              borderColor: Colors[theme].success + "30",
            },
          ]}
        >
          <Text
            style={{
              color: Colors[theme].success,
              fontFamily: "FontBold",
              fontSize: 13,
            }}
          >
            ⚡
          </Text>
        </Pressable>
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
        {/* Terminal top bar */}
        <View
          style={[
            styles.terminalTopBar,
            { borderBottomColor: Colors[theme].border },
          ]}
        >
          <View style={{ flexDirection: "row", gap: 6 }}>
            <View style={[styles.termDot, { backgroundColor: "#FF5F56" }]} />
            <View style={[styles.termDot, { backgroundColor: "#FFBD2E" }]} />
            <View style={[styles.termDot, { backgroundColor: "#27C93F" }]} />
          </View>
          <Text
            style={{
              color: Colors[theme].text_secondary,
              fontFamily: "FontMedium",
              fontSize: 11,
              letterSpacing: 0.5,
            }}
          >
            snoopa://{snoop.title.toLowerCase().replace(/\s+/g, "-")}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Terminal output */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
        >
          {/* System init message */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <Text style={[styles.systemText, { color: Colors[theme].success }]}>
              [SYS] Tracking initialized for "{snoop.title}"
            </Text>
            <Text
              style={[
                styles.systemText,
                { color: Colors[theme].text_secondary, marginBottom: 4 },
              ]}
            >
              [SYS] Condition: {snoop.condition}
            </Text>
            {snoop.keywords && snoop.keywords.length > 0 && (
              <Text
                style={[
                  styles.systemText,
                  { color: Colors[theme].text_secondary, marginBottom: 12 },
                ]}
              >
                [SYS] Keywords: {snoop.keywords.join(", ")}
              </Text>
            )}
            <View
              style={[
                styles.divider,
                { borderColor: Colors[theme].border },
              ]}
            />
          </Animated.View>

          {/* Timeline entries */}
          {timeline.map((entry, index) => (
            <Animated.View
              key={entry.id}
              entering={FadeInDown.delay(Math.min(index * 30, 300)).duration(300)}
              style={styles.termEntry}
            >
              {entry.type === "log" ? (
                <Pressable
                  onPress={async () => {
                    if (entry.url) await WebBrowser.openAuthSessionAsync(entry.url);
                  }}
                  style={{ flexDirection: "row", flexWrap: "wrap" }}
                >
                  <Text style={[styles.termTime, { color: Colors[theme].text_secondary }]}>
                    [{formatTerminalTime(entry.timestamp)}]
                  </Text>
                  <Text style={{ color: Colors[theme].success, fontFamily: "FontBold", fontSize: 12, marginRight: 6 }}>
                    {" "}LOG{" "}
                  </Text>
                  <Text style={[styles.termContent, { color: Colors[theme].text, flex: 1 }]}>
                    {entry.content}
                  </Text>
                  {entry.verified !== undefined && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4, width: "100%" }}>
                      <View
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: entry.verified ? Colors[theme].success : Colors[theme].warning,
                          marginLeft: 50,
                        }}
                      />
                      <Text
                        style={{
                          color: entry.verified ? Colors[theme].success : Colors[theme].warning,
                          fontFamily: "FontMedium",
                          fontSize: 10,
                        }}
                      >
                        {entry.verified ? "verified" : "unverified"}
                      </Text>
                      {entry.url && (
                        <Text style={{ color: Colors[theme].primary, fontFamily: "FontMedium", fontSize: 10 }}>
                          {" "}· tap to open
                        </Text>
                      )}
                    </View>
                  )}
                </Pressable>
              ) : entry.type === "user" ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  <Text style={[styles.termTime, { color: Colors[theme].text_secondary }]}>
                    [{formatTerminalTime(entry.timestamp)}]
                  </Text>
                  <Text style={{ color: Colors[theme].primary, fontFamily: "FontBold", fontSize: 12 }}>
                    {" "}{">"}{" "}
                  </Text>
                  <Text style={[styles.termContent, { color: Colors[theme].text, flex: 1 }]}>
                    {entry.content}
                  </Text>
                </View>
              ) : (
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  <Text style={[styles.termTime, { color: Colors[theme].text_secondary }]}>
                    [{formatTerminalTime(entry.timestamp)}]
                  </Text>
                  <Text style={{ color: Colors[theme].warning, fontFamily: "FontBold", fontSize: 12 }}>
                    {" "}SNOOPA{" "}
                  </Text>
                  <Text style={[styles.termContent, { color: Colors[theme].text_secondary, flex: 1 }]}>
                    {entry.content}
                  </Text>
                </View>
              )}
            </Animated.View>
          ))}

          {/* Sending indicator */}
          {sending && (
            <View style={styles.termEntry}>
              <Text style={[styles.termTime, { color: Colors[theme].text_secondary }]}>
                [...]
              </Text>
              <Text style={{ color: Colors[theme].warning, fontFamily: "FontBold", fontSize: 12 }}>
                {" "}SNOOPA{" "}
              </Text>
              <BlinkingCursor color={Colors[theme].warning} />
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
      {snoop.session_id && (
        <KeyboardStickyView offset={{ opened: 70, closed: 0 }}>
          <View
            style={[
              styles.inputBar,
              {
                backgroundColor: Colors[theme].card,
                borderColor: Colors[theme].border,
              },
            ]}
          >
            <Text
              style={{
                color: Colors[theme].success,
                fontFamily: "FontBold",
                fontSize: 16,
                marginRight: 8,
              }}
            >
              {">"}
            </Text>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Type a message..."
              placeholderTextColor={Colors[theme].text_secondary + "60"}
              editable={!sending}
              style={{
                flex: 1,
                color: Colors[theme].text,
                fontFamily: "FontMedium",
                fontSize: 14,
                paddingVertical: 0,
              }}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
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
                  width: 14,
                  height: 14,
                  tintColor: Colors[theme].background,
                }}
              />
            </Pressable>
          </View>
        </KeyboardStickyView>
      )}

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
    fontSize: 13,
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

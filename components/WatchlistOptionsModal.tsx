import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { Octicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { KeyboardStickyView } from "react-native-keyboard-controller";
import Animated, { FadeInDown } from "react-native-reanimated";

// ---------------------------------------------------------------------------
// Reusable Commands / Options Modal
// ---------------------------------------------------------------------------
export function CommandsModal({
  visible,
  onClose,
  snoop,
  onTerminate,
  onPauseResume,
  onRename,
  onEdit,
  onAddSource,
  onUpgrade,
  isProcessing,
  hideSourceAndCondition = false,
  isPremium = false,
}: {
  visible: boolean;
  onClose: () => void;
  snoop: { status: string; title: string };
  onTerminate: () => void;
  onPauseResume: () => void;
  onRename: () => void;
  onEdit?: () => void;
  onAddSource?: () => void;
  onUpgrade?: (gate_type: "add_source" | "edit_condition") => void;
  isProcessing: boolean;
  hideSourceAndCondition?: boolean;
  isPremium?: boolean;
}) {
  const { theme } = useTheme();

  const options = [
    ...(hideSourceAndCondition
      ? []
      : [
          {
            id: "add_source",
            label: "Add source URL",
            icon: "link",
            action: isPremium ? onAddSource! : () => onUpgrade?.("add_source"),
            color: Colors[theme].text,
            locked: !isPremium,
          },
        ]),
    {
      id: "pause_resume",
      label: snoop.status === "inactive" ? "Resume tracking" : "Stop tracking",
      icon: snoop.status === "inactive" ? "play" : "pause",
      action: onPauseResume,
      color: Colors[theme].text,
      locked: false,
    },
    ...(hideSourceAndCondition
      ? []
      : [
          {
            id: "edit",
            label: "Edit condition",
            icon: "document",
            action: isPremium ? onEdit! : () => onUpgrade?.("edit_condition"),
            color: Colors[theme].text,
            locked: !isPremium,
          },
        ]),
    {
      id: "rename",
      label: "Rename watchlist",
      icon: "document",
      action: onRename,
      color: Colors[theme].text,
      locked: false,
    },
    {
      id: "terminate",
      label: "Delete watchlist",
      icon: "times",
      action: onTerminate,
      color: Colors[theme].danger,
      locked: false,
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
      snapPoints={hideSourceAndCondition ? ["32%"] : ["45%"]}
      index={0}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: Colors[theme].card }}
      handleIndicatorStyle={{ backgroundColor: Colors[theme].border }}
    >
      <BottomSheetView
        style={{
          flex: 1,
          paddingHorizontal: 24,
          paddingTop: 8,
          paddingBottom: 30,
        }}
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
        </View>

        {/* Option List */}
        {options.map((o) => (
          <Pressable
            key={o.id}
            onPress={() => {
              o.action();
              if (!o.locked) bottomSheetRef.current?.dismiss();
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
                  opacity: o.locked ? 0.5 : 1,
                }}
              >
                {o.label}
              </Text>
              {o.locked && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    backgroundColor: "transparent",
                    borderWidth: 1,
                    borderColor: Colors[theme].border,
                    borderRadius: 6,
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                  }}
                >
                  <Octicons
                    name="lock"
                    size={10}
                    color={Colors[theme].text_secondary}
                  />
                  <Text
                    style={{
                      color: Colors[theme].text_secondary,
                      fontFamily: "FontBold",
                      fontSize: 10,
                      letterSpacing: 0.5,
                    }}
                  >
                    PRO
                  </Text>
                </View>
              )}
            </View>
            {o.icon === "link" ? (
              <Octicons
                name="link"
                size={16}
                color={o.color}
                style={{ opacity: o.locked ? 0.3 : 0.7 }}
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
                  opacity: o.locked ? 0.3 : 0.7,
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
// Reusable Rename Modal
// ---------------------------------------------------------------------------
export function RenameModal({
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
// Reusable Delete Confirmation Modal
// ---------------------------------------------------------------------------
export function ConfirmationModal({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  isProcessing,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  isProcessing: boolean;
}) {
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.8)",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Animated.View
          entering={FadeInDown}
          style={{
            width: "100%",
            backgroundColor: Colors[theme].card,
            borderRadius: 24,
            padding: 24,
            borderWidth: 1,
            borderColor: Colors[theme].border,
          }}
        >
          <Text
            style={{
              color: Colors[theme].text,
              fontFamily: "FontBold",
              fontSize: 20,
              marginBottom: 12,
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              color: Colors[theme].text_secondary,
              fontFamily: "FontRegular",
              fontSize: 15,
              lineHeight: 22,
              marginBottom: 32,
            }}
          >
            {message}
          </Text>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              onPress={onClose}
              disabled={isProcessing}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 14,
                backgroundColor: Colors[theme].surface,
                alignItems: "center",
                borderWidth: 1,
                borderColor: Colors[theme].border,
              }}
            >
              <Text
                style={{
                  color: Colors[theme].text,
                  fontFamily: "FontBold",
                  fontSize: 15,
                }}
              >
                No, Keep it
              </Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={isProcessing}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 14,
                backgroundColor: Colors[theme].danger,
                alignItems: "center",
              }}
            >
              {isProcessing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text
                  style={{
                    color: "#fff",
                    fontFamily: "FontBold",
                    fontSize: 15,
                  }}
                >
                  Yes, Delete
                </Text>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Local Styles
// ---------------------------------------------------------------------------
const cmdStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    padding: 16,
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

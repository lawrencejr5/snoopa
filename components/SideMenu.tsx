import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { useUser } from "@/context/UserContext";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { DrawerContentComponentProps } from "@react-navigation/drawer";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export const SideMenu = (props: DrawerContentComponentProps) => {
  const { theme } = useTheme();
  const router = useRouter();
  const sessions = useQuery(api.session.list_sessions) || [];
  const deleteSession = useMutation(api.session.delete_session);
  const updateSession = useMutation(api.session.update_session);

  const { signedIn } = useUser();

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<"options" | "rename" | "delete">(
    "options",
  );
  const [selectedSession, setSelectedSession] = useState<{
    id: Id<"sessions">;
    title: string;
  } | null>(null);
  const [renameText, setRenameText] = useState("");

  // Get current session ID from navigation state if possible
  const currentRoute = props.state.routes.find((r) => r.name === "Chat");
  // @ts-ignore
  const currentSessionId = currentRoute?.params?.sessionId;

  const handleSessionPress = (sessionId: string | null) => {
    props.navigation.navigate("Chat", { sessionId });
  };

  const handleLongPress = (session: { _id: Id<"sessions">; title: string }) => {
    setSelectedSession({ id: session._id, title: session.title });
    setModalMode("options");
    setModalVisible(true);
  };

  const handleRename = async () => {
    if (selectedSession && renameText.trim()) {
      await updateSession({
        session_id: selectedSession.id,
        title: renameText.trim(),
      });
      setModalVisible(false);
      setRenameText("");
    }
  };

  const handleDelete = async () => {
    if (selectedSession) {
      // If we are deleting the current session, navigate to new chat
      if (currentSessionId === selectedSession.id) {
        handleSessionPress(null);
      }
      await deleteSession({ session_id: selectedSession.id });
      setModalVisible(false);
    }
  };

  return (
    <View
      style={[
        styles.drawerContainer,
        { backgroundColor: Colors[theme].background },
      ]}
    >
      {/* Logo Section */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          marginBottom: 35,
          marginTop: 10,
        }}
      >
        <Text
          style={{
            fontFamily: "FontBold",
            fontSize: 22,
            color: Colors[theme].text,
            letterSpacing: -0.5,
          }}
        >
          Snoopa
        </Text>
      </View>

      {/* Header / New Chat */}
      <View style={{ marginBottom: 25 }}>
        <Pressable
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingVertical: 12,
          }}
          onPress={() => handleSessionPress(null)}
        >
          <Image
            source={require("@/assets/icons/ai-assistant.png")}
            style={{ width: 22, height: 22, tintColor: Colors[theme].text }}
          />
          <Text
            style={{
              fontFamily: "FontBold",
              fontSize: 16,
              color: Colors[theme].text,
            }}
          >
            New Chat
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/watchlist" as any)}
          style={[
            styles.menuItem,
            {
              marginBottom: 15,
              paddingHorizontal: 0,
            },
          ]}
        >
          <Image
            source={require("@/assets/icons/eyes.png")}
            style={{
              width: 20,
              height: 20,
              tintColor: Colors[theme].primary,
              marginRight: 12,
            }}
          />
          <Text
            style={{
              fontFamily: "FontBold",
              fontSize: 15,
              color: Colors[theme].text,
            }}
          >
            My Watchlist
          </Text>
        </Pressable>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Recent Sessions */}
        <View style={{ marginBottom: 30 }}>
          <Text
            style={[styles.menuHeader, { color: Colors[theme].text_secondary }]}
          >
            RECENT SESSIONS
          </Text>
          {sessions.map((session) => {
            const isActive = currentSessionId === session._id;
            return (
              <Pressable
                key={session._id}
                onPress={() => handleSessionPress(session._id)}
                onLongPress={() => handleLongPress(session)}
                style={[
                  styles.menuItem,
                  {
                    backgroundColor: isActive
                      ? Colors[theme].surface
                      : "transparent",
                  },
                ]}
              >
                <Image
                  source={require("@/assets/icons/clock-thick.png")}
                  style={{
                    width: 16,
                    height: 16,
                    tintColor: isActive
                      ? Colors[theme].primary
                      : Colors[theme].text_secondary,
                    marginRight: 10,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: isActive ? "FontBold" : "FontMedium",
                      fontSize: 14,
                      color: Colors[theme].text,
                    }}
                  >
                    {session.title}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: "FontRegular",
                      fontSize: 12,
                      color: Colors[theme].text_secondary,
                    }}
                  >
                    {session.excerpt?.replace(/\*/g, "")}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      {/* Footer */}
      <View
        style={{
          paddingTop: 20,
          borderTopWidth: 1,
          borderTopColor: Colors[theme].border,
        }}
      >
        <Pressable
          onPress={() => router.push("/account" as any)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View>
            <Text
              style={{
                fontFamily: "FontBold",
                fontSize: 14,
                color: Colors[theme].text,
              }}
            >
              {signedIn?.fullname}
            </Text>
            <Text
              style={{
                fontFamily: "FontRegular",
                fontSize: 12,
                color: Colors[theme].text_secondary,
                textTransform: "capitalize",
              }}
            >
              {signedIn?.plan} Plan
            </Text>
          </View>
          <Image
            source={require("@/assets/icons/settings.png")}
            style={{ width: 20, height: 20, tintColor: Colors[theme].text }}
          />
        </Pressable>
      </View>

      {/* Options Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <Pressable
            style={[
              styles.modalContent,
              {
                backgroundColor: Colors[theme].card,
                borderColor: Colors[theme].border,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {modalMode === "options" && (
              <>
                <Text
                  style={[styles.modalTitle, { color: Colors[theme].text }]}
                >
                  {selectedSession?.title}
                </Text>
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => {
                    setRenameText(selectedSession?.title || "");
                    setModalMode("rename");
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      { color: Colors[theme].text },
                    ]}
                  >
                    Rename Session
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalOption, { borderBottomWidth: 0 }]}
                  onPress={() => setModalMode("delete")}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      { color: Colors[theme].danger },
                    ]}
                  >
                    Delete Session
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {modalMode === "rename" && (
              <>
                <Text
                  style={[styles.modalTitle, { color: Colors[theme].text }]}
                >
                  Rename Session
                </Text>
                <TextInput
                  value={renameText}
                  onChangeText={setRenameText}
                  style={[
                    styles.input,
                    {
                      color: Colors[theme].text,
                      borderColor: Colors[theme].border,
                      backgroundColor: Colors[theme].surface,
                    },
                  ]}
                  placeholder="Enter new title"
                  placeholderTextColor={Colors[theme].text_secondary}
                  autoFocus
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={styles.modalButton}
                  >
                    <Text
                      style={{
                        color: Colors[theme].text_secondary,
                        fontFamily: "FontMedium",
                      }}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleRename}
                    style={[
                      styles.modalButton,
                      { backgroundColor: Colors[theme].primary },
                    ]}
                  >
                    <Text
                      style={{
                        color: Colors[theme].background,
                        fontFamily: "FontBold",
                      }}
                    >
                      Save
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {modalMode === "delete" && (
              <>
                <Text
                  style={[styles.modalTitle, { color: Colors[theme].text }]}
                >
                  Delete Session?
                </Text>
                <Text
                  style={{
                    color: Colors[theme].text_secondary,
                    fontFamily: "FontRegular",
                    marginBottom: 20,
                  }}
                >
                  This action cannot be undone.
                </Text>
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={styles.modalButton}
                  >
                    <Text
                      style={{
                        color: Colors[theme].text_secondary,
                        fontFamily: "FontMedium",
                      }}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleDelete}
                    style={[
                      styles.modalButton,
                      { backgroundColor: Colors[theme].danger },
                    ]}
                  >
                    <Text style={{ color: "white", fontFamily: "FontBold" }}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  menuHeader: {
    fontSize: 12,
    fontFamily: "FontBold",
    marginBottom: 15,
    letterSpacing: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 300,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    // shadowing
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "FontBold",
    marginBottom: 15,
    textAlign: "center",
  },
  modalOption: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(127,127,127,0.1)",
    alignItems: "center",
  },
  modalOptionText: {
    fontSize: 16,
    fontFamily: "FontMedium",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontFamily: "FontRegular",
    fontSize: 16,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});

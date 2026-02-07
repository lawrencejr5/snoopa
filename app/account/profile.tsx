import Container from "@/components/Container";
import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { useUser } from "@/context/UserContext";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function ProfileScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);

  const { signedIn } = useUser();

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
          Profile
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Form */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: Colors[theme].text_secondary }]}>
            Full Name
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: Colors[theme].text,
                backgroundColor: Colors[theme].surface,
                borderColor: Colors[theme].border,
              },
            ]}
            defaultValue={signedIn?.fullname}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: Colors[theme].text_secondary }]}>
            Username (Agent Name)
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: Colors[theme].text,
                backgroundColor: Colors[theme].surface,
                borderColor: Colors[theme].border,
              },
            ]}
            defaultValue={signedIn?.username}
            placeholder="What should Snoopa call you?"
            placeholderTextColor={Colors[theme].text_secondary}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: Colors[theme].text_secondary }]}>
            My Context / Memory
          </Text>
          <TextInput
            style={[
              styles.textArea,
              {
                color: Colors[theme].text,
                backgroundColor: Colors[theme].surface,
                borderColor: Colors[theme].border,
              },
            ]}
            multiline
            placeholder="Tell Snoopa anything you'd like it to remember about you..."
            placeholderTextColor={Colors[theme].text_secondary}
            numberOfLines={6}
            textAlignVertical="top"
            defaultValue={signedIn?.memory}
          />
          <Text
            style={{
              fontSize: 12,
              color: Colors[theme].text_secondary,
              marginTop: 5,
              fontStyle: "italic",
            }}
          >
            This information is used to personalize your agent's responses.
          </Text>
        </View>

        {/* Delete Account */}
        <Pressable
          style={{ marginTop: 20, marginBottom: 20, alignItems: "center" }}
          onPress={() => setModalVisible(true)}
        >
          <Text style={{ color: Colors[theme].danger, fontFamily: "FontBold" }}>
            Delete Account
          </Text>
        </Pressable>
      </ScrollView>

      {/* Fixed Footer */}
      <View style={{ paddingBottom: 20 }}>
        <Pressable
          style={[
            styles.saveButton,
            { backgroundColor: Colors[theme].primary },
          ]}
        >
          <Text
            style={{
              color: Colors[theme].background,
              fontFamily: "FontBold",
              fontSize: 16,
            }}
          >
            Save Changes
          </Text>
        </Pressable>
      </View>

      {/* Delete Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: Colors[theme].card,
                borderColor: Colors[theme].border,
              },
            ]}
          >
            <Image
              source={require("@/assets/icons/danger.png")}
              style={{
                width: 40,
                height: 40,
                tintColor: Colors[theme].danger,
                marginBottom: 15,
              }}
            />
            <Text style={[styles.modalTitle, { color: Colors[theme].text }]}>
              Delete Account?
            </Text>
            <Text
              style={[
                styles.modalDescription,
                { color: Colors[theme].text_secondary },
              ]}
            >
              This action cannot be undone. All your data, watchlists, and
              settings will be permanently erased from Snoopa.
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={[
                  styles.modalButton,
                  { backgroundColor: Colors[theme].surface },
                ]}
                onPress={() => setModalVisible(false)}
              >
                <Text
                  style={{ color: Colors[theme].text, fontFamily: "FontBold" }}
                >
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalButton,
                  { backgroundColor: Colors[theme].danger },
                ]}
                onPress={() => {
                  setModalVisible(false);
                  Alert.alert(
                    "Account Deleted",
                    "Your account happens to be fictional right now.",
                  );
                }}
              >
                <Text style={{ color: "white", fontFamily: "FontBold" }}>
                  Delete
                </Text>
              </Pressable>
            </View>
          </View>
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
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontFamily: "FontBold",
    fontSize: 14,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    fontFamily: "FontMedium",
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    fontFamily: "FontRegular",
    fontSize: 15,
    minHeight: 120,
  },
  saveButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
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
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "FontBold",
    marginBottom: 10,
  },
  modalDescription: {
    fontSize: 14,
    fontFamily: "FontRegular",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 15,
    width: "100%",
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
});

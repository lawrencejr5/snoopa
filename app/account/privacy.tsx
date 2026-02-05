import Container from "@/components/Container";
import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function PrivacyScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <Container>
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
          Privacy Policy
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <Text style={[styles.sectionTitle, { color: Colors[theme].text }]}>
          1. Information We Collect
        </Text>
        <Text
          style={[styles.paragraph, { color: Colors[theme].text_secondary }]}
        >
          Snoopa collects information you provide directly, such as your profile
          details and the specific topics ("snoops") you ask us to track.
        </Text>

        <Text style={[styles.sectionTitle, { color: Colors[theme].text }]}>
          2. How We Use Information
        </Text>
        <Text
          style={[styles.paragraph, { color: Colors[theme].text_secondary }]}
        >
          We use this information solely to provide the tracking service. We do
          not sell your personal data or search history to third parties.
        </Text>

        <Text style={[styles.sectionTitle, { color: Colors[theme].text }]}>
          3. Data Security
        </Text>
        <Text
          style={[styles.paragraph, { color: Colors[theme].text_secondary }]}
        >
          We implement industry-standard security measures to protect your data.
          All communication between your device and our servers is encrypted.
        </Text>

        <Text
          style={{
            marginTop: 20,
            fontFamily: "FontMedium",
            color: Colors[theme].text_secondary,
            fontSize: 12,
          }}
        >
          Last Updated: Feb 2026
        </Text>
      </ScrollView>
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
  sectionTitle: {
    fontSize: 18,
    fontFamily: "FontBold",
    marginBottom: 10,
    marginTop: 10,
  },
  paragraph: {
    fontSize: 15,
    fontFamily: "FontRegular",
    lineHeight: 24,
    marginBottom: 20,
  },
});

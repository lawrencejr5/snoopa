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

export default function TermsScreen() {
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
          Terms of Service
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <Text style={[styles.sectionTitle, { color: Colors[theme].text }]}>
          1. Introduction
        </Text>
        <Text
          style={[styles.paragraph, { color: Colors[theme].text_secondary }]}
        >
          Welcome to Snoopa. By using our application, you agree to these Terms
          of Service. Please read them carefully.
        </Text>

        <Text style={[styles.sectionTitle, { color: Colors[theme].text }]}>
          2. Usage
        </Text>
        <Text
          style={[styles.paragraph, { color: Colors[theme].text_secondary }]}
        >
          Snoopa is intended for personal information tracking. You agree not to
          use Snoopa for illegal surveillance, harassment, or to violate any
          third-party rights.
        </Text>

        <Text style={[styles.sectionTitle, { color: Colors[theme].text }]}>
          3. Data & Privacy
        </Text>
        <Text
          style={[styles.paragraph, { color: Colors[theme].text_secondary }]}
        >
          We respect your privacy. Usage of the app is also governed by our
          Privacy Policy.
        </Text>

        <Text style={[styles.sectionTitle, { color: Colors[theme].text }]}>
          4. Termination
        </Text>
        <Text
          style={[styles.paragraph, { color: Colors[theme].text_secondary }]}
        >
          We reserve the right to terminate specific snoops or user accounts
          that violate our policies or community standards.
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

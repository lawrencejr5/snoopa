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

export default function AboutScreen() {
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
          About Snoopa
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40, alignItems: "center" }}
      >
        <Image
          source={require("@/assets/images/splash-icon.png")}
          style={{ width: 120, height: 120, marginBottom: 20 }}
        />

        <Text style={[styles.appName, { color: Colors[theme].text }]}>
          Snoopa
        </Text>
        <Text style={[styles.version, { color: Colors[theme].text_secondary }]}>
          Version 1.0.0 (Beta)
        </Text>

        <Text style={[styles.description, { color: Colors[theme].text }]}>
          Snoopa is your dedicated AI investigative agent. It tracks, verifies,
          and reports on the specific information you care about—cutting through
          the noise of the internet to bring you "Tactical Luxury" intelligence.
        </Text>

        <View
          style={[styles.infoCard, { backgroundColor: Colors[theme].surface }]}
        >
          <Text
            style={{
              fontFamily: "FontMedium",
              color: Colors[theme].text,
              textAlign: "center",
            }}
          >
            Designed by Lawrence Oputa
          </Text>
          <Text
            style={{
              fontFamily: "FontRegular",
              color: Colors[theme].text_secondary,
              textAlign: "center",
              marginTop: 5,
            }}
          >
            © 2026 Deepmind Agents
          </Text>
        </View>
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
  appName: {
    fontSize: 32,
    fontFamily: "FontBold",
    marginBottom: 5,
  },
  version: {
    fontSize: 16,
    fontFamily: "FontMedium",
    marginBottom: 30,
  },
  description: {
    fontSize: 16,
    fontFamily: "FontRegular",
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  infoCard: {
    padding: 20,
    borderRadius: 16,
    width: "100%",
    alignItems: "center",
  },
});

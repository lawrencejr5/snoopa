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

export default function BillingScreen() {
  const { theme } = useTheme();
  const router = useRouter();

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
          Billing
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
      >
        <View
          style={[
            styles.currentPlanContainer,
            {
              backgroundColor: Colors[theme].surface,
              borderColor: Colors[theme].border,
            },
          ]}
        >
          <Text
            style={{
              fontFamily: "FontBold",
              fontSize: 14,
              color: Colors[theme].text_secondary,
              letterSpacing: 1,
              textTransform: "uppercase",
              marginBottom: 5,
            }}
          >
            Current Plan
          </Text>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontFamily: "FontBold",
                fontSize: 28,
                color: Colors[theme].text,
              }}
            >
              Free
            </Text>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 20,
                backgroundColor: Colors[theme].text_secondary + "20",
              }}
            >
              <Text
                style={{
                  fontFamily: "FontMedium",
                  fontSize: 12,
                  color: Colors[theme].text,
                }}
              >
                Active
              </Text>
            </View>
          </View>
          <Text
            style={{
              fontFamily: "FontRegular",
              fontSize: 14,
              color: Colors[theme].text_secondary,
              marginTop: 5,
            }}
          >
            Limited tracking features.
          </Text>
        </View>

        <View
          style={[
            styles.upgradeCard,
            {
              backgroundColor: Colors[theme].card,
              borderColor: Colors[theme].primary,
            },
          ]}
        >
          <View style={{ position: "absolute", top: 15, right: 15 }}>
            <Image
              source={require("@/assets/icons/check-fill.png")}
              style={{
                width: 24,
                height: 24,
                tintColor: Colors[theme].primary,
              }}
            />
          </View>

          <Text style={[styles.upgradeTitle, { color: Colors[theme].text }]}>
            Upgrade to Pro
          </Text>
          <Text style={[styles.price, { color: Colors[theme].primary }]}>
            $30M😎
            <Text style={{ fontSize: 16, color: Colors[theme].text_secondary }}>
              /mo
            </Text>
          </Text>

          <View style={styles.featuresList}>
            {[
              "Unlimited snoops",
              "Real-time notifications",
              "Deep web analysis",
              "Priority support",
            ].map((feature, i) => (
              <View
                key={i}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 12,
                  gap: 10,
                }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: Colors[theme].primary,
                  }}
                />
                <Text
                  style={{
                    fontFamily: "FontMedium",
                    fontSize: 15,
                    color: Colors[theme].text_secondary,
                  }}
                >
                  {feature}
                </Text>
              </View>
            ))}
          </View>

          <Pressable
            style={[
              styles.upgradeButton,
              {
                backgroundColor: Colors[theme].primary,
              },
            ]}
          >
            <Text
              style={[
                styles.upgradeButtonText,
                { color: Colors[theme].background },
              ]}
            >
              Get Started
            </Text>
          </Pressable>
        </View>

        <Text
          style={{
            textAlign: "center",
            fontFamily: "FontRegular",
            fontSize: 13,
            color: Colors[theme].text_secondary,
            marginTop: 20,
          }}
        >
          Recurring billing. Cancel anytime.
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
  currentPlanContainer: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 30,
    borderWidth: 1,
  },
  upgradeCard: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 2,
  },
  upgradeTitle: {
    fontSize: 22,
    fontFamily: "FontBold",
    marginBottom: 5,
  },
  price: {
    fontSize: 36,
    fontFamily: "FontBold",
    marginBottom: 25,
    letterSpacing: -1,
  },
  featuresList: {
    marginBottom: 25,
  },
  upgradeButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  upgradeButtonText: {
    fontFamily: "FontBold",
    fontSize: 16,
    letterSpacing: 0.5,
  },
});

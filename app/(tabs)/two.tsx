import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { StyleSheet, Text, View } from "react-native";

export default function TabTwoScreen() {
  const { theme } = useTheme();
  return (
    <View
      style={[styles.container, { backgroundColor: Colors[theme].background }]}
    >
      <Text style={[styles.title, { color: Colors[theme].text }]}>Tab Two</Text>
      <View style={styles.separator} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: "80%",
  },
});

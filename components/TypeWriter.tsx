import { useTheme } from "@/context/ThemeContext";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import FormatText from "./FormatText";

interface TypeWriterProps {
  content: string;
  speed?: number;
  onComplete?: () => void;
}

export default function TypeWriter({
  content,
  speed = 10,
  onComplete,
}: TypeWriterProps) {
  const { theme } = useTheme();
  const [displayedContent, setDisplayedContent] = useState("");

  useEffect(() => {
    let currentIndex = 0;

    // Clear previous content when content prop changes
    setDisplayedContent("");

    const intervalId = setInterval(() => {
      // Use <= so that we include the full string at the end
      if (currentIndex <= content.length) {
        setDisplayedContent(content.substring(0, currentIndex));
        currentIndex += 3;
      } else {
        clearInterval(intervalId);
        if (onComplete) {
          onComplete();
        }
      }
    }, speed);

    return () => clearInterval(intervalId);
  }, [content, speed]); // Removed onComplete from dependency array to avoid re-triggering loop

  return (
    <View style={styles.container}>
      <FormatText>{displayedContent}</FormatText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

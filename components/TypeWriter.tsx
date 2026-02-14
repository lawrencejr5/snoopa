import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Markdown from "react-native-markdown-display";

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
      <Markdown
        style={{
          body: {
            color: Colors[theme].text,
            fontFamily: "FontRegular",
            fontSize: 15,
            lineHeight: 24,
          },
          heading1: {
            color: Colors[theme].text,
            fontFamily: "FontBold",
            fontSize: 22,
            marginBottom: 10,
          },
          heading2: {
            color: Colors[theme].text,
            fontFamily: "FontBold",
            fontSize: 20,
            marginBottom: 10,
          },
          strong: {
            fontFamily: "FontBold",
            fontWeight: "normal",
            color: Colors[theme].text,
          },
          bullet_list: {
            marginBottom: 10,
          },
          ordered_list: {
            marginBottom: 10,
          },
          code_inline: {
            backgroundColor: Colors[theme].surface,
            color: Colors[theme].primary,
            fontFamily: "FontMedium",
          },
          fence: {
            backgroundColor: Colors[theme].surface,
            borderColor: Colors[theme].border,
            borderWidth: 1,
            padding: 10,
            color: Colors[theme].text,
          },
        }}
      >
        {displayedContent}
      </Markdown>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

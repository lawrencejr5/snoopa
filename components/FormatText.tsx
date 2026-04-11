import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import React, { ReactNode } from "react";
import Markdown from "react-native-markdown-display";

const FormatText = ({ children }: { children: ReactNode }) => {
  const { theme } = useTheme();
  return (
    <Markdown
      style={{
        paragraph: {
          marginTop: 0,
          marginBottom: 0,
        },
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
      {children}
    </Markdown>
  );
};

export default FormatText;

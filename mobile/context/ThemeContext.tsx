import { useColorScheme } from "@/components/useColorScheme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  FC,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { Appearance } from "react-native";

type ThemeType = "dark" | "light";

interface ThemeContextType {
  theme: ThemeType;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const ThemeProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const deviceTheme = useColorScheme();

  const [theme, setTheme] = useState<ThemeType>(deviceTheme);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const loadTheme = async () => {
      setLoading(true);
      const savedTheme = await AsyncStorage.getItem("theme");
      if (!savedTheme) {
        await AsyncStorage.setItem("theme", deviceTheme);
      }
      setTheme(savedTheme as ThemeType);
      setLoading(false);
    };
    loadTheme();
  }, [theme]);

  useEffect(() => {
    const listener = Appearance.addChangeListener(({ colorScheme }) => {
      toggleTheme(colorScheme as ThemeType);
    });

    return () => listener.remove();
  }, []);

  const toggleTheme = (theme?: ThemeType) => {
    if (theme) {
      setTheme(theme);
      AsyncStorage.setItem("theme", theme);
    } else {
      setTheme((prev) => {
        const newTheme = prev === "dark" ? "light" : "dark";
        AsyncStorage.setItem("theme", newTheme);
        return newTheme;
      });
    }
  };

  if (loading) return null;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context)
    throw new Error("Theme context must be used within the theme provider");
  return context;
};

export default ThemeProvider;

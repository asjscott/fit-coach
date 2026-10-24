import * as SystemUI from "expo-system-ui";
import { createContext, use, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { palettes, type ColorScheme, type Colors } from "./colors";

export type ThemePreference = ColorScheme | "system";

type ThemeContextValue = {
  scheme: ColorScheme;
  colors: Colors;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>("system");
  const scheme: ColorScheme = preference === "system" ? (systemScheme === "light" ? "light" : "dark") : preference;
  const colors = palettes[scheme];

  // Native root view shows behind screens during transitions and keyboard animations
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg);
  }, [colors.bg]);

  const value = useMemo(() => ({ scheme, colors, preference, setPreference }), [scheme, colors, preference]);

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme() {
  const theme = use(ThemeContext);
  if (!theme) throw new Error("useTheme must be used inside ThemeProvider");
  return theme;
}

// Builds a StyleSheet from the current colours, rebuilt only when the scheme changes
export function useThemedStyles<T>(factory: (colors: Colors) => T): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [factory, colors]);
}

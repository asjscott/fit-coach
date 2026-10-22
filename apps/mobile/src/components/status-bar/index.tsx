import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { useTheme } from "@/theme";

// Status bar icons that contrast with the current theme
export function StatusBar() {
  const { scheme } = useTheme();
  return <ExpoStatusBar style={scheme === "dark" ? "light" : "dark"} />;
}

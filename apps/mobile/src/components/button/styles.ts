import { StyleSheet } from "react-native";
import { radii, spacing, type Colors, type FontSize } from "@/theme";

export type ButtonAction = "primary" | "secondary" | "positive" | "negative" | "default";
export type ButtonVariant = "solid" | "outline" | "link";
export type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl";

export const buttonSizes: Record<ButtonSize, { height: number; paddingX: number; text: FontSize; icon: number }> = {
  xs: { height: 32, paddingX: spacing[3], text: "xs", icon: 14 },
  sm: { height: 36, paddingX: spacing[4], text: "sm", icon: 16 },
  md: { height: 44, paddingX: spacing[5], text: "md", icon: 18 },
  lg: { height: 52, paddingX: spacing[6], text: "md", icon: 20 },
  xl: { height: 56, paddingX: spacing[7], text: "lg", icon: 22 },
};

// Foreground colour for text, icons and spinner
export const buttonForeground = (colors: Colors, action: ButtonAction, variant: ButtonVariant) => {
  if (variant === "solid") {
    return action === "secondary" || action === "default" ? colors.text : colors.onAccent;
  }
  return {
    primary: colors.orange,
    secondary: colors.text,
    positive: colors.success,
    negative: colors.danger,
    default: colors.text,
  }[action];
};

export const buttonBackground = (colors: Colors, action: ButtonAction) =>
  ({
    // Primary is drawn as a gradient on top of this
    primary: colors.orange,
    secondary: colors.surfaceRaised,
    positive: colors.success,
    negative: colors.danger,
    default: "transparent",
  })[action];

export const buttonBorder = (colors: Colors, action: ButtonAction) =>
  ({
    primary: colors.orange,
    secondary: colors.border,
    positive: colors.success,
    negative: colors.danger,
    default: colors.border,
  })[action];

export const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    borderRadius: radii.md,
    overflow: "hidden",
  },
  link: { paddingHorizontal: 0, height: undefined },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.4 },
});

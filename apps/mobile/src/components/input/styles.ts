import { StyleSheet } from "react-native";
import { radii, spacing, type Colors, type FontSize } from "@/theme";

export type InputVariant = "outline" | "underlined" | "rounded";
export type InputSize = "sm" | "md" | "lg" | "xl";

export const inputSizes: Record<InputSize, { height: number; text: FontSize; icon: number }> = {
  sm: { height: 36, text: "sm", icon: 16 },
  md: { height: 44, text: "md", icon: 18 },
  lg: { height: 52, text: "md", icon: 20 },
  xl: { height: 56, text: "lg", icon: 22 },
};

export const createInputStyles = (colors: Colors) =>
  StyleSheet.create({
    root: {
      flexDirection: "row",
      alignItems: "center",
      overflow: "hidden",
      borderColor: colors.border,
    },
    outline: { borderWidth: 1, borderRadius: radii.md, backgroundColor: colors.surface },
    rounded: {
      borderWidth: 1,
      borderRadius: radii.pill,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing[1],
    },
    underlined: { borderBottomWidth: 1, borderRadius: 0 },
    focused: { borderColor: colors.orange },
    invalid: { borderColor: colors.danger },
    disabled: { opacity: 0.4 },
    field: {
      flex: 1,
      alignSelf: "stretch",
      color: colors.text,
      paddingHorizontal: spacing[4],
      paddingVertical: 0,
    },
    fieldUnderlined: { paddingHorizontal: 0 },
    slot: { justifyContent: "center", alignItems: "center", paddingHorizontal: spacing[3] },
  });

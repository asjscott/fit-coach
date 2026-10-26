import { StyleSheet } from "react-native";
import { radii, spacing, type Colors, type FontSize } from "@/theme";

export type CheckboxSize = "sm" | "md" | "lg";

export const checkboxSizes: Record<CheckboxSize, { box: number; icon: number; text: FontSize }> = {
  sm: { box: 16, icon: 12, text: "sm" },
  md: { box: 20, icon: 14, text: "md" },
  lg: { box: 24, icon: 18, text: "lg" },
};

export const createCheckboxStyles = (colors: Colors) =>
  StyleSheet.create({
    root: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
    indicator: {
      borderWidth: 2,
      borderColor: colors.inputBorder,
      borderRadius: radii.xs,
      alignItems: "center",
      justifyContent: "center",
    },
    // Radio shares these styles but renders a circle
    round: { borderRadius: radii.pill },
    checked: { borderColor: colors.accent, backgroundColor: colors.accent },
    radioChecked: { borderColor: colors.accent },
    invalid: { borderColor: colors.danger },
    disabled: { opacity: 0.4 },
  });

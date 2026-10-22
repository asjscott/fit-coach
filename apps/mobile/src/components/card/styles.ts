import { StyleSheet } from "react-native";
import { radii, spacing, type Colors } from "@/theme";

export const createCardStyles = (colors: Colors) =>
  StyleSheet.create({
    sm: { padding: spacing[3], borderRadius: radii.sm, gap: spacing[1] },
    md: { padding: spacing[4], borderRadius: radii.md, gap: spacing[2] },
    lg: { padding: spacing[6], borderRadius: radii.lg, gap: spacing[3] },
    elevated: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    outlined: { borderWidth: 1, borderColor: colors.border, backgroundColor: "transparent" },
    filled: { backgroundColor: colors.surfaceRaised },
    selected: { borderWidth: 1, borderColor: colors.orange, backgroundColor: colors.accentSoft },
  });

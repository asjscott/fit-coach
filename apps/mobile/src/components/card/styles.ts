import { StyleSheet } from "react-native";
import { radii, spacing, type Colors } from "@/theme";

export const createCardStyles = (colors: Colors) =>
  StyleSheet.create({
    sm: { paddingVertical: spacing[3], gap: spacing[1] },
    md: { paddingVertical: spacing[4], gap: spacing[2] },
    lg: { paddingVertical: spacing[6], gap: spacing[3] },
    // Boxed cards also pad their sides
    smBox: { paddingHorizontal: spacing[3] },
    mdBox: { paddingHorizontal: spacing[4] },
    lgBox: { paddingHorizontal: spacing[6] },
    section: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
    filled: { backgroundColor: colors.raised, borderRadius: radii.md },
    // A choice's outline identifies it as something to tap, so it meets 3:1
    choice: { borderWidth: 1.5, borderColor: colors.inputBorder, borderRadius: radii.md },
    selected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  });

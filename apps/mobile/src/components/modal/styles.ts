import { StyleSheet } from "react-native";
import { radii, spacing, type Colors } from "@/theme";

export type ModalSize = "xs" | "sm" | "md" | "lg" | "full";

export const modalWidths: Record<ModalSize, `${number}%`> = {
  xs: "60%",
  sm: "70%",
  md: "85%",
  lg: "92%",
  full: "100%",
};

export const createModalStyles = (colors: Colors) =>
  StyleSheet.create({
    root: { flex: 1, alignItems: "center", justifyContent: "center" },
    backdrop: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.backdrop },
    content: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.line,
      padding: spacing[6],
      gap: spacing[4],
      maxHeight: "85%",
    },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    footer: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: spacing[2] },
  });

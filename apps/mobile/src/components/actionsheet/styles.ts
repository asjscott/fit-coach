import { StyleSheet } from "react-native";
import { radii, spacing, type Colors } from "@/theme";

export const createActionsheetStyles = (colors: Colors) =>
  StyleSheet.create({
    root: { flex: 1, justifyContent: "flex-end" },
    backdrop: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.backdrop },
    content: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      paddingHorizontal: spacing[4],
      paddingTop: spacing[2],
      maxHeight: "85%",
    },
    dragIndicatorWrapper: { alignItems: "center", paddingVertical: spacing[2] },
    dragIndicator: { width: 40, height: 4, borderRadius: radii.pill, backgroundColor: colors.line },
    item: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing[3],
      paddingVertical: spacing[4],
      paddingHorizontal: spacing[2],
      borderRadius: radii.sm,
    },
    itemPressed: { backgroundColor: colors.raised },
    itemDisabled: { opacity: 0.4 },
  });

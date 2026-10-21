import { StyleSheet, View } from "react-native";
import { spacing, useTheme, type SpaceToken } from "@/theme";

export function Divider({ spacing: space = "none" }: { spacing?: SpaceToken }) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.line, { backgroundColor: colors.border, marginVertical: spacing[space] }]}
    />
  );
}

const styles = StyleSheet.create({
  line: { height: StyleSheet.hairlineWidth, alignSelf: "stretch" },
});

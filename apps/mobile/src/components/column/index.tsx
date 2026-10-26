import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { columnMaxWidth, useTheme } from "@/theme";

// Centres a navigator or screen in a phone-width column; on a phone it simply fills the screen
export function Column({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.page, { backgroundColor: colors.bg }]}>
      <View style={styles.column}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  column: { flex: 1, width: "100%", maxWidth: columnMaxWidth, alignSelf: "center" },
});

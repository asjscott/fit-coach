import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { fonts, type ColorToken } from "@/theme";
import { Text } from "../text";

export type SectionLabelProps = {
  // Sentence case; the label is drawn in capitals
  children: string;
  // Optional muted detail on the right, e.g. "Mon 20 – Sun 26"
  right?: string;
  color?: ColorToken;
  style?: StyleProp<ViewStyle>;
};

// The small capitalised label that opens a section, e.g. "This week"
export function SectionLabel({ children, right, color = "muted", style }: SectionLabelProps) {
  return (
    <View style={[styles.row, style]}>
      <Text size="xs" color={color} accessibilityRole="header" style={styles.label}>
        {children}
      </Text>
      {right ? (
        <Text size="sm" color="muted">
          {right}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontFamily: fonts.semiBold, letterSpacing: 0.6, textTransform: "uppercase" },
});

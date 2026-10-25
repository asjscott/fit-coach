import { View, type StyleProp, type ViewStyle } from "react-native";
import { fonts, fontSizes, lineHeight, type FontSize } from "@/theme";
import { Text } from "../text";

export type StatProps = {
  // Already formatted, e.g. "6,420" or "48:12"
  value: string;
  // Drawn small after the value, e.g. "kg"
  unit?: string;
  // Below the value, e.g. "Volume"
  label: string;
  size?: Extract<FontSize, "2xl" | "3xl" | "4xl">;
  style?: StyleProp<ViewStyle>;
};

// A big number, a small unit and a label below. Stats in a row share it equally
export function Stat({ value, unit, label, size = "2xl", style }: StatProps) {
  const fontSize = fontSizes[size];
  return (
    <View accessible accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ""}`} style={[{ flex: 1 }, style]}>
      <Text
        style={{
          fontFamily: fonts.bold,
          fontSize,
          lineHeight: lineHeight(fontSize, true),
          letterSpacing: -0.5,
        }}
      >
        {value}
        {unit ? (
          <Text color="muted" style={{ fontFamily: fonts.semiBold, fontSize: Math.round(fontSize * 0.55) }}>
            {` ${unit}`}
          </Text>
        ) : null}
      </Text>
      <Text size="sm" color="muted">
        {label}
      </Text>
    </View>
  );
}

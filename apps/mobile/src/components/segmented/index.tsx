import { StyleSheet, View } from "react-native";
import { radii, spacing, useTheme } from "@/theme";
import { Pressable } from "../pressable";
import { Text } from "../text";

// A control of equal parts, one chosen, for which of a screen's views to show
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.segment, { backgroundColor: colors.raised }]} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[styles.item, selected ? { backgroundColor: colors.surface } : null]}
          >
            <Text size="sm" weight="semiBold" color={selected ? "text" : "muted"}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: "row", borderRadius: radii.md, padding: 3 },
  item: { flex: 1, alignItems: "center", paddingVertical: spacing[2], borderRadius: radii.sm },
});

import { StyleSheet, View } from "react-native";
import { Pressable } from "@/components/pressable";
import { Text } from "@/components/text";
import { radii, spacing, useTheme } from "@/theme";

export type FoodHalf = "today" | "ideas";

const HALVES: { half: FoodHalf; label: string }[] = [
  { half: "today", label: "Today so far" },
  { half: "ideas", label: "Ideas and recent" },
];

// The Food tab's two-part control at the top (prototype variant J): Today so far, and Ideas and recent
export function FoodHalves({ half, onChange }: { half: FoodHalf; onChange: (half: FoodHalf) => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.segment, { backgroundColor: colors.raised }]} accessibilityRole="tablist">
      {HALVES.map(({ half: h, label }) => {
        const selected = half === h;
        return (
          <Pressable
            key={h}
            onPress={() => onChange(h)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[styles.item, selected ? { backgroundColor: colors.surface } : null]}
          >
            <Text size="sm" weight="semiBold" color={selected ? "text" : "muted"}>
              {label}
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

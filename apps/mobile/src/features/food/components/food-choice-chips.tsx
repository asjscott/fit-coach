import { StyleSheet, View } from "react-native";
import { Icon } from "@/components/icons";
import { Pressable } from "@/components/pressable";
import { Text } from "@/components/text";
import { radii, spacing, useTheme } from "@/theme";
import type { RecentChoice } from "../recent-and-saved";

// Recent foods, Saved Foods and Saved Meals as one-tap choices, the saved ones starred
export function FoodChoiceChips({
  choices,
  chosen,
  onChoose,
}: {
  choices: RecentChoice[];
  // The key of the choice that's open, if any
  chosen: string | null;
  onChoose: (key: string | null) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.chips}>
      {choices.map(({ key, food, saved }) => {
        const selected = key === chosen;
        const kind = food.source === "meal" ? "saved meal" : "saved food";
        return (
          <Pressable
            key={key}
            onPress={() => onChoose(selected ? null : key)}
            accessibilityRole="button"
            accessibilityState={{ expanded: selected }}
            accessibilityLabel={saved ? `${food.name}, ${kind}` : food.name}
            style={[
              styles.chip,
              selected
                ? { borderColor: colors.accent, backgroundColor: colors.accentSoft }
                : { borderColor: colors.line, backgroundColor: colors.surface },
            ]}
          >
            {saved ? <Icon name="star" size={14} color={selected ? "accent" : "muted"} /> : null}
            <Text size="sm" color={selected ? "accent" : "text"} numberOfLines={1} style={styles.chipText}>
              {food.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    maxWidth: "100%",
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  chipText: { flexShrink: 1 },
});

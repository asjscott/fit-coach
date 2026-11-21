import type { Food, FoodEntryAdd, Meal } from "@fit/shared";
import { StyleSheet, View } from "react-native";
import { Alert, AlertText } from "@/components/alert";
import { Icon } from "@/components/icons";
import { Pressable } from "@/components/pressable";
import { Spinner } from "@/components/spinner";
import { Text } from "@/components/text";
import { radii, spacing, useTheme } from "@/theme";
import type { RecentChoice } from "../recent-and-saved";
import { FoodResult } from "./food-result";

// Recent and Saved Foods as one-tap choices (spec #158 story 62, prototype variant J): Saved Foods first, starred. A tap
// starts adding it: the food opens below to choose a portion and a meal
export function RecentAndSavedList({
  choices,
  error,
  chosen,
  onChoose,
  meal,
  onLog,
  onEdit,
}: {
  choices: RecentChoice[] | undefined;
  error: string | null;
  // The key of the choice open to log, if any
  chosen: string | null;
  onChoose: (key: string | null) => void;
  meal: Meal | null;
  onLog: (add: FoodEntryAdd) => Promise<boolean>;
  onEdit: (food: Food) => void;
}) {
  const { colors } = useTheme();
  const open = choices?.find((c) => c.key === chosen);

  return (
    <View style={styles.section}>
      <Text size="xs" color="muted" weight="semiBold">
        RECENT AND SAVED
      </Text>
      {!choices ? (
        error ? null : (
          <Spinner />
        )
      ) : !choices.length ? (
        <Text size="sm" color="muted">
          The foods you log, and the ones you save from a label, show here to add again with a tap.
        </Text>
      ) : (
        <View style={styles.chips}>
          {choices.map(({ key, food, saved }) => {
            const selected = key === chosen;
            return (
              <Pressable
                key={key}
                onPress={() => onChoose(selected ? null : key)}
                accessibilityRole="button"
                accessibilityState={{ expanded: selected }}
                accessibilityLabel={saved ? `${food.name}, saved food` : food.name}
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
      )}
      {error && !choices ? (
        <Alert action="muted">
          <AlertText>Your recent and saved foods need a connection.</AlertText>
        </Alert>
      ) : null}
      {open ? (
        <FoodResult
          key={open.key}
          food={open.food}
          open
          onToggle={() => onChoose(null)}
          meal={meal}
          onLog={onLog}
          onEdit={onEdit}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing[3] },
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

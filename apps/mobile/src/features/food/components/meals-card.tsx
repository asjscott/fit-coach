import type { Day, FoodEntry, FoodEntryChange, Meal } from "@fit/shared";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Icon } from "@/components/icons";
import { LoadingButton } from "@/components/loading-button";
import { Pressable } from "@/components/pressable";
import { Text } from "@/components/text";
import { radii, spacing, useTheme } from "@/theme";
import { portionLine } from "../food-portion";
import { entryPortion, mealLine, mealName } from "../today-so-far";
import { EntryEditor } from "./entry-editor";
import { wholeNumber } from "../../nutrition/format";

// The day's four meals under its totals (prototype variant J's Today so far): each shows its number of foods and kcal,
// and opens, one at a time, to its Food Entries, "Add to (meal)" and "Copy from yesterday" (spec #158 stories 49 to 53),
// and "Save as meal" when it has any (spec #188 story 33)
export function MealsCard({
  day,
  title,
  openMeal,
  onOpenMeal,
  onAddTo,
  copyLabel,
  onCopy,
  onSaveAsMeal,
  onChange,
  onDelete,
}: {
  day: Day;
  title: string;
  openMeal: Meal | null;
  onOpenMeal: (meal: Meal | null) => void;
  onAddTo: (meal: Meal) => void;
  // "Copy from yesterday" on today, as `copyLabel` in recent-and-saved.ts words it
  copyLabel: string;
  // Copies the day before's entries in the meal after its own (stories 52 and 53), answering whether that worked
  onCopy: (meal: Meal) => Promise<boolean>;
  // Starts a Saved Meal from the meal's Food Entries
  onSaveAsMeal: (entries: FoodEntry[]) => void;
  onChange: (entry: FoodEntry, change: FoodEntryChange) => Promise<boolean>;
  onDelete: (entry: FoodEntry) => Promise<boolean>;
}) {
  const { colors } = useTheme();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copying, setCopying] = useState<Meal | null>(null);
  const copy = async (meal: Meal) => {
    setCopying(meal);
    await onCopy(meal);
    setCopying(null);
  };
  // A saved change closes the entry; a failed one leaves it open as the user left it
  const closingOnSuccess = async (write: Promise<boolean>) => {
    const ok = await write;
    if (ok) setEditingId(null);
    return ok;
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <View style={styles.header}>
        <Text weight="semiBold">{title}</Text>
        <Text size="sm" color="muted">
          {portionLine(day.totals)}
        </Text>
      </View>
      {day.meals.map(({ meal, entries }) => {
        const open = openMeal === meal;
        return (
          <View key={meal} style={[styles.meal, { borderTopColor: colors.line }]}>
            <Pressable
              onPress={() => onOpenMeal(open ? null : meal)}
              style={styles.rowBetween}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
            >
              <Text size="sm" weight="semiBold">
                {mealName(meal)}
              </Text>
              <View style={styles.mealSummary}>
                <Text size="sm" color="muted">
                  {mealLine(entries)}
                </Text>
                <Icon name={open ? "chevronUp" : "chevronDown"} color="subtle" size={18} />
              </View>
            </Pressable>
            {open ? (
              <>
                {entries.map((entry) => (
                  <View key={entry.id}>
                    <Pressable
                      onPress={() => setEditingId(editingId === entry.id ? null : entry.id)}
                      style={styles.rowBetween}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: editingId === entry.id }}
                      accessibilityHint="Change its portion or meal, or delete it"
                    >
                      <Text size="sm" color="muted" style={styles.entryName}>
                        {`${entry.food.name}, ${entryPortion(entry.portion)}`}
                      </Text>
                      <Text size="sm" color="muted">
                        {`${wholeNumber(entry.nutrients.kcal)} kcal`}
                      </Text>
                    </Pressable>
                    {editingId === entry.id ? (
                      <EntryEditor
                        entry={entry}
                        onChange={(change) => closingOnSuccess(onChange(entry, change))}
                        onDelete={() => closingOnSuccess(onDelete(entry))}
                      />
                    ) : null}
                  </View>
                ))}
                <View style={styles.rowBetween}>
                  <Pressable onPress={() => onAddTo(meal)} accessibilityRole="button" style={styles.add}>
                    <Text size="sm" color="accent" weight="semiBold">
                      {`+ Add to ${mealName(meal).toLowerCase()}`}
                    </Text>
                  </Pressable>
                  <LoadingButton
                    label={copyLabel}
                    size="sm"
                    action="secondary"
                    variant="link"
                    icon="copy"
                    loading={copying === meal}
                    disabled={copying !== null}
                    onPress={() => copy(meal)}
                  />
                </View>
                {entries.length ? (
                  <LoadingButton
                    label="Save as meal"
                    size="sm"
                    action="secondary"
                    variant="link"
                    onPress={() => onSaveAsMeal(entries)}
                    style={styles.saveAsMeal}
                  />
                ) : null}
              </>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing[4], borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, gap: spacing[3] },
  header: { gap: 2 },
  meal: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing[2], gap: spacing[2] },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing[2] },
  mealSummary: { flexDirection: "row", alignItems: "center", gap: spacing[1] },
  entryName: { flex: 1 },
  saveAsMeal: { alignSelf: "flex-end" },
  add: { paddingVertical: spacing[1] },
});

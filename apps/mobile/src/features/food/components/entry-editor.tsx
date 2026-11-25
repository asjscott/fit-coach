import { ingredientsAtPortion } from "@fit/engines";
import type { FoodEntry, FoodEntryChange } from "@fit/shared";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { ConfirmModal } from "@/components/choice-modal";
import { LoadingButton } from "@/components/loading-button";
import { spacing } from "@/theme";
import { usePortion } from "../hooks/use-portion";
import { FoodPortionPanel } from "./food-portion-panel";
import { IngredientLines } from "./ingredient-lines";
import { MealChips } from "./meal-chips";

// A logged Food Entry, open to change its portion or meal, or to delete it (spec #158 story 55). One of a Saved Meal
// shows its ingredients at the portion chosen (spec #188 story 41)
export function EntryEditor({
  entry,
  onChange,
  onDelete,
}: {
  entry: FoodEntry;
  // Each answers whether it worked; when it didn't, what the user chose stays here
  onChange: (change: FoodEntryChange) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
}) {
  const portion = usePortion(entry.food, entry.portion);
  const [meal, setMeal] = useState(entry.meal);
  const [saving, setSaving] = useState(false);
  const [confirmsDelete, setConfirmsDelete] = useState(false);

  const save = async () => {
    if (!portion.choice) return;
    setSaving(true);
    if (!(await onChange({ meal, portion: portion.choice }))) setSaving(false);
  };

  return (
    <View style={styles.editor}>
      <FoodPortionPanel food={entry.food} portion={portion} />
      {portion.grams && entry.food.savedMeal ? (
        <IngredientLines ingredients={ingredientsAtPortion(entry.food, portion.grams)} />
      ) : null}
      <MealChips meal={meal} onChange={setMeal} />
      <View style={styles.buttons}>
        <LoadingButton
          label="Delete"
          size="md"
          action="negative"
          variant="outline"
          disabled={saving}
          onPress={() => setConfirmsDelete(true)}
        />
        <LoadingButton label="Save" size="md" disabled={!portion.choice} loading={saving} onPress={save} />
      </View>
      <ConfirmModal
        isOpen={confirmsDelete}
        title="Delete this food?"
        message={`${entry.food.name} comes off the day's totals.`}
        confirmLabel="Delete"
        onCancel={() => setConfirmsDelete(false)}
        onConfirm={async () => {
          if (!(await onDelete())) setConfirmsDelete(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  editor: { gap: spacing[3], paddingVertical: spacing[2] },
  buttons: { flexDirection: "row", justifyContent: "flex-end", gap: spacing[2] },
});

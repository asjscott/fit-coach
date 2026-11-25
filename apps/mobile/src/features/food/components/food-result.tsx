import { portionNutrients } from "@fit/engines";
import type { Food, FoodEntryAdd, Meal } from "@fit/shared";
import { type ReactNode, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Icon } from "@/components/icons";
import { LoadingButton } from "@/components/loading-button";
import { Pressable } from "@/components/pressable";
import { Text } from "@/components/text";
import { spacing, useTheme } from "@/theme";
import { usePortion } from "../hooks/use-portion";
import { mealName } from "../today-so-far";
import { FoodPortionPanel } from "./food-portion-panel";
import { MealChips } from "./meal-chips";
import { wholeNumber } from "../../nutrition/format";

// One food found: its name, brand and kcal per 100 g, opening to choose a portion and the meal to log it into
export function FoodResult({
  food,
  open,
  onToggle,
  meal,
  onLog,
  onEdit,
}: {
  food: Food;
  open: boolean;
  onToggle: () => void;
  // The meal it goes into unless the user picks another: the one whose "Add to" they tapped
  meal: Meal | null;
  // Logs it, answering whether that worked
  onLog: (add: FoodEntryAdd) => Promise<boolean>;
  // Opens a Saved Food or Saved Meal to edit or delete it
  onEdit?: (food: Food) => void;
}) {
  const editLabel =
    food.source === "saved" ? "Edit saved food" : food.source === "meal" ? "Edit saved meal" : undefined;
  return (
    <FoodRow food={food} open={open} onToggle={onToggle}>
      {/* Starts again from the food as it is now when a Saved Food is edited, so its serving is the new one */}
      <LogFood key={JSON.stringify(food)} food={food} meal={meal} onLog={onLog} />
      {onEdit && editLabel ? (
        <LoadingButton
          label={editLabel}
          size="sm"
          action="secondary"
          variant="link"
          icon="pencil"
          onPress={() => onEdit(food)}
          style={styles.edit}
        />
      ) : null}
    </FoodRow>
  );
}

// "Saved food · Simply · 400 kcal per 100 g". A Saved Meal's is per serving, as it's logged
function detailOf({ source, brand, per100g, servings, savedMeal }: Food) {
  if (savedMeal) {
    return `Saved meal · ${wholeNumber(portionNutrients(per100g, servings[0].grams).kcal)} kcal per serving`;
  }
  return [source === "saved" ? "Saved food" : null, brand, `${wholeNumber(per100g.kcal)} kcal per 100 g`]
    .filter(Boolean)
    .join(" · ");
}

// A food's name and detail, opening to its children
export function FoodRow({
  food,
  open,
  onToggle,
  children,
}: {
  food: Food;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.result, { borderTopColor: colors.line }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={styles.resultRow}
        onPress={onToggle}
      >
        <View style={styles.resultText}>
          <Text weight="semiBold">{food.name}</Text>
          <Text size="sm" color="subtle">
            {detailOf(food)}
          </Text>
        </View>
        <Icon name={open ? "chevronUp" : "chevronDown"} color="subtle" size={20} />
      </Pressable>
      {open ? children : null}
    </View>
  );
}

function LogFood({
  food,
  meal: startMeal,
  onLog,
}: {
  food: Food;
  meal: Meal | null;
  onLog: (add: FoodEntryAdd) => Promise<boolean>;
}) {
  const portion = usePortion(food);
  const [meal, setMeal] = useState(startMeal);
  const [logging, setLogging] = useState(false);

  const log = async () => {
    if (!meal || !portion.choice) return;
    setLogging(true);
    // On success the search closes and this goes; on failure the portion and meal stay as chosen
    if (!(await onLog({ meal, food, portion: portion.choice }))) setLogging(false);
  };

  return (
    <View style={styles.log}>
      <FoodPortionPanel food={food} portion={portion} />
      <MealChips meal={meal} onChange={setMeal} />
      <LoadingButton
        label={meal ? `Add to ${mealName(meal).toLowerCase()}` : "Choose a meal"}
        size="md"
        disabled={!meal || !portion.choice}
        loading={logging}
        onPress={log}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  result: { borderTopWidth: StyleSheet.hairlineWidth },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    minHeight: 56,
    paddingVertical: spacing[3],
  },
  resultText: { flex: 1, gap: 2 },
  log: { gap: spacing[3], paddingBottom: spacing[4] },
  edit: { alignSelf: "flex-start", marginBottom: spacing[3] },
});

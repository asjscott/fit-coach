import type { Food, FoodEntryAdd, Meal } from "@fit/shared";
import { useState } from "react";
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

// One food found: its name, brand and kcal per 100 g, opening to choose a portion and the meal to log it into
export function FoodResult({
  food,
  open,
  onToggle,
  meal,
  onLog,
}: {
  food: Food;
  open: boolean;
  onToggle: () => void;
  // The meal it goes into unless the user picks another: the one whose "Add to" they tapped
  meal: Meal | null;
  // Logs it, answering whether that worked
  onLog: (add: FoodEntryAdd) => Promise<boolean>;
}) {
  const { colors } = useTheme();
  const detail = [food.brand, `${Math.round(food.per100g.kcal).toLocaleString()} kcal per 100 g`]
    .filter(Boolean)
    .join(" · ");
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
            {detail}
          </Text>
        </View>
        <Icon name={open ? "chevronUp" : "chevronDown"} color="subtle" size={20} />
      </Pressable>
      {open ? <LogFood food={food} meal={meal} onLog={onLog} /> : null}
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
});

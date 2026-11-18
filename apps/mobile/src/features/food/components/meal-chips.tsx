import { MEALS, type Meal } from "@fit/shared";
import { StyleSheet, View } from "react-native";
import { Chip } from "@/components/chip";
import { spacing } from "@/theme";
import { mealName } from "../today-so-far";

// Which of the day's four meals a food goes into
export function MealChips({ meal, onChange }: { meal: Meal | null; onChange: (meal: Meal) => void }) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Meal">
      {MEALS.map((m) => (
        <Chip key={m} label={mealName(m)} selected={meal === m} onPress={() => onChange(m)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
});

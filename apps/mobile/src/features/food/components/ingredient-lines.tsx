import type { Ingredient } from "@fit/shared";
import { StyleSheet, View } from "react-native";
import { Text } from "@/components/text";
import { spacing } from "@/theme";
import { ingredientLine } from "../saved-meal-form";

// A Saved Meal's ingredients, each with its portion and kcal (spec #188 story 41)
export function IngredientLines({ ingredients }: { ingredients: Ingredient[] }) {
  return (
    <View style={styles.lines}>
      {ingredients.map((ingredient, i) => {
        const { name, kcal } = ingredientLine(ingredient);
        return (
          <View key={i} style={styles.line}>
            <Text size="sm" color="subtle" style={styles.name}>
              {name}
            </Text>
            <Text size="sm" color="subtle">
              {kcal}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  lines: { gap: spacing[1] },
  line: { flexDirection: "row", gap: spacing[2] },
  name: { flex: 1 },
});

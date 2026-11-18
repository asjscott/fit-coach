import { portionNutrients } from "@fit/engines";
import type { Food } from "@fit/shared";
import { ScrollView, StyleSheet, View } from "react-native";
import { Chip } from "@/components/chip";
import { Input, InputField } from "@/components/input";
import { Text } from "@/components/text";
import { spacing } from "@/theme";
import { portionLine } from "../food-portion";
import type { PortionState } from "../hooks/use-portion";

// A portion of a food: grams, or a count of one of its own servings, and what that portion holds (spec #158 stories
// 71 and 72). The portion's state comes from usePortion, so the screen around it can log or save it
export function FoodPortionPanel({ food, portion }: { food: Food; portion: PortionState }) {
  const { unit, amount, setAmount, choose, grams } = portion;

  return (
    <View style={styles.panel}>
      {food.servings.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.units}>
          {food.servings.map((serving) => (
            <Chip
              key={serving.label}
              label={serving.label}
              selected={unit.unit === "serving" && unit.serving === serving}
              onPress={() => choose({ unit: "serving", serving })}
            />
          ))}
          <Chip label="Grams" selected={unit.unit === "g"} onPress={() => choose({ unit: "g" })} />
        </ScrollView>
      ) : null}
      <View style={styles.amountRow}>
        <Input size="md" style={styles.amount}>
          <InputField
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            selectTextOnFocus
            accessibilityLabel={unit.unit === "g" ? "Grams" : `How many of ${unit.serving.label}`}
          />
        </Input>
        <Text color="muted" style={styles.unitLabel}>
          {unit.unit === "g" ? "g" : `× ${unit.serving.label}${grams ? ` · ${Math.round(grams)} g` : ""}`}
        </Text>
      </View>
      <Text weight="semiBold" accessibilityLiveRegion="polite">
        {grams ? portionLine(portionNutrients(food.per100g, grams)) : "Enter how much"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: spacing[3] },
  units: { gap: spacing[2] },
  amountRow: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  amount: { width: 96 },
  unitLabel: { flex: 1 },
});

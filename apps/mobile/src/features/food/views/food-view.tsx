import type { Food } from "@fit/shared";
import { useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Alert, AlertText } from "@/components/alert";
import { Icon } from "@/components/icons";
import { Input, InputField, InputIcon, InputSlot } from "@/components/input";
import { Pressable } from "@/components/pressable";
import { Screen } from "@/components/screen";
import { Spinner } from "@/components/spinner";
import { Text } from "@/components/text";
import { spacing, useTheme } from "@/theme";
import { FoodPortionPanel } from "../components/food-portion-panel";
import { useFoodSearch } from "../hooks/use-food-search";

const keyOf = (food: Food) => `${food.source}:${food.id}`;

// The Food tab: search for a food and see what a portion of it holds (#162). Nothing is logged yet
export default function FoodView() {
  const [query, setQuery] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const { foods, isSearching, error } = useFoodSearch(query);

  return (
    <Screen padded={false} scroll="content" edges={["bottom"]}>
      <FlatList
        data={foods ?? []}
        keyExtractor={keyOf}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingHorizontal: spacing[6], paddingVertical: spacing[4] }}
        ListHeaderComponent={
          <View style={styles.header}>
            <Input>
              <InputSlot>
                <InputIcon name="search" />
              </InputSlot>
              <InputField
                value={query}
                onChangeText={setQuery}
                placeholder="Search foods"
                autoCorrect={false}
                returnKeyType="search"
                accessibilityLabel="Search foods"
              />
            </Input>
            {error ? (
              <Alert action="muted">
                <AlertText>{error}</AlertText>
              </Alert>
            ) : null}
            {isSearching ? <Spinner /> : null}
          </View>
        }
        renderItem={({ item }) => (
          <FoodResult
            food={item}
            open={openKey === keyOf(item)}
            onToggle={() => setOpenKey((key) => (key === keyOf(item) ? null : keyOf(item)))}
          />
        )}
        ListEmptyComponent={
          foods && !isSearching && !error ? (
            <Text color="muted" centered style={{ marginTop: spacing[6] }}>
              No foods match “{query.trim()}”.
            </Text>
          ) : undefined
        }
      />
    </Screen>
  );
}

// One food found: its name, brand and kcal per 100 g, opening to choose a portion
function FoodResult({ food, open, onToggle }: { food: Food; open: boolean; onToggle: () => void }) {
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
      {open ? <FoodPortionPanel food={food} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing[3], marginBottom: spacing[3] },
  result: { borderTopWidth: StyleSheet.hairlineWidth },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    minHeight: 56,
    paddingVertical: spacing[3],
  },
  resultText: { flex: 1, gap: 2 },
});

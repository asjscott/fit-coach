import { portionOf } from "@fit/engines";
import type { Food, Ingredient, IngredientFood, Portion } from "@fit/shared";
import { useEffect, useState } from "react";
import { BackHandler, Platform, StyleSheet, View } from "react-native";
import { Alert, AlertText } from "@/components/alert";
import { ConfirmModal } from "@/components/choice-modal";
import { FormControl, FormControlError, FormControlErrorText } from "@/components/form-control";
import { Heading } from "@/components/heading";
import { Icon } from "@/components/icons";
import { Input, InputClear, InputField, InputIcon, InputSlot } from "@/components/input";
import { LoadingButton } from "@/components/loading-button";
import { Pressable } from "@/components/pressable";
import { Screen } from "@/components/screen";
import { Spinner } from "@/components/spinner";
import { Text } from "@/components/text";
import { spacing, useTheme } from "@/theme";
import { useFoodSearch } from "../hooks/use-food-search";
import { usePortion } from "../hooks/use-portion";
import { useSavedFoods } from "../hooks/use-saved-foods";
import { useSavedMeals } from "../hooks/use-saved-meals";
import { foodKey, type RecentChoice } from "../recent-and-saved";
import {
  EMPTY_SAVED_MEAL,
  ingredientFoods,
  ingredientLine,
  isIngredientFood,
  perServingLine,
  type SavedMealForm,
  savedMealForm,
  savedMealInput,
} from "../saved-meal-form";
import { FoodChoiceChips } from "./food-choice-chips";
import { FoodPortionPanel } from "./food-portion-panel";
import { FoodRow } from "./food-result";
import { SavedFoodEditor } from "./saved-food-editor";
import { ScanButton } from "./scan-button";

// Making a Saved Meal, or editing one, which can also be deleted there (spec #188 stories 31 to 37). It takes the Food
// tab's whole screen rather than a modal, so a toast shows over it. Logged Food Entries keep their own copy, so nothing
// here changes a day. Rendered only while open, so each opening starts from the meal or an empty one
export function SavedMealEditor({
  food,
  start = EMPTY_SAVED_MEAL,
  choices,
  onSaved,
  onDeleted,
  onSavedFood,
  onClose,
}: {
  // The Saved Meal being edited; none for a new one
  food?: Food;
  // What a new one starts from, as "Save as meal" does
  start?: SavedMealForm;
  // Recent and Saved Foods, to add from
  choices: RecentChoice[] | undefined;
  onSaved: (food: Food) => void;
  onDeleted: () => void;
  // A Saved Food was made here, from a scan with no match
  onSavedFood: () => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const savedMeals = useSavedMeals();
  const savedFoods = useSavedFoods();
  const [form, setForm] = useState<SavedMealForm>(() => (food ? savedMealForm(food) : start));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"saving" | "deleting" | null>(null);
  const [confirmsDelete, setConfirmsDelete] = useState(false);
  // The ingredient open to change, by its place in the list
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const { foods, isSearching, error: searchError } = useFoodSearch(query);
  const searching = query.trim().length >= 2;
  // The food open to add: from search, a scan, Recent or Saved Foods
  const [adding, setAdding] = useState<IngredientFood | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [creatingFood, setCreatingFood] = useState<string | null>(null);
  const addingKey = adding && foodKey(adding);
  const addChoices = choices?.filter((c) => isIngredientFood(c.food)) ?? [];
  const perServing = perServingLine(form);

  // Android's back leaves the editor rather than the tab
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const back = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!busy) onClose();
      return true;
    });
    return () => back.remove();
  }, [busy, onClose]);

  const change = (changes: Partial<SavedMealForm>) => {
    setForm((last) => ({ ...last, ...changes }));
    setError(null);
  };
  const setIngredients = (next: (last: Ingredient[]) => Ingredient[]) => {
    setForm((last) => ({ ...last, ingredients: next(last.ingredients) }));
    setOpenIndex(null);
    setError(null);
  };
  const open = (next: Food | null) => {
    setAdding(next && isIngredientFood(next) && foodKey(next) !== addingKey ? next : null);
  };

  const scanned = async (code: string) => {
    setAdding(null);
    setLookingUp(true);
    const lookup = await savedFoods.lookup(code);
    setLookingUp(false);
    if ("food" in lookup && isIngredientFood(lookup.food)) setAdding(lookup.food);
    else if ("notFound" in lookup) setCreatingFood(lookup.notFound);
  };

  const save = async () => {
    const parsed = savedMealInput(form);
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }
    setBusy("saving");
    const saved = food ? await savedMeals.update(food.id, parsed.input) : await savedMeals.create(parsed.input);
    setBusy(null);
    if (saved) onSaved(saved);
  };

  const remove = async () => {
    if (!food) return;
    setConfirmsDelete(false);
    setBusy("deleting");
    const deleted = await savedMeals.remove(food.id);
    setBusy(null);
    if (deleted) onDeleted();
  };

  const addPanel = (toAdd: IngredientFood) => (
    <IngredientPortion
      key={foodKey(toAdd)}
      food={toAdd}
      label="Add ingredient"
      onChoose={(portion) => {
        setIngredients((last) => [...last, { food: toAdd, portion }]);
        setAdding(null);
        setQuery("");
      }}
    />
  );

  return (
    <Screen scroll="screen" edges={["bottom"]}>
      <View style={styles.page}>
        <Heading size="lg">{food ? "Edit saved meal" : "New saved meal"}</Heading>
        {food ? (
          <Text color="muted">Changes what you log from now on. Days you've already logged stay as they were.</Text>
        ) : null}
        <View style={styles.fields}>
          <View style={styles.name}>
            <Text size="xs" weight="semiBold" color="muted">
              Name
            </Text>
            <Input>
              <InputField
                value={form.name}
                onChangeText={(name) => change({ name })}
                placeholder="e.g. Chicken chili"
                maxLength={100}
                accessibilityLabel="Name"
              />
            </Input>
          </View>
          <View style={styles.servings}>
            <Text size="xs" weight="semiBold" color="muted">
              Servings
            </Text>
            <Input>
              <InputField
                value={form.servings}
                onChangeText={(servings) => change({ servings })}
                keyboardType="decimal-pad"
                accessibilityLabel="How many servings it makes"
              />
            </Input>
          </View>
        </View>

        <View>
          <Text size="xs" color="muted" weight="semiBold">
            INGREDIENTS
          </Text>
          {form.ingredients.length ? null : (
            <Text size="sm" color="muted" style={styles.empty}>
              Search, scan or pick a food below to add it.
            </Text>
          )}
          {form.ingredients.map((ingredient, i) => {
            const { name, kcal } = ingredientLine(ingredient);
            const isOpen = openIndex === i;
            return (
              <View key={i} style={[styles.ingredient, { borderBottomColor: colors.line }]}>
                <Pressable
                  onPress={() => setOpenIndex(isOpen ? null : i)}
                  style={styles.row}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                  accessibilityHint="Change its portion, or remove it"
                >
                  <Text size="sm" style={styles.rowText}>
                    {name}
                  </Text>
                  <Text size="sm" color="muted">
                    {kcal}
                  </Text>
                  <Icon name={isOpen ? "chevronUp" : "chevronDown"} color="subtle" size={18} />
                </Pressable>
                {isOpen ? (
                  <IngredientPortion
                    food={ingredient.food}
                    portion={ingredient.portion}
                    label="Change"
                    onChoose={(portion) =>
                      setIngredients((last) => last.map((old, j) => (j === i ? { ...old, portion } : old)))
                    }
                    onRemove={() => setIngredients((last) => last.filter((_, j) => j !== i))}
                  />
                ) : null}
              </View>
            );
          })}
        </View>
        {perServing ? (
          <Text weight="semiBold" accessibilityLiveRegion="polite">
            {perServing}
          </Text>
        ) : null}

        <View style={styles.searchRow}>
          <Input style={styles.rowText}>
            <InputSlot>
              <InputIcon name="search" />
            </InputSlot>
            <InputField
              value={query}
              onChangeText={(words) => {
                setQuery(words);
                setAdding(null);
              }}
              placeholder="Search for an ingredient"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Search for an ingredient"
            />
            {query ? <InputClear onPress={() => setQuery("")} accessibilityLabel="Clear search" /> : null}
          </Input>
          <ScanButton
            onScanned={(code) => {
              setQuery("");
              void scanned(code);
            }}
          />
        </View>
        {lookingUp ? <Spinner /> : null}
        {searching ? (
          <View>
            {searchError ? (
              <Alert action="muted">
                <AlertText>{searchError}</AlertText>
              </Alert>
            ) : null}
            {isSearching ? <Spinner /> : null}
            {ingredientFoods(foods ?? []).map((found) => (
              <FoodRow
                key={foodKey(found)}
                food={found}
                open={addingKey === foodKey(found)}
                onToggle={() => open(found)}
              >
                {addPanel(found)}
              </FoodRow>
            ))}
            {foods && !ingredientFoods(foods).length && !isSearching && !searchError ? (
              <Text color="muted" centered>
                No foods match “{query.trim()}”.
              </Text>
            ) : null}
          </View>
        ) : (
          <>
            {adding ? (
              <FoodRow food={adding} open onToggle={() => open(null)}>
                {addPanel(adding)}
              </FoodRow>
            ) : null}
            {addChoices.length ? (
              <View style={styles.section}>
                <Text size="xs" color="muted" weight="semiBold">
                  RECENT AND SAVED
                </Text>
                <FoodChoiceChips
                  choices={addChoices}
                  chosen={addingKey}
                  onChoose={(key) => open(addChoices.find((c) => c.key === key)?.food ?? null)}
                />
              </View>
            ) : null}
          </>
        )}

        {error ? (
          <FormControl isInvalid>
            <FormControlError>
              <FormControlErrorText>{error}</FormControlErrorText>
            </FormControlError>
          </FormControl>
        ) : null}
        <View style={styles.buttons}>
          <LoadingButton label="Cancel" size="md" action="secondary" disabled={!!busy} onPress={onClose} />
          <LoadingButton label="Save" size="md" loading={busy === "saving"} disabled={!!busy} onPress={save} />
        </View>
        {food ? (
          <LoadingButton
            label="Delete saved meal"
            size="sm"
            action="negative"
            variant="link"
            icon="trash"
            loading={busy === "deleting"}
            disabled={!!busy}
            onPress={() => setConfirmsDelete(true)}
          />
        ) : null}
      </View>
      <ConfirmModal
        isOpen={confirmsDelete}
        title="Delete this Saved Meal?"
        message="Days you've already logged stay as they were."
        confirmLabel="Delete"
        onCancel={() => setConfirmsDelete(false)}
        onConfirm={remove}
      />
      {creatingFood ? (
        <SavedFoodEditor
          barcode={creatingFood}
          onClose={() => setCreatingFood(null)}
          onSaved={(made) => {
            setCreatingFood(null);
            open(made);
            onSavedFood();
          }}
        />
      ) : null}
    </Screen>
  );
}

// A portion of an ingredient, being added or changed
function IngredientPortion({
  food,
  portion: startPortion,
  label,
  onChoose,
  onRemove,
}: {
  food: IngredientFood;
  portion?: Portion;
  label: string;
  onChoose: (portion: Portion) => void;
  onRemove?: () => void;
}) {
  const portion = usePortion(food, startPortion);
  const chosen = portion.choice && portionOf(food, portion.choice);
  return (
    <View style={styles.portion}>
      <FoodPortionPanel food={food} portion={portion} />
      <View style={styles.buttons}>
        {onRemove ? (
          <LoadingButton label="Remove" size="sm" action="negative" variant="outline" onPress={onRemove} />
        ) : null}
        <LoadingButton label={label} size="sm" disabled={!chosen} onPress={() => chosen && onChoose(chosen)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: spacing[4] },
  fields: { flexDirection: "row", gap: spacing[2] },
  name: { flex: 1, gap: spacing[1] },
  servings: { width: 96, gap: spacing[1] },
  empty: { marginTop: spacing[2] },
  ingredient: { borderBottomWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: "row", alignItems: "center", gap: spacing[2], minHeight: 44 },
  rowText: { flex: 1 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  section: { gap: spacing[3] },
  portion: { gap: spacing[3], paddingVertical: spacing[2] },
  buttons: { flexDirection: "row", justifyContent: "flex-end", gap: spacing[2] },
});

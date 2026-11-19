import { loggableDates } from "@fit/engines";
import type { Food, FoodEntry, FoodEntryAdd, FoodEntryChange, Meal } from "@fit/shared";
import { useRef, useState } from "react";
import { StyleSheet, type TextInputInstance, View } from "react-native";
import { Alert, AlertText } from "@/components/alert";
import { Input, InputField, InputIcon, InputSlot } from "@/components/input";
import { Screen } from "@/components/screen";
import { Spinner } from "@/components/spinner";
import { Text } from "@/components/text";
import { DayRings } from "@/features/nutrition/components/day-rings";
import { useDay } from "@/features/nutrition/hooks/use-day";
import { useTimeZone } from "@/features/user/current-user-provider";
import { spacing } from "@/theme";
import { DayStepper } from "../components/day-stepper";
import { FoodResult } from "../components/food-result";
import { MealsCard } from "../components/meals-card";
import { WaterGlasses } from "../components/water-glasses";
import { useFoodEntries } from "../hooks/use-food-entries";
import { useFoodSearch } from "../hooks/use-food-search";
import { dayStepLabel } from "../today-so-far";

const keyOf = (food: Food) => `${food.source}:${food.id}`;

// The Food tab's Today so far (prototype variant J): the day stepper, three equal rings, the water glasses, search,
// then the day's meals.
// Logging needs a connection; offline it says so, and nothing the user chose is cleared by a failed write
export default function FoodView() {
  const timeZone = useTimeZone();
  const [daysBefore, setDaysBefore] = useState(0);
  // Today and the 6 days before it, in the user's timezone, as the API counts them
  const date = loggableDates(new Date(), timeZone)[daysBefore];
  const { day: loaded, isOffline, refresh } = useDay(date);
  // The last day loaded can be another one while the chosen day is on its way
  const day = loaded?.date === date ? loaded : undefined;
  const entries = useFoodEntries(refresh);

  const [query, setQuery] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [openMeal, setOpenMeal] = useState<Meal | null>(null);
  // The meal whose "Add to" was tapped, which a food found next goes into unless the user picks another
  const [addingTo, setAddingTo] = useState<Meal | null>(null);
  const search = useRef<TextInputInstance>(null);
  const { foods, isSearching, error } = useFoodSearch(query);
  const searching = query.trim().length >= 2;

  const addTo = (meal: Meal) => {
    setAddingTo(meal);
    search.current?.focus();
  };

  const log = async (add: FoodEntryAdd) => {
    const ok = await entries.add(date, add);
    if (ok) {
      setQuery("");
      setOpenKey(null);
      setAddingTo(null);
      setOpenMeal(add.meal);
    }
    return ok;
  };

  return (
    <Screen scroll="screen" edges={["bottom"]}>
      <View style={styles.page}>
        <DayStepper daysBefore={daysBefore} onChange={setDaysBefore} />
        {isOffline ? (
          <Alert action="muted">
            <AlertText>Logging food needs a connection. Nothing is saved on this phone until you have one.</AlertText>
          </Alert>
        ) : null}
        {day ? <DayRings day={day} only={["kcal", "protein", "fibre"]} size={72} /> : isOffline ? null : <Spinner />}
        {day ? <WaterGlasses key={day.date} day={day} onSaved={refresh} /> : null}
        <Input>
          <InputSlot>
            <InputIcon name="search" />
          </InputSlot>
          <InputField
            ref={search}
            value={query}
            onChangeText={setQuery}
            placeholder={addingTo ? `Search foods for ${addingTo}` : "Search foods"}
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search foods"
          />
        </Input>
        {searching ? (
          <View>
            {error ? (
              <Alert action="muted">
                <AlertText>{error}</AlertText>
              </Alert>
            ) : null}
            {isSearching ? <Spinner /> : null}
            {foods?.map((food) => (
              <FoodResult
                key={keyOf(food)}
                food={food}
                open={openKey === keyOf(food)}
                onToggle={() => setOpenKey((key) => (key === keyOf(food) ? null : keyOf(food)))}
                meal={addingTo}
                onLog={log}
              />
            ))}
            {foods && !foods.length && !isSearching && !error ? (
              <Text color="muted" centered style={{ marginTop: spacing[4] }}>
                No foods match “{query.trim()}”.
              </Text>
            ) : null}
          </View>
        ) : day ? (
          <MealsCard
            day={day}
            title={daysBefore === 0 ? "Today so far" : dayStepLabel(daysBefore)}
            openMeal={openMeal}
            onOpenMeal={setOpenMeal}
            onAddTo={addTo}
            onChange={async (entry: FoodEntry, change: FoodEntryChange) => {
              const ok = await entries.change(entry.id, change);
              // A Food Entry moved to another meal is shown there
              if (ok && change.meal) setOpenMeal(change.meal);
              return ok;
            }}
            onDelete={(entry: FoodEntry) => entries.remove(entry.id)}
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: spacing[4] },
});

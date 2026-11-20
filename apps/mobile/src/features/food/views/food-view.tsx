import { loggableDates } from "@fit/engines";
import type { Food, FoodEntry, FoodEntryAdd, FoodEntryChange, Meal } from "@fit/shared";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, type TextInputInstance, View } from "react-native";
import { useServerNotAnswering } from "@/api";
import { Alert, AlertText } from "@/components/alert";
import { Input, InputField, InputIcon, InputSlot } from "@/components/input";
import { LoadingButton } from "@/components/loading-button";
import { Screen } from "@/components/screen";
import { Spinner } from "@/components/spinner";
import { Text } from "@/components/text";
import { DayRings } from "@/features/nutrition/components/day-rings";
import { useDay } from "@/features/nutrition/hooks/use-day";
import { useTimeZone } from "@/features/user/current-user-provider";
import { spacing } from "@/theme";
import { DayStepper } from "../components/day-stepper";
import { type FoodHalf, FoodHalves } from "../components/food-halves";
import { FoodIdeas } from "../components/food-ideas";
import { FoodResult } from "../components/food-result";
import { MealsCard } from "../components/meals-card";
import { RecentAndSavedList } from "../components/recent-and-saved-list";
import { SavedFoodEditor } from "../components/saved-food-editor";
import { ScanButton } from "../components/scan-button";
import { WaterGlasses } from "../components/water-glasses";
import { useFoodEntries } from "../hooks/use-food-entries";
import { useFoodSearch } from "../hooks/use-food-search";
import { useRecentAndSaved } from "../hooks/use-recent-and-saved";
import { useSavedFoods } from "../hooks/use-saved-foods";
import { copyLabel } from "../recent-and-saved";
import { dayStepLabel } from "../today-so-far";

const keyOf = (food: Food) => `${food.source}:${food.id}`;

// Create food (with the barcode scanned, when it came from a scan), or a Saved Food being edited
// Create food from a scan keeps the barcode, and from a search starts with the words as its name
type Editing = { barcode?: string; name?: string } | { food: Food };

// The Food tab (prototype variant J), in two halves under a two-part control. Today so far: the day stepper, three
// equal rings, the water glasses, search and Scan, then the day's meals. Ideas and recent: the Coach's summary with
// its Food Ideas and the Diet, then Recent and Saved Foods as one-tap choices. Logging needs a connection; offline it says so, and nothing the user chose is cleared by a failed
// write
export default function FoodView() {
  const timeZone = useTimeZone();
  // Opens on Today so far (spec #158 story 43)
  const [half, setHalf] = useState<FoodHalf>("today");
  // Today's summary opens the Ideas half; the ask is cleared once it's followed, so the next one is followed too
  const { half: askedHalf } = useLocalSearchParams<{ half?: string }>();
  useEffect(() => {
    if (askedHalf !== "ideas") return;
    setHalf("ideas");
    setDaysBefore(0);
    router.setParams({ half: undefined });
  }, [askedHalf]);
  const [daysBefore, setDaysBefore] = useState(0);
  // Today and the 6 days before it, in the user's timezone, as the API counts them
  const date = loggableDates(new Date(), timeZone)[daysBefore];
  const { day: loaded, isOffline, refresh } = useDay(date);
  const serverNotAnswering = useServerNotAnswering();
  // The last day loaded can be another one while the chosen day is on its way
  const day = loaded?.date === date ? loaded : undefined;
  const recent = useRecentAndSaved();
  const { refresh: refreshRecent } = recent;
  // A food logged, copied or saved changes the day and Recent alike
  const reload = useCallback(() => {
    refresh();
    refreshRecent();
  }, [refresh, refreshRecent]);
  const entries = useFoodEntries(reload);

  const [query, setQuery] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [openMeal, setOpenMeal] = useState<Meal | null>(null);
  // The meal whose "Add to" was tapped, which a food found next goes into unless the user picks another
  const [addingTo, setAddingTo] = useState<Meal | null>(null);
  const search = useRef<TextInputInstance>(null);
  // Bumped when a Saved Food changes, so search shows it as it is now
  const [searchVersion, setSearchVersion] = useState(0);
  const { foods, isSearching, error } = useFoodSearch(query, searchVersion);
  const searching = query.trim().length >= 2;
  const savedFoods = useSavedFoods();
  // The food a scan found, or the one just made with Create food, open to log
  const [found, setFound] = useState<Food | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);
  // The Recent or Saved Food open to log on the Ideas and recent half
  const [chosen, setChosen] = useState<string | null>(null);

  // Spec #158 stories 65 to 68: a scan finds the food to log, or offers Create food when nothing has the barcode
  const scanned = async (code: string) => {
    setFound(null);
    setLookingUp(true);
    const lookup = await savedFoods.lookup(code);
    setLookingUp(false);
    if ("food" in lookup) setFound(lookup.food);
    else if ("notFound" in lookup) setEditing({ barcode: lookup.notFound });
  };

  const addTo = (meal: Meal) => {
    setAddingTo(meal);
    search.current?.focus();
  };

  const log = async (add: FoodEntryAdd) => {
    const ok = await entries.add(date, add);
    if (ok) {
      setQuery("");
      setFound(null);
      setOpenKey(null);
      setChosen(null);
      setAddingTo(null);
      setOpenMeal(add.meal);
      // A food added from Ideas and recent is shown in its meal
      setHalf("today");
    }
    return ok;
  };

  const savedFoodChanged = () => {
    setSearchVersion((v) => v + 1);
    refreshRecent();
  };

  return (
    <Screen scroll="screen" edges={["bottom"]}>
      <View style={styles.page}>
        <FoodHalves half={half} onChange={setHalf} />
        {isOffline ? (
          <Alert action="muted">
            <AlertText>
              {serverNotAnswering
                ? "Fit Coach isn't answering, so food can't be logged just now. Try again in a minute."
                : "Logging food needs a connection. Nothing is saved on this phone until you have one."}
            </AlertText>
          </Alert>
        ) : null}
        {half === "ideas" ? (
          <>
            {daysBefore > 0 ? (
              <Text size="sm" color="muted">
                {`Adding to ${dayStepLabel(daysBefore).toLowerCase()}.`}
              </Text>
            ) : null}
            {day ? <FoodIdeas day={day} onLog={log} /> : isOffline ? null : <Spinner />}
            <RecentAndSavedList
              choices={recent.choices}
              error={recent.error}
              chosen={chosen}
              onChoose={setChosen}
              // The meal tapped, or the one for the time of day, as Food Ideas go into
              meal={addingTo ?? day?.ideaMeal ?? null}
              onLog={log}
              onEdit={(food) => setEditing({ food })}
            />
          </>
        ) : (
          <>
            <DayStepper daysBefore={daysBefore} onChange={setDaysBefore} />
            {day ? (
              <DayRings day={day} only={["kcal", "protein", "fibre"]} size={72} />
            ) : isOffline ? null : (
              <Spinner />
            )}
            {day ? <WaterGlasses key={day.date} day={day} onSaved={refresh} /> : null}
            <View style={styles.searchRow}>
              <Input style={styles.search}>
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
              <ScanButton onScanned={scanned} />
            </View>
            {lookingUp ? <Spinner /> : null}
            {found ? (
              <View>
                <Text size="sm" weight="semiBold" color="muted">
                  {found.source === "saved" ? "From your Saved Foods" : "Scanned"}
                </Text>
                <FoodResult
                  food={found}
                  open
                  onToggle={() => setFound(null)}
                  meal={addingTo}
                  onLog={log}
                  onEdit={(food) => setEditing({ food })}
                />
              </View>
            ) : null}
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
                    onEdit={(food) => setEditing({ food })}
                  />
                ))}
                {foods && !foods.length && !isSearching && !error ? (
                  <Text color="muted" centered style={{ marginTop: spacing[4] }}>
                    No foods match “{query.trim()}”.
                  </Text>
                ) : null}
                {foods && !isSearching ? (
                  <LoadingButton
                    label="Create food from its label"
                    size="sm"
                    action="secondary"
                    variant="link"
                    icon="plus"
                    onPress={() => setEditing({ name: query.trim() })}
                    style={styles.create}
                  />
                ) : null}
              </View>
            ) : day ? (
              <MealsCard
                day={day}
                title={daysBefore === 0 ? "Today so far" : dayStepLabel(daysBefore)}
                openMeal={openMeal}
                onOpenMeal={setOpenMeal}
                onAddTo={addTo}
                copyLabel={copyLabel(daysBefore)}
                onCopy={(meal: Meal) => entries.copy(date, meal)}
                onChange={async (entry: FoodEntry, change: FoodEntryChange) => {
                  const ok = await entries.change(entry.id, change);
                  // A Food Entry moved to another meal is shown there
                  if (ok && change.meal) setOpenMeal(change.meal);
                  return ok;
                }}
                onDelete={(entry: FoodEntry) => entries.remove(entry.id)}
              />
            ) : null}
          </>
        )}
      </View>
      {editing ? (
        <SavedFoodEditor
          food={"food" in editing ? editing.food : undefined}
          barcode={"barcode" in editing ? editing.barcode : undefined}
          name={"name" in editing ? editing.name : undefined}
          onClose={() => setEditing(null)}
          onSaved={(food) => {
            setEditing(null);
            savedFoodChanged();
            // A Saved Food fixed from Ideas and recent stays open there to log
            if (half === "ideas") setChosen(keyOf(food));
            // A food just made or fixed opens to log it: in the search it came from, or on its own after a scan
            else if (searching) {
              setFound(null);
              setOpenKey(keyOf(food));
            } else setFound(food);
          }}
          onDeleted={() => {
            setEditing(null);
            savedFoodChanged();
            setFound(null);
            setChosen(null);
          }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: spacing[4] },
  searchRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  search: { flex: 1 },
  create: { alignSelf: "center", marginTop: spacing[2] },
});

import { portionNutrients } from "@fit/engines";
import {
  type DayMeal,
  type DayTotals,
  type Food,
  type FoodEntry,
  type FoodEntryAdd,
  type FoodEntryChange,
  MEALS,
  type Meal,
  type Portion,
  type PortionChoice,
} from "@fit/shared";
import { ObjectId } from "mongodb";
import { db } from "./db";

// The shape of a Food Entry document in MongoDB. The ObjectId orders entries logged in the same millisecond
type FoodEntryDoc = Omit<FoodEntry, "id" | "loggedAt"> & { _id: ObjectId; clerkUserId: string; loggedAt: Date };

const foodEntries = db.collection<FoodEntryDoc>("foodEntries");

export async function ensureFoodEntryIndexes() {
  // A day's entries, in the order they were logged
  await foodEntries.createIndex({ clerkUserId: 1, date: 1, loggedAt: 1, _id: 1 });
}

// The grams a portion choice comes to, with the serving it was chosen as. Null for a serving the food doesn't have
function portionOf(food: Food, choice: PortionChoice): Portion | null {
  if ("grams" in choice) return { grams: choice.grams };
  const serving = food.servings.find((s) => s.label === choice.serving);
  if (!serving) return null;
  return { grams: serving.grams * choice.count, serving: { label: serving.label, count: choice.count } };
}

const toEntry = ({ _id, date, meal, loggedAt, food, portion, nutrients }: FoodEntryDoc): FoodEntry => ({
  id: _id.toHexString(),
  date,
  meal,
  loggedAt: loggedAt.toISOString(),
  food,
  portion,
  nutrients,
});

// Logs a food into a meal of the date, its portion's nutrients worked out now and kept (ADR 0002). Null when the
// portion names a serving the food doesn't have
export async function addFoodEntry(
  clerkUserId: string,
  date: string,
  { meal, food, portion: choice }: FoodEntryAdd,
): Promise<FoodEntry | null> {
  const portion = portionOf(food, choice);
  if (!portion) return null;
  const doc: FoodEntryDoc = {
    _id: new ObjectId(),
    clerkUserId,
    date,
    meal,
    loggedAt: new Date(),
    food,
    portion,
    nutrients: portionNutrients(food.per100g, portion.grams),
  };
  await foodEntries.insertOne(doc);
  return toEntry(doc);
}

// The user's Food Entry by its id, or null when they have none with that id
export async function findFoodEntry(clerkUserId: string, id: string): Promise<FoodEntry | null> {
  if (!ObjectId.isValid(id)) return null;
  const doc = await foodEntries.findOne({ clerkUserId, _id: new ObjectId(id) });
  return doc && toEntry(doc);
}

// Moves a Food Entry to another meal, or changes its portion, working the nutrients out again from the food as it was
// logged. Null when the portion names a serving the food doesn't have, or there's no such entry
export async function changeFoodEntry(
  clerkUserId: string,
  entry: FoodEntry,
  { meal, portion: choice }: FoodEntryChange,
): Promise<FoodEntry | null> {
  const portion = choice ? portionOf(entry.food, choice) : entry.portion;
  if (!portion) return null;
  const doc = await foodEntries.findOneAndUpdate(
    { clerkUserId, _id: new ObjectId(entry.id) },
    // Replaced whole, so a portion in grams drops the serving the old one was chosen as
    { $set: { meal: meal ?? entry.meal, portion, nutrients: portionNutrients(entry.food.per100g, portion.grams) } },
    { returnDocument: "after" },
  );
  return doc && toEntry(doc);
}

// Deletes the user's Food Entry. False when there was none with that id
export async function deleteFoodEntry(clerkUserId: string, id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  return (await foodEntries.deleteOne({ clerkUserId, _id: new ObjectId(id) })).deletedCount === 1;
}

const NOTHING: DayTotals = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fibreG: 0 };

// A date's four meals with their Food Entries, and the totals they add up to
export async function findMeals(clerkUserId: string, date: string): Promise<{ meals: DayMeal[]; totals: DayTotals }> {
  const entries = (await foodEntries.find({ clerkUserId, date }).sort({ loggedAt: 1, _id: 1 }).toArray()).map(toEntry);
  const totals = entries.reduce(
    (sum, { nutrients: n }) => ({
      kcal: sum.kcal + n.kcal,
      proteinG: sum.proteinG + n.proteinG,
      carbsG: sum.carbsG + n.carbsG,
      fatG: sum.fatG + n.fatG,
      fibreG: sum.fibreG + n.fibreG,
    }),
    NOTHING,
  );
  const meals = MEALS.map((meal: Meal) => ({ meal, entries: entries.filter((e) => e.meal === meal) }));
  return { meals, totals };
}

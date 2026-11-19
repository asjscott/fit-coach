import { dayBefore, portionNutrients, portionOf } from "@fit/engines";
import {
  type DayMeal,
  type DayTotals,
  type Food,
  type FoodEntry,
  type FoodEntryAdd,
  type FoodEntryChange,
  MEALS,
  type Meal,
} from "@fit/shared";
import { ObjectId } from "mongodb";
import { db } from "./db";
import { isDuplicateKey } from "./duplicate-key";

// The shape of a Food Entry document in MongoDB. The ObjectId orders entries logged in the same millisecond. A copy
// keeps the entry it was copied from, so one request's copies are told apart
type FoodEntryDoc = Omit<FoodEntry, "id" | "loggedAt"> & {
  _id: ObjectId;
  clerkUserId: string;
  loggedAt: Date;
  requestId?: string;
  copiedFrom?: ObjectId;
};

const foodEntries = db.collection<FoodEntryDoc>("foodEntries");

export async function ensureFoodEntryIndexes() {
  // A day's entries, in the order they were logged
  await foodEntries.createIndex({ clerkUserId: 1, date: 1, loggedAt: 1, _id: 1 });
  // Recent: the user's entries, last logged first
  await foodEntries.createIndex({ clerkUserId: 1, loggedAt: -1, _id: -1 });
  // A request sent again adds nothing more: one entry per log, one per entry copied
  await foodEntries.createIndex(
    { clerkUserId: 1, requestId: 1, copiedFrom: 1 },
    { unique: true, partialFilterExpression: { requestId: { $exists: true } } },
  );
}

// What a request already added, oldest first: none for a new request
const addedBy = (clerkUserId: string, requestId: string) =>
  foodEntries.find({ clerkUserId, requestId }).sort({ loggedAt: 1, _id: 1 }).toArray();

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
// portion names a serving the food doesn't have. A request id already logged answers its Food Entry, not created
export async function addFoodEntry(
  clerkUserId: string,
  date: string,
  { meal, food, portion: choice, requestId }: FoodEntryAdd,
): Promise<{ entry: FoodEntry; created: boolean } | null> {
  const portion = portionOf(food, choice);
  if (!portion) return null;
  if (requestId) {
    const [added] = await addedBy(clerkUserId, requestId);
    if (added) return { entry: toEntry(added), created: false };
  }
  const doc: FoodEntryDoc = {
    _id: new ObjectId(),
    clerkUserId,
    date,
    meal,
    loggedAt: new Date(),
    food,
    portion,
    nutrients: portionNutrients(food.per100g, portion.grams),
    ...(requestId && { requestId }),
  };
  try {
    await foodEntries.insertOne(doc);
  } catch (err) {
    // The same request, racing this one, logged it first
    const [added] = requestId && isDuplicateKey(err) ? await addedBy(clerkUserId, requestId) : [];
    if (!added) throw err;
    return { entry: toEntry(added), created: false };
  }
  return { entry: toEntry(doc), created: true };
}

// Copy from yesterday: the meal's Food Entries on the day before go into the same meal of the date, after any already
// there (spec #158 stories 52 to 54). Each copy is a new Food Entry, the food, portion and snapshot as they were. A
// request id already copied answers its copies, not created
export async function copyMealFromDayBefore(
  clerkUserId: string,
  date: string,
  meal: Meal,
  requestId?: string,
): Promise<{ entries: FoodEntry[]; created: boolean }> {
  if (requestId) {
    const added = await addedBy(clerkUserId, requestId);
    if (added.length) return { entries: added.map(toEntry), created: false };
  }
  const before = await foodEntries
    .find({ clerkUserId, date: dayBefore(date), meal })
    .sort({ loggedAt: 1, _id: 1 })
    .toArray();
  if (!before.length) return { entries: [], created: true };
  // One time for them all, after everything already logged; the ObjectIds keep their order
  const loggedAt = new Date();
  const copies: FoodEntryDoc[] = before.map(({ _id, food, portion, nutrients }) => ({
    _id: new ObjectId(),
    clerkUserId,
    date,
    meal,
    loggedAt,
    food,
    portion,
    nutrients,
    ...(requestId && { requestId, copiedFrom: _id }),
  }));
  try {
    await foodEntries.insertMany(copies);
  } catch (err) {
    // The same request, racing this one, copied them first
    if (!(requestId && isDuplicateKey(err))) throw err;
    return { entries: (await addedBy(clerkUserId, requestId)).map(toEntry), created: false };
  }
  return { entries: copies.map(toEntry), created: true };
}

// How many foods Recent lists ("about 20", spec #158)
export const RECENT_FOODS = 20;

// Recent: the foods the user has logged, each once as it was last logged, most recently logged first. Worked out from
// the Food Entries, not stored
export async function recentFoods(clerkUserId: string): Promise<Food[]> {
  const latest = await foodEntries
    .aggregate<{ food: Food }>([
      { $match: { clerkUserId } },
      { $sort: { loggedAt: -1, _id: -1 } },
      {
        $group: {
          _id: { source: "$food.source", id: "$food.id" },
          food: { $first: "$food" },
          loggedAt: { $first: "$loggedAt" },
          entryId: { $first: "$_id" },
        },
      },
      { $sort: { loggedAt: -1, entryId: -1 } },
      { $limit: RECENT_FOODS },
      { $project: { _id: 0, food: 1 } },
    ])
    .toArray();
  return latest.map(({ food }) => food);
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

import { portionOf, savedMealFood } from "@fit/engines";
import type { Food, Ingredient, SavedMealCreate, SavedMealInput } from "@fit/shared";
import { ObjectId } from "mongodb";
import { db } from "./db";
import { isDuplicateKey } from "./duplicate-key";
import { BY_NAME, nameMatches, SEARCH_LIMIT } from "./saved-foods";

// The shape of a Saved Meal document in MongoDB (spec #188, "Saved Meals"): each ingredient is a copy of its food, so
// a later change to a Saved Food doesn't change the meal
type SavedMealDoc = {
  _id: ObjectId;
  clerkUserId: string;
  name: string;
  servings: number;
  cookedGrams?: number;
  ingredients: Ingredient[];
  requestId?: string;
  updatedAt: Date;
};

const savedMeals = db.collection<SavedMealDoc>("savedMeals");

export async function ensureSavedMealIndexes() {
  await savedMeals.createIndex({ clerkUserId: 1, name: 1 });
  // A request sent again makes nothing more
  await savedMeals.createIndex(
    { clerkUserId: 1, requestId: 1 },
    { unique: true, partialFilterExpression: { requestId: { $exists: true } } },
  );
}

const toFood = ({ _id, name, servings, ingredients, cookedGrams }: SavedMealDoc): Food =>
  savedMealFood({ id: _id.toHexString(), name, servings, ingredients, cookedGrams });

// The ingredients with their grams worked out. Null when a portion names a serving its food doesn't have
function ingredientsOf(inputs: SavedMealInput["ingredients"]): Ingredient[] | null {
  const ingredients: Ingredient[] = [];
  for (const { food, portion: choice } of inputs) {
    const portion = portionOf(food, choice);
    if (!portion) return null;
    ingredients.push({ food, portion });
  }
  return ingredients;
}

// Makes a Saved Meal. "noServing" when an ingredient's portion names a serving its food doesn't have. A request id
// already saved answers its Saved Meal, not created
export async function createSavedMeal(
  clerkUserId: string,
  { name, servings, ingredients: inputs, cookedGrams, requestId }: SavedMealCreate,
): Promise<{ food: Food; created: boolean } | "noServing"> {
  const ingredients = ingredientsOf(inputs);
  if (!ingredients) return "noServing";
  const doc: SavedMealDoc = {
    _id: new ObjectId(),
    clerkUserId,
    name,
    servings,
    ingredients,
    ...(cookedGrams && { cookedGrams }),
    ...(requestId && { requestId }),
    updatedAt: new Date(),
  };
  try {
    await savedMeals.insertOne(doc);
  } catch (err) {
    const made = requestId && isDuplicateKey(err) ? await savedMeals.findOne({ clerkUserId, requestId }) : null;
    if (!made) throw err;
    return { food: toFood(made), created: false };
  }
  return { food: toFood(doc), created: true };
}

// Replaces a Saved Meal's name, servings, ingredients and cooked weight, cleared when there's none. Food Entries logged
// from it keep their own copy, so no day changes. Null when the user has no Saved Meal with that id
export async function updateSavedMeal(
  clerkUserId: string,
  id: string,
  { name, servings, ingredients: inputs, cookedGrams }: SavedMealInput,
): Promise<Food | "noServing" | null> {
  if (!ObjectId.isValid(id)) return null;
  const ingredients = ingredientsOf(inputs);
  if (!ingredients) return "noServing";
  const doc = await savedMeals.findOneAndUpdate(
    { clerkUserId, _id: new ObjectId(id) },
    {
      $set: { name, servings, ingredients, ...(cookedGrams && { cookedGrams }), updatedAt: new Date() },
      ...(!cookedGrams && { $unset: { cookedGrams: "" } }),
    },
    { returnDocument: "after" },
  );
  return doc && toFood(doc);
}

// Deletes the user's Saved Meal. False when they had none with that id
export async function deleteSavedMeal(clerkUserId: string, id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  return (await savedMeals.deleteOne({ clerkUserId, _id: new ObjectId(id) })).deletedCount === 1;
}

// The user's Saved Meals as foods to log, by name
export async function listSavedMeals(clerkUserId: string): Promise<Food[]> {
  return (await savedMeals.find({ clerkUserId }).collation(BY_NAME).sort({ name: 1 }).toArray()).map(toFood);
}

// The user's Saved Meals that match a search by name, as Saved Foods do
export async function searchSavedMeals(clerkUserId: string, query: string): Promise<Food[]> {
  const docs = await savedMeals
    .find({ clerkUserId, ...nameMatches(query) })
    .collation(BY_NAME)
    .sort({ name: 1 })
    .limit(SEARCH_LIMIT)
    .toArray();
  return docs.map(toFood);
}

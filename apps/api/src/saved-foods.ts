import { type Food, type Nutrients, SavedFoodInput } from "@fit/shared";
import { ObjectId } from "mongodb";
import { db } from "./db";
import { barcodeKey } from "./food-sources/barcode";

// The shape of a Saved Food document in MongoDB: a food the user made from a label (spec #158, "Saved Foods and
// Recent"). `barcodeKey` is the barcode without its leading zeros, so a scan reads it however the phone sees the code
type SavedFoodDoc = {
  _id: ObjectId;
  clerkUserId: string;
  name: string;
  brand?: string;
  barcode?: string;
  barcodeKey?: string;
  per100g: Nutrients;
  servings: Food["servings"];
  updatedAt: Date;
};

const savedFoods = db.collection<SavedFoodDoc>("savedFoods");

const DUPLICATE_KEY = 11000;

export async function ensureSavedFoodIndexes() {
  // One Saved Food per barcode per user, so a scan finds one food
  await savedFoods.createIndex(
    { clerkUserId: 1, barcodeKey: 1 },
    { unique: true, partialFilterExpression: { barcodeKey: { $exists: true } } },
  );
  await savedFoods.createIndex({ clerkUserId: 1, name: 1 });
}

const toFood = ({ _id, name, brand, barcode, per100g, servings }: SavedFoodDoc): Food => ({
  source: "saved",
  id: _id.toHexString(),
  name,
  ...(brand ? { brand } : {}),
  ...(barcode ? { barcode } : {}),
  per100g,
  servings,
});

// To a thousandth, so 190 kcal in 60 g keeps no float noise and still reads back as 190 kcal a serving
const per100 = (amount: number, grams: number) => Math.round((amount / grams) * 100 * 1000) / 1000;

// A label's serving and what it holds, as the document keeps it: per 100 g, the serving the food's first
function fieldsOf(input: SavedFoodInput) {
  const { name, brand, barcode, serving, perServing } = SavedFoodInput.parse(input);
  const { grams } = serving;
  return {
    name,
    brand,
    barcode,
    barcodeKey: barcode && barcodeKey(barcode),
    per100g: {
      kcal: per100(perServing.kcal, grams),
      proteinG: per100(perServing.proteinG, grams),
      carbsG: per100(perServing.carbsG, grams),
      fatG: per100(perServing.fatG, grams),
      fibreG: per100(perServing.fibreG, grams),
    },
    servings: [{ label: serving.label ?? "1 serving", grams }],
  };
}

// Keys left undefined are dropped rather than stored as null
const withoutUndefined = <T extends object>(fields: T) =>
  Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)) as T;

const isDuplicateKey = (err: unknown) => (err as { code?: number }).code === DUPLICATE_KEY;

// Makes a Saved Food from a label. "taken" when another of the user's Saved Foods already has the barcode
export async function createSavedFood(clerkUserId: string, input: SavedFoodInput): Promise<Food | "taken"> {
  const doc = { _id: new ObjectId(), clerkUserId, ...withoutUndefined(fieldsOf(input)), updatedAt: new Date() };
  try {
    await savedFoods.insertOne(doc);
  } catch (err) {
    if (isDuplicateKey(err)) return "taken";
    throw err;
  }
  return toFood(doc);
}

// Replaces a Saved Food with what the label says now. Food Entries logged from it keep their own copy, so no day
// changes. Null when the user has no Saved Food with that id; "taken" when another of theirs has the barcode
export async function updateSavedFood(
  clerkUserId: string,
  id: string,
  input: SavedFoodInput,
): Promise<Food | "taken" | null> {
  if (!ObjectId.isValid(id)) return null;
  try {
    const doc = await savedFoods.findOneAndReplace(
      { clerkUserId, _id: new ObjectId(id) },
      { clerkUserId, ...withoutUndefined(fieldsOf(input)), updatedAt: new Date() },
      { returnDocument: "after" },
    );
    return doc && toFood(doc);
  } catch (err) {
    if (isDuplicateKey(err)) return "taken";
    throw err;
  }
}

// Deletes the user's Saved Food. False when they had none with that id
export async function deleteSavedFood(clerkUserId: string, id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  return (await savedFoods.deleteOne({ clerkUserId, _id: new ObjectId(id) })).deletedCount === 1;
}

// The user's Saved Foods, by name
export async function listSavedFoods(clerkUserId: string): Promise<Food[]> {
  return (await savedFoods.find({ clerkUserId }).collation(BY_NAME).sort({ name: 1 }).toArray()).map(toFood);
}

const BY_NAME = { locale: "en", strength: 2 };
const SEARCH_LIMIT = 10;
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The user's Saved Foods whose name has every word of the search in it, whatever the case, by name
export async function searchSavedFoods(clerkUserId: string, query: string): Promise<Food[]> {
  const words = query.trim().split(/\s+/).filter(Boolean);
  const docs = await savedFoods
    .find({ clerkUserId, $and: words.map((word) => ({ name: { $regex: escapeRegExp(word), $options: "i" } })) })
    .collation(BY_NAME)
    .sort({ name: 1 })
    .limit(SEARCH_LIMIT)
    .toArray();
  return docs.map(toFood);
}

// The user's Saved Food with this barcode, read however the phone sees it, or null
export async function findSavedFoodByBarcode(clerkUserId: string, code: string): Promise<Food | null> {
  const doc = await savedFoods.findOne({ clerkUserId, barcodeKey: barcodeKey(code) });
  return doc && toFood(doc);
}

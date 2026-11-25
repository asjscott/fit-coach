import type { Food } from "@fit/shared";
import { listSavedFoods, searchSavedFoods } from "./saved-foods";
import { listSavedMeals, searchSavedMeals } from "./saved-meals";

// As MongoDB's BY_NAME collation orders each list
const byName = (a: Food, b: Food) => a.name.localeCompare(b.name, "en", { sensitivity: "accent" });

// The user's Saved Foods and Saved Meals together, by name (spec #188 story 38)
export async function savedFoodsAndMeals(clerkUserId: string): Promise<Food[]> {
  return (await Promise.all([listSavedFoods(clerkUserId), listSavedMeals(clerkUserId)])).flat().sort(byName);
}

// Those that match a search by name, by name
export async function searchSavedFoodsAndMeals(clerkUserId: string, query: string): Promise<Food[]> {
  const found = [searchSavedFoods(clerkUserId, query), searchSavedMeals(clerkUserId, query)];
  return (await Promise.all(found)).flat().sort(byName);
}

import type { Food } from "@fit/shared";
import { byName } from "./name-search";
import { listSavedFoods, searchSavedFoods } from "./saved-foods";
import { listSavedMeals, searchSavedMeals } from "./saved-meals";

// The user's Saved Foods and Saved Meals together, by name (spec #188 story 38)
export async function savedFoodsAndMeals(clerkUserId: string): Promise<Food[]> {
  return (await Promise.all([listSavedFoods(clerkUserId), listSavedMeals(clerkUserId)])).flat().sort(byName);
}

// Those that match a search by name, by name
export async function searchSavedFoodsAndMeals(clerkUserId: string, query: string): Promise<Food[]> {
  const found = [searchSavedFoods(clerkUserId, query), searchSavedMeals(clerkUserId, query)];
  return (await Promise.all(found)).flat().sort(byName);
}

import type { DailyTargets, Diet, DietKind, Food, FoodIdea, FoodIdeaKind, Meal, Nutrients } from "@fit/shared";
import { FOOD_IDEAS } from "./data/food-ideas";
import { portionNutrients } from "./food-portion";
import { nutritionRanges, rangeState } from "./nutrition-ranges";

// The kinds of Food Idea each Diet eats
const KINDS: Record<DietKind, FoodIdeaKind[]> = {
  any: ["meat", "fish", "vegetarian", "vegan"],
  pescatarian: ["fish", "vegetarian", "vegan"],
  vegetarian: ["vegetarian", "vegan"],
  vegan: ["vegan"],
};

// How many Food Ideas the Coach offers at once
const OFFERED = 2;

// The Food Ideas to fill what's left of the day: none once protein is in range, otherwise up to two the Diet allows,
// the most protein per kcal first, that together stay under the top of the kcal range (spec #188 stories 11 and 12)
export function foodIdeas(
  diet: Diet,
  targets: Pick<DailyTargets, "kcal" | "proteinG">,
  totals: Pick<Nutrients, "kcal" | "proteinG">,
  ideas = FOOD_IDEAS,
): FoodIdea[] {
  const ranges = nutritionRanges(targets);
  if (rangeState(totals.proteinG, ranges.proteinG).state !== "below") return [];
  const proteinPerKcal = ({ nutrients }: FoodIdea) => nutrients.proteinG / nutrients.kcal;
  const allowed = ideas
    .filter((idea) => KINDS[diet.kind].includes(idea.kind))
    .filter((idea) => !idea.contains.some((food) => diet.avoid.includes(food)))
    .sort((a, b) => proteinPerKcal(b) - proteinPerKcal(a));

  const offered: FoodIdea[] = [];
  let kcal = totals.kcal;
  for (const idea of allowed) {
    if (offered.length === OFFERED) break;
    if (rangeState(kcal + idea.nutrients.kcal, ranges.kcal).state === "over") continue;
    offered.push(idea);
    kcal += idea.nutrients.kcal;
  }
  return offered;
}

// A Food Idea as the one food shape, to log through the same route as any food: its portion is its one serving
export function ideaFood({ id, name, portion, nutrients }: FoodIdea): Food {
  // The portion's figures scaled to 100 g: as if the portion weighed 100 g for each 100 g it holds
  return {
    source: "idea",
    id,
    name,
    per100g: portionNutrients(nutrients, (100 * 100) / portion.grams),
    servings: [portion],
  };
}

// The meal a Food Idea is added into: the one for the time of day in the user's timezone
export function mealForTimeOfDay(now: Date, timeZone: string): Meal {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone, hour: "numeric", hourCycle: "h23" }).format(now));
  if (hour < 11) return "breakfast";
  if (hour < 16) return "lunch";
  if (hour < 21) return "dinner";
  return "snacks";
}

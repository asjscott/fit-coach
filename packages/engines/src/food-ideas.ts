import type { Diet, DietKind, Food, FoodIdea, FoodIdeaKind, Meal } from "@fit/shared";
import { FOOD_IDEAS } from "./data/food-ideas";

// The kinds of Food Idea each Diet eats
const KINDS: Record<DietKind, FoodIdeaKind[]> = {
  any: ["meat", "fish", "vegetarian", "vegan"],
  pescatarian: ["fish", "vegetarian", "vegan"],
  vegetarian: ["vegetarian", "vegan"],
  vegan: ["vegan"],
};

// How many Food Ideas the Coach offers at once
const OFFERED = 2;

// The Food Ideas to fill what's left of the day (spec #158 "Diet and Food Ideas"): none once protein is met, otherwise
// the two with the most protein per kcal that the Diet allows and that fit in the kcal left
export function foodIdeas(diet: Diet, kcalLeft: number, proteinLeft: number, ideas = FOOD_IDEAS): FoodIdea[] {
  if (proteinLeft <= 0) return [];
  const proteinPerKcal = ({ nutrients }: FoodIdea) => nutrients.proteinG / nutrients.kcal;
  return ideas
    .filter((idea) => KINDS[diet.kind].includes(idea.kind))
    .filter((idea) => !idea.contains.some((food) => diet.avoid.includes(food)))
    .filter((idea) => idea.nutrients.kcal <= kcalLeft)
    .sort((a, b) => proteinPerKcal(b) - proteinPerKcal(a))
    .slice(0, OFFERED);
}

// A Food Idea as the one food shape, to log through the same route as any food: its portion is its one serving
export function ideaFood({ id, name, portion, nutrients }: FoodIdea): Food {
  const per100 = (value: number) => (value * 100) / portion.grams;
  return {
    source: "idea",
    id,
    name,
    per100g: {
      kcal: per100(nutrients.kcal),
      proteinG: per100(nutrients.proteinG),
      carbsG: per100(nutrients.carbsG),
      fatG: per100(nutrients.fatG),
      fibreG: per100(nutrients.fibreG),
    },
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

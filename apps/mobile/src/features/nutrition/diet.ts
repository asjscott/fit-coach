import type { AvoidedFood, Diet, DietKind } from "@fit/shared";

export const DIET_KIND_LABELS: Record<DietKind, string> = {
  any: "Any",
  pescatarian: "Pescatarian",
  vegetarian: "Vegetarian",
  vegan: "Vegan",
};

export const AVOIDED_FOOD_LABELS: Record<AvoidedFood, string> = {
  dairy: "Dairy",
  gluten: "Gluten",
  nuts: "Nuts",
  pork: "Pork",
};

// The Diet in a few words: "Vegetarian, no dairy or gluten"
export function dietLabel(diet: Diet) {
  const kind = DIET_KIND_LABELS[diet.kind];
  if (!diet.avoid.length) return kind;
  const avoided = diet.avoid.map((food) => AVOIDED_FOOD_LABELS[food].toLowerCase());
  const list = avoided.length > 1 ? `${avoided.slice(0, -1).join(", ")} or ${avoided.at(-1)}` : avoided[0];
  return `${kind}, no ${list}`;
}

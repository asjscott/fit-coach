import { portionNutrients, portionOf } from "@fit/engines";
import type { Food, FoodProposal, PortionChoice } from "@fit/shared";
import { portionLine } from "../food/food-portion";
import { dayStepLabel, entryPortion, mealName } from "../food/today-so-far";
import { oneDecimal } from "../nutrition/format";

// The most a Food Entry takes (PortionChoice in @fit/shared)
const MAX_GRAMS = 5000;
const MAX_COUNT = 100;

const DAY_MS = 24 * 60 * 60 * 1000;
const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / DAY_MS);

// "Yesterday · Breakfast": where a proposal will be logged
export const proposalWhen = ({ date, meal }: Pick<FoodProposal, "date" | "meal">, today: string) =>
  `${dayStepLabel(daysBetween(date, today))} · ${mealName(meal)}`;

// The portion slider for a proposal: a counted serving in halves, or grams in steps that suit the size, each from
// a little up to twice what the Coach understood (at least 4 servings or 10 steps), never past what a Food Entry takes
export function proposalSlider(portion: PortionChoice) {
  if ("serving" in portion) {
    return {
      min: 0.5,
      max: Math.min(MAX_COUNT, Math.max(4, Math.ceil(portion.count * 2))),
      step: 0.5,
      value: portion.count,
    };
  }
  const { grams } = portion;
  const step = grams < 100 ? 5 : grams < 500 ? 10 : 25;
  const max = Math.min(MAX_GRAMS, Math.max(10 * step, Math.ceil((grams * 2) / step) * step));
  return { min: step, max, step, value: Math.max(step, grams) };
}

// The portion with the slider's value: the same serving, so many of it, or so many grams
export const portionAt = (portion: PortionChoice, value: number): PortionChoice =>
  "serving" in portion ? { serving: portion.serving, count: value } : { grams: value };

// "2 × 1 large egg · 100 g · 155 kcal · 12.6 g protein · 0 g fibre": a proposal's portion and what it holds, which
// follows the slider
export function proposalPortionLine(food: Food, portion: PortionChoice) {
  const grams = portionOf(food, portion)?.grams ?? 0;
  const nutrients = portionLine(portionNutrients(food.per100g, grams));
  if ("grams" in portion) return `${entryPortion({ grams })} · ${nutrients}`;
  return `${entryPortion({ grams, serving: { label: portion.serving, count: portion.count } })} · ${oneDecimal(grams)} g · ${nutrients}`;
}

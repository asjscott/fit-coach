import type { Nutrients, PortionChoice, Serving } from "@fit/shared";
import { oneDecimal, wholeNumber } from "../nutrition/format";

// What a portion is counted in: grams, or one of the food's own servings
export type PortionUnit = { unit: "g" } | { unit: "serving"; serving: Serving };

// The amount typed, read with a decimal point or comma. Null until it's a number above 0
export function amountOf(typed: string): number | null {
  const text = typed.trim().replace(",", ".");
  const value = /^\d*\.?\d+$/.test(text) ? Number(text) : NaN;
  return value > 0 ? value : null;
}

// The grams of a portion from the amount typed: grams as they are, a serving times its weight. Null until the amount
// is a number above 0
export function portionGrams(choice: PortionUnit, amount: string): number | null {
  const value = amountOf(amount);
  if (value === null) return null;
  return choice.unit === "g" ? value : value * choice.serving.grams;
}

// The portion as the API takes it: grams, or the serving's label and how many. The server works out the grams and
// what they hold. Null until the amount is a number above 0
export function portionChoice(choice: PortionUnit, amount: string): PortionChoice | null {
  const value = amountOf(amount);
  if (value === null) return null;
  return choice.unit === "g" ? { grams: value } : { serving: choice.serving.label, count: value };
}

// "441 kcal · 16 g protein · 1.9 g fibre": what a portion holds, as the Food tab shows it before it's logged
export const portionLine = ({ kcal, proteinG, fibreG }: Nutrients) =>
  `${wholeNumber(kcal)} kcal · ${oneDecimal(proteinG)} g protein · ${oneDecimal(fibreG)} g fibre`;

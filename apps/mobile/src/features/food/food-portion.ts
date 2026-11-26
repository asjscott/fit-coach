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

// How a portion's amount is first written to be changed, as digits that read back
export const startingAmount = (value: number) => String(Number(value < 0.01 ? value.toPrecision(2) : value.toFixed(2)));

// The amount a portion started from until something else is typed, so showing it rounded doesn't change it
export const amountChosen = (typed: string, start: number | null) =>
  start !== null && typed === startingAmount(start) ? start : amountOf(typed);

// The grams of a portion from its amount: grams as they are, a serving times its weight. Null without one
export function portionGrams(choice: PortionUnit, amount: number | null): number | null {
  if (amount === null) return null;
  return choice.unit === "g" ? amount : amount * choice.serving.grams;
}

// The portion as the API takes it: grams, or the serving's label and how many. The server works out the grams and
// what they hold. Null without an amount
export function portionChoice(choice: PortionUnit, amount: number | null): PortionChoice | null {
  if (amount === null) return null;
  return choice.unit === "g" ? { grams: amount } : { serving: choice.serving.label, count: amount };
}

// "441 kcal · 16 g protein · 1.9 g fibre": what a portion holds, as the Food tab shows it before it's logged
export const portionLine = ({ kcal, proteinG, fibreG }: Nutrients) =>
  `${wholeNumber(kcal)} kcal · ${oneDecimal(proteinG)} g protein · ${oneDecimal(fibreG)} g fibre`;

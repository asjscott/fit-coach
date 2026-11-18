import type { Nutrients, Serving } from "@fit/shared";

// What a portion is counted in: grams, or one of the food's own servings
export type PortionUnit = { unit: "g" } | { unit: "serving"; serving: Serving };

// The grams of a portion from the amount typed: grams as they are, a serving times its weight. Null until the amount
// is a number above 0
export function portionGrams(choice: PortionUnit, amount: string): number | null {
  const typed = amount.trim().replace(",", ".");
  const value = /^\d*\.?\d+$/.test(typed) ? Number(typed) : NaN;
  if (!(value > 0)) return null;
  return choice.unit === "g" ? value : value * choice.serving.grams;
}

const grams = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 1 });

// "441 kcal · 16 g protein · 1.9 g fibre": what a portion holds, as the Food tab shows it before it's logged
export const portionLine = ({ kcal, proteinG, fibreG }: Nutrients) =>
  `${Math.round(kcal).toLocaleString()} kcal · ${grams(proteinG)} g protein · ${grams(fibreG)} g fibre`;

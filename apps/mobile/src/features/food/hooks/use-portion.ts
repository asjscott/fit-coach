import type { Food, Portion } from "@fit/shared";
import { useState } from "react";
import { amountChosen, portionChoice, portionGrams, type PortionUnit, startingAmount } from "../food-portion";

const DEFAULT_GRAMS = "100";

// The portion being chosen for a food: its unit and the amount typed. Starts from a logged portion when one is given,
// else from the food's first serving, else 100 g
export function usePortion(food: Food, logged?: Portion) {
  const [unit, setUnit] = useState<PortionUnit>(() => {
    const serving = logged ? food.servings.find((s) => s.label === logged.serving?.label) : food.servings[0];
    return serving && (!logged || logged.serving) ? { unit: "serving", serving } : { unit: "g" };
  });
  // The logged portion's amount, until another unit is chosen
  const [start, setStart] = useState<number | null>(() => {
    if (!logged) return null;
    return unit.unit === "serving" && logged.serving ? logged.serving.count : logged.grams;
  });
  const [amount, setAmount] = useState(() =>
    start !== null ? startingAmount(start) : unit.unit === "g" ? DEFAULT_GRAMS : "1",
  );
  const chosen = amountChosen(amount, start);

  const choose = (next: PortionUnit) => {
    setUnit(next);
    setStart(null);
    setAmount(next.unit === "g" ? DEFAULT_GRAMS : "1");
  };

  return {
    unit,
    amount,
    setAmount,
    choose,
    grams: portionGrams(unit, chosen),
    // What to send the API, null until the amount is a number above 0
    choice: portionChoice(unit, chosen),
  };
}

export type PortionState = ReturnType<typeof usePortion>;

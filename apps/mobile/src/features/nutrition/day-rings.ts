import { type NutritionRange, nutritionRanges, rangeState } from "@fit/engines";
import type { Day } from "@fit/shared";
import { wholeNumber } from "./format";

export type DayRing = {
  key: "kcal" | "protein" | "fibre" | "water";
  // The number in the middle of the ring
  centre: string;
  // The words under it
  caption: string;
  // How full the ring is, 0 to 1
  progress: number;
  // The first lap: accent below the range, success once it's reached
  color: "accent" | "success";
  // How full the second lap, in danger, is, 0 to 1; none until the range is passed
  lap: number;
  // The ring in words, for screen readers
  label: string;
};

// Water in litres, to the 250 ml of a glass: 2.75, 1.5, 3
export const litres = (ml: number) => (ml / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 });
const progressOf = (done: number, target: number) => (target > 0 ? Math.min(1, Math.max(0, done / target)) : 0);

// How far the second lap is from the top of the range to twice the target, where it stays full
const lapOf = (amount: number, top: number, target: number) =>
  2 * target > top ? Math.min(1, (amount - top) / (2 * target - top)) : 1;

// An amount against its range (spec #188 stories 3 to 6): what's left to its bottom, in range, or how far over its top
function ranged(key: "kcal" | "protein", eaten: number, target: number, range: NutritionRange, unit: string): DayRing {
  const shown = Math.round(eaten);
  const { state, by } = rangeState(eaten, range);
  const bounds = `${wholeNumber(range.min)} to ${wholeNumber(range.max)}`;
  if (state === "below") {
    const centre = wholeNumber(by);
    return {
      key,
      centre,
      caption: `${unit} left`,
      progress: progressOf(shown, range.min),
      color: "accent",
      lap: 0,
      label: `${centre} ${unit} left to be in range, ${bounds}`,
    };
  }
  if (state === "in") {
    const centre = wholeNumber(shown);
    return {
      key,
      centre,
      caption: `${unit} in range`,
      progress: 1,
      color: "success",
      lap: 0,
      label: `${centre} ${unit}, in range, ${bounds}`,
    };
  }
  const centre = wholeNumber(by);
  return {
    key,
    centre,
    caption: `${unit} over`,
    progress: 1,
    color: "success",
    lap: lapOf(shown, range.max, target),
    label: `${centre} ${unit} over the range, ${bounds}`,
  };
}

// A day's four rings, as Today shows them (spec #158 story 32): kcal and protein against their ranges, fibre and water
// counting up towards their targets
export function dayRings({ targets, totals, waterMl }: Day): DayRing[] {
  const ranges = nutritionRanges(targets);
  const fibre = wholeNumber(totals.fibreG);
  const water = litres(waterMl);
  return [
    ranged("kcal", totals.kcal, targets.kcal, ranges.kcal, "kcal"),
    ranged("protein", totals.proteinG, targets.proteinG, ranges.proteinG, "g protein"),
    {
      key: "fibre",
      centre: fibre,
      caption: `of ${wholeNumber(targets.fibreG)} g fibre`,
      progress: progressOf(totals.fibreG, targets.fibreG),
      color: "accent",
      lap: 0,
      label: `${fibre} of ${wholeNumber(targets.fibreG)} g fibre`,
    },
    {
      key: "water",
      centre: water,
      caption: `of ${litres(targets.waterMl)} L`,
      progress: progressOf(waterMl, targets.waterMl),
      color: "accent",
      lap: 0,
      label: `${water} of ${litres(targets.waterMl)} L water`,
    },
  ];
}

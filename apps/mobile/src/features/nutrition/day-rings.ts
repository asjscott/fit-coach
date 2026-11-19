import type { Day } from "@fit/shared";

export type DayRing = {
  key: "kcal" | "protein" | "fibre" | "water";
  // The number in the middle of the ring
  centre: string;
  // The words under it
  caption: string;
  // How full the ring is, 0 to 1
  progress: number;
  // The ring in words, for screen readers
  label: string;
};

const whole = (value: number) => Math.round(value).toLocaleString();
// Water in litres, to the 250 ml of a glass: 2.75, 1.5, 3
export const litres = (ml: number) => (ml / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 });
const progressOf = (done: number, target: number) => (target > 0 ? Math.min(1, Math.max(0, done / target)) : 0);

// What's left of a target, never below none
function left(key: "kcal" | "protein", eaten: number, target: number, unit: string): DayRing {
  const centre = whole(Math.max(0, target - eaten));
  return {
    key,
    centre,
    caption: `${unit} left`,
    progress: progressOf(eaten, target),
    label: `${centre} ${unit} left of ${whole(target)}`,
  };
}

// A day's four rings, as Today shows them (spec #158 story 32): kcal and protein count down what's left, fibre and
// water count up towards their targets
export function dayRings({ targets, totals, waterMl }: Day): DayRing[] {
  const fibre = whole(totals.fibreG);
  const water = litres(waterMl);
  return [
    left("kcal", totals.kcal, targets.kcal, "kcal"),
    left("protein", totals.proteinG, targets.proteinG, "g protein"),
    {
      key: "fibre",
      centre: fibre,
      caption: `of ${whole(targets.fibreG)} g fibre`,
      progress: progressOf(totals.fibreG, targets.fibreG),
      label: `${fibre} of ${whole(targets.fibreG)} g fibre`,
    },
    {
      key: "water",
      centre: water,
      caption: `of ${litres(targets.waterMl)} L`,
      progress: progressOf(waterMl, targets.waterMl),
      label: `${water} of ${litres(targets.waterMl)} L water`,
    },
  ];
}

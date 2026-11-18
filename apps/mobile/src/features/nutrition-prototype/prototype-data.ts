// PROTOTYPE (M7), throwaway: fake numbers for the Today and Food tab variants. Nothing here is saved or real
import { useSyncExternalStore } from "react";

export const targets = { kcal: 2300, protein: 160, fibre: 92, water: 2750 };

export type Entry = { name: string; portion: string; kcal: number; protein: number; fibre: number };
export type Meal = { name: "Breakfast" | "Lunch" | "Dinner" | "Snacks"; entries: Entry[] };

export const meals: Meal[] = [
  {
    name: "Breakfast",
    entries: [
      { name: "Eggs, whole, cooked", portion: "2 large", kcal: 156, protein: 13, fibre: 0 },
      { name: "Dempster's 100% Whole Wheat", portion: "2 slices", kcal: 200, protein: 8, fibre: 6 },
      { name: "Raspberries", portion: "125 g", kcal: 65, protein: 1.5, fibre: 8 },
    ],
  },
  {
    name: "Lunch",
    entries: [
      { name: "Chicken breast, roasted", portion: "150 g", kcal: 248, protein: 46, fibre: 0 },
      { name: "Black beans, canned", portion: "1 cup", kcal: 227, protein: 15, fibre: 15 },
      { name: "Brown rice, cooked", portion: "150 g", kcal: 168, protein: 3.5, fibre: 3 },
      { name: "Greek yogurt, plain 0%", portion: "175 g", kcal: 105, protein: 18, fibre: 0 },
    ],
  },
  { name: "Dinner", entries: [] },
  {
    name: "Snacks",
    entries: [{ name: "Apple", portion: "1 medium", kcal: 95, protein: 0.5, fibre: 4.5 }],
  },
];

export const recent = ["Greek yogurt, plain 0%", "Oats, rolled", "Banana", "Chicken breast, roasted", "Lentils"];
export const saved = ["Mom's chili (bowl)", "Kirkland protein bar", "Overnight oats"];

const sum = (key: "kcal" | "protein" | "fibre") =>
  Math.round(meals.reduce((total, meal) => total + meal.entries.reduce((t, e) => t + e[key], 0), 0));

export const eatenBase = { kcal: sum("kcal"), protein: sum("protein"), fibre: sum("fibre") };

// The nudge only ever names kcal or protein (fibre and water are goals, never nagged): whichever is further behind
export function nudge(eaten: { kcal: number; protein: number }) {
  const proteinLeft = targets.protein - eaten.protein;
  const kcalLeft = targets.kcal - eaten.kcal;
  if (proteinLeft / targets.protein >= kcalLeft / targets.kcal && proteinLeft > 0)
    return `${proteinLeft} g of protein to go`;
  if (kcalLeft > 0) return `${kcalLeft.toLocaleString()} kcal left`;
  return "Today's targets are met";
}

export const fmt = (n: number) => Math.round(n).toLocaleString();

// One in-memory store for the shared prototype state: the variant, water drunk and whether the Weigh-in is logged
type State = { variant: string; nav: string; water: number; weighedIn: boolean; diet: string };
let state: State = { variant: "J", nav: "1", water: 1250, weighedIn: false, diet: "None" };
const listeners = new Set<() => void>();
export const setProto = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
export const useProto = () =>
  useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => state,
  );
export const VARIANTS = [
  { key: "A", name: "Bars card + meal list" },
  { key: "B", name: "Rings + add sheet" },
  { key: "C", name: "Coach line + search first" },
  { key: "D", name: "Equation diary (MyFitnessPal)" },
  { key: "E", name: "Colour + coach (Noom)" },
  { key: "F", name: "Timeline + log bar (MacroFactor)" },
  { key: "G", name: "Ring row · B's page + C's search" },
  { key: "H", name: "Big ring · ideas lead" },
  { key: "I", name: "Coach headline · Food in two halves" },
  { key: "J", name: "Final: Today G · Food I, reordered" },
];
// The tab bar: 0 is today's five tabs, for comparison
export const NAVS = [
  { key: "0", name: "5 tabs, as now" },
  { key: "1", name: "Exercises in Profile" },
  { key: "2", name: "Profile from avatar" },
  { key: "3", name: "Train · Eat · Me" },
];

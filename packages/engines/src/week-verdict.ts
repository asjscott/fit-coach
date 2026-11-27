import { inUnitToStep, type WeightUnit } from "@fit/shared";
import { RANGE_STATE_WORDS, type RangeState } from "./nutrition-ranges";

type Average = RangeState["state"];

// What the Coach's sentence on a Week Summary is picked from (spec #206 story 48). A part with no data is left out
export type WeekVerdictInput = {
  workouts: { done: number; planned: number };
  partWeek: boolean;
  // PRs set that week
  prs: number;
  // The daily averages' range states, absent with no food logged
  kcal?: Average;
  protein?: Average;
  // Since the Weigh-in before, absent without one this week
  weighInChangeKg?: number;
  deload: boolean;
  // Weights are said in the user's unit
  unit: WeightUnit;
};

// The Coach's one sentence on the week and the line under it ("A full week, and two PRs.")
export type WeekVerdict = { sentence: string; line: string };

const NUMBER_WORDS = ["no", "a", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const prsInWords = (prs: number) => `${NUMBER_WORDS[prs] ?? prs} ${prs === 1 ? "PR" : "PRs"}`;

const full = ({ workouts }: WeekVerdictInput) => workouts.done >= workouts.planned;

// The sentences, in order: the first that matches the week wins
const TEMPLATES: { matches: (week: WeekVerdictInput) => boolean; sentence: (week: WeekVerdictInput) => string }[] = [
  { matches: (week) => !week.workouts.done && !week.kcal, sentence: () => "A quiet week." },
  { matches: (week) => week.deload, sentence: () => "A deload week, lighter on purpose." },
  { matches: (week) => full(week) && week.prs > 0, sentence: (week) => `A full week, and ${prsInWords(week.prs)}.` },
  { matches: full, sentence: () => "A full week." },
  { matches: (week) => week.prs > 0, sentence: (week) => `A short week, but ${prsInWords(week.prs)}.` },
  { matches: (week) => !week.workouts.done, sentence: () => "No Workouts this week." },
  { matches: (week) => week.partWeek, sentence: () => "A first week to build on." },
  { matches: () => true, sentence: () => "A short week." },
];

function foodClause({ kcal, protein }: WeekVerdictInput): string | null {
  if (!kcal) return null;
  if (kcal === "in" && protein === "in") return "food in range on average";
  if (kcal === "in" && protein === "below") return "calories in range but protein short";
  return `calories ${RANGE_STATE_WORDS[kcal]} on average`;
}

function weightClause({ weighInChangeKg, unit }: WeekVerdictInput): string | null {
  if (weighInChangeKg === undefined) return null;
  const change = inUnitToStep(weighInChangeKg, unit, 0.1);
  if (!change) return "weight steady";
  return `${Math.abs(change).toLocaleString("en")} ${unit} ${change < 0 ? "down" : "up"}`;
}

// "A, b, and c", the first word capitalised
function clauses(parts: string[]) {
  const listed = parts.length > 2 ? `${parts.slice(0, -1).join(", ")}, and ${parts.at(-1)}` : parts.join(", and ");
  return `${listed.charAt(0).toUpperCase()}${listed.slice(1)}.`;
}

// The Coach's sentence on the week, from the first template that matches, and a line of what happened under it
export function weekVerdict(week: WeekVerdictInput): WeekVerdict {
  const sentence = TEMPLATES.find(({ matches }) => matches(week))!.sentence(week);
  if (!week.workouts.done && !week.kcal) {
    return { sentence, line: "No Workouts or food logged. A new week starts Monday." };
  }
  const { done, planned } = week.workouts;
  const workouts = full(week) ? "every Workout done" : `${done} of ${planned} Workouts done`;
  const parts = [workouts, foodClause(week), weightClause(week)].filter((part) => part !== null);
  return { sentence, line: clauses(parts) };
}

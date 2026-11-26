import type {
  CheckIn,
  Goal,
  LatestAssessment,
  NutritionWeek,
  Pr,
  SetTarget,
  WeekAverage,
  WeekKcal,
  WeekSummary,
  WeightUnit,
  WorkingLevel,
  WorkingLevelMove,
  Workout,
} from "@fit/shared";
import { weekOfBlock } from "./block";
import { readiness } from "./check-in";
import { weekDates } from "./local-dates";
import { nutrientRange, nutritionRanges, rangeState } from "./nutrition-ranges";
import { localDateOf, localHourOf, mondayBefore, mondayOf, weekLedger, workoutsInWeek } from "./week-ledger";
import { weekVerdict } from "./week-verdict";
import { weeklyBudget } from "./weekly-budget";
import { partFirstWeek, weeklyStreak } from "./weekly-streak";

// The evening starts at 6 pm in the user's timezone: the Day Summary shows from then, and on Sunday the Week Summary of
// the week ending is due (spec #206)
export const EVENING_HOUR = 18;

// The Monday of the week just ended, in the user's timezone: this week from 6 pm on Sunday, and the week before until
// then. The server answers GET /week-summaries/latest with it, and the phone uses it to know when to ask
export function latestWeekSummaryMonday(now: Date, timeZone: string): string {
  const thisWeek = mondayOf(now, timeZone);
  const sunday = weekDates(thisWeek)[6];
  const due = localDateOf(now, timeZone) === sunday && localHourOf(now, timeZone) >= EVENING_HOUR;
  return due ? thisWeek : mondayBefore(thisWeek);
}

// Everything a week's Week Summary is worked out from (ADR 0009), loaded by the server
export type WeekSummaryInput = {
  monday: string;
  onboardedAt: Date;
  timeZone: string;
  daysPerWeek: number;
  goal: Goal;
  unit: WeightUnit;
  // From the onboarding week on, for the Weekly Streak
  workouts: readonly Workout[];
  food: NutritionWeek;
  // For the Block's deload week and the Working Levels; null before the first
  latestAssessment: LatestAssessment;
  weighIn: { kg: number; changeKg: number } | null;
  // This week's Check-ins and the week before's
  checkIns: readonly CheckIn[];
  checkInsBefore: readonly CheckIn[];
};

// A moment on a local date in the timezone: noon UTC, moved half a day when that's another date there
function momentOn(date: string, timeZone: string): Date {
  const noon = new Date(`${date}T12:00:00Z`);
  const there = localDateOf(noon, timeZone);
  if (there === date) return noon;
  return new Date(noon.getTime() + (there > date ? -12 : 12) * 60 * 60 * 1000);
}

// Weekly Streak, at a moment inside the week, so the week counts as the one under way: its own Workouts add to it. A
// week that ended short broke the streak, which the current week never does, so that's 0
function streakOf({ onboardedAt, monday, timeZone, daysPerWeek, workouts }: WeekSummaryInput, done: number): number {
  if (done < daysPerWeek - 1) return 0;
  const inside = momentOn(weekDates(monday)[6], timeZone);
  return weeklyStreak({ workouts, daysPerWeek, onboardedAt: onboardedAt.toISOString(), now: inside, timeZone });
}

// Workouts planned: days per week, pro-rated for the part first week from the day the user onboarded, at least one
function plannedWorkouts({ onboardedAt, monday, timeZone, daysPerWeek }: WeekSummaryInput, partWeek: boolean) {
  if (!partWeek) return daysPerWeek;
  const onboarded = localDateOf(onboardedAt, timeZone);
  const days = weekDates(monday).filter((date) => date >= onboarded).length;
  return Math.max(1, Math.round((daysPerWeek * days) / 7));
}

// The daily average over the days with food logged, against the range of their average target; undefined with none
// logged
function averageOf(food: NutritionWeek, nutrient: "kcal" | "proteinG"): WeekAverage | undefined {
  const logged = food.days.filter((day) => day.logged);
  if (!logged.length) return undefined;
  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const average = Math.round(mean(logged.map((day) => day.totals[nutrient])));
  const range = nutrientRange(nutrient, mean(logged.map((day) => day.targets[nutrient])));
  return { average, ...range, state: rangeState(average, range).state };
}

// The kcal average, with each logged day's kcal against that day's own range
function kcalOf(food: NutritionWeek): WeekKcal | undefined {
  const average = averageOf(food, "kcal");
  if (!average) return undefined;
  const days = food.days
    .filter((day) => day.logged)
    .map(({ date, totals, targets }) => {
      const kcal = Math.round(totals.kcal);
      return { date, kcal, state: rangeState(kcal, nutritionRanges(targets).kcal).state };
    });
  return { ...average, days };
}

// Budgeted Muscles at or over their Weekly Budget, out of all of them, and those short of it with their credited Sets;
// absent with no Workouts to credit
function budgetOf({ goal, daysPerWeek, workouts, monday, timeZone }: WeekSummaryInput, done: number) {
  if (!done) return undefined;
  const budget = weeklyBudget(goal, daysPerWeek);
  const ledger = weekLedger(workouts, { monday, timeZone });
  const muscles = Object.entries(budget) as [keyof typeof budget, number][];
  const credited = (muscle: keyof typeof budget) => Math.round((ledger[muscle] ?? 0) * 10) / 10;
  const short = muscles
    .filter(([muscle, sets]) => credited(muscle) < sets)
    .map(([muscle, sets]) => ({ muscle, sets: credited(muscle), budget: sets }));
  return { met: muscles.length - short.length, muscles: muscles.length, short };
}

// The PRs the week's Workouts set, one per Exercise: its best that week against its best before the week
function prsOf(weekWorkouts: readonly Workout[]): Pr[] {
  const bySlug = new Map<string, Pr>();
  const inOrder = [...weekWorkouts].sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
  for (const pr of inOrder.flatMap((workout) => workout.prs ?? [])) {
    const first = bySlug.get(pr.slug);
    bySlug.set(pr.slug, first ? { ...pr, previous: first.previous } : pr);
  }
  return [...bySlug.values()];
}

const DIRECTIONS: Partial<Record<string, WorkingLevelMove["direction"]>> = {
  "target-up": "up",
  "seconds-up": "up",
  "load-up": "up",
  "load-down": "down",
  "target-down": "down",
};

// What a Working Level prescribes, without its progress
function targetOf(level: WorkingLevel): SetTarget {
  switch (level.unit) {
    case "kg":
      return { unit: "kg", kg: level.kg, reps: level.reps };
    case "reps":
      return { unit: "reps", reps: level.reps };
    case "seconds":
      return { unit: "seconds", seconds: Math.round(level.seconds) };
    case "band":
      return { unit: "band", level: level.level, reps: level.reps };
  }
}

// The Working Levels a Workout that week moved up or down, in the order they moved. Only each level's last move is
// stored, so a level moved again since is shown as it is now, or not at all when moved in a later week
function movesOf({ latestAssessment, monday, timeZone }: WeekSummaryInput): WorkingLevelMove[] {
  return (latestAssessment?.workingLevels ?? [])
    .flatMap((level) => {
      const direction = level.change && DIRECTIONS[level.change.code];
      const { movedBy } = level;
      if (!direction || !movedBy || mondayOf(new Date(movedBy.startedAt), timeZone) !== monday) return [];
      const change = level.change!.code as WorkingLevelMove["change"];
      return [{ at: movedBy.startedAt, move: { slug: level.slug, direction, change, level: targetOf(level) } }];
    })
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
    .map(({ move }) => move);
}

// The average Readiness of these Check-ins, to a tenth; undefined with none
function averageReadiness(checkIns: readonly CheckIn[]) {
  if (!checkIns.length) return undefined;
  const total = checkIns.reduce((sum, checkIn) => sum + readiness(checkIn), 0);
  return Math.round((total / checkIns.length) * 10) / 10;
}

function readinessOf({ checkIns, checkInsBefore }: WeekSummaryInput) {
  const average = averageReadiness(checkIns);
  if (average === undefined) return undefined;
  const previous = averageReadiness(checkInsBefore);
  return { average, ...(previous !== undefined && { previous }) };
}

// The Week Summary (GLOSSARY.md) of the week starting on `monday`, part by part, but whether it's been seen. A new
// part is worked out here from WeekSummaryInput, and left out when it has no data
export function weekSummary(input: WeekSummaryInput): Omit<WeekSummary, "seen"> {
  const { onboardedAt, monday, timeZone, workouts, food, latestAssessment, weighIn, unit } = input;
  const partWeek = partFirstWeek(onboardedAt, timeZone) === monday;
  const weekWorkouts = workoutsInWeek(workouts, { monday, timeZone });
  const done = weekWorkouts.length;
  const planned = plannedWorkouts(input, partWeek);
  const kcal = kcalOf(food);
  const protein = averageOf(food, "proteinG");
  const budget = budgetOf(input, done);
  const deload =
    weekOfBlock(latestAssessment?.assessment ?? null, momentOn(monday, timeZone), timeZone)?.deload ?? false;
  const prs = prsOf(weekWorkouts);
  const moves = movesOf(input);
  const readiness = readinessOf(input);
  const coach = weekVerdict({
    workouts: { done, planned },
    partWeek,
    prs: prs.length,
    kcal: kcal?.state,
    protein: protein?.state,
    weighInChangeKg: weighIn?.changeKg,
    deload,
    unit,
  });
  return {
    monday,
    sunday: weekDates(monday)[6],
    partWeek,
    workouts: { done, planned },
    streak: streakOf(input, done),
    ...(kcal && { kcal }),
    ...(protein && { protein }),
    ...(budget && { weeklyBudget: budget }),
    ...(deload && { deload }),
    ...(prs.length && { prs }),
    ...(moves.length && { moves }),
    ...(weighIn && { weighIn }),
    ...(readiness && { readiness }),
    coach,
  };
}

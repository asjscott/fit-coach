import {
  addCredits,
  creditsPerSet,
  exerciseBySlug,
  isRecoveryWorkout,
  localDateOf,
  nutritionRanges,
  rangeState,
  recoveryWorkoutKind,
  restDay,
  summarizeWorkout,
  thisWeek,
  type FinishedWorkoutSets,
  type MuscleCredits,
  type NutritionRange,
  type RestDayReason,
} from "@fit/engines";
import { Muscle, type DailyTargets, type Day, type PlannedExercise, type PlanReason } from "@fit/shared";
import { inWords } from "../../utils/in-words";
import { muscleLabel } from "../exercises/labels";
import { wholeNumber } from "../nutrition/format";
import { MOBILITY, timeStat, WALK_AND_MOBILITY } from "../workouts/format";
import { planReasonLines } from "./plan-reasons";

export type DaySummaryInput = {
  now: Date;
  // The user's, which decides the 6 to 10 pm window and which Workouts are today's
  timeZone: string;
  // History with the Pending Workouts, as todayRestDay takes them
  workouts: readonly FinishedWorkoutSets[];
  // The day as Today last loaded it, or undefined while it loads or when it never has
  day: Pick<Day, "targets" | "totals" | "meals"> | undefined;
  // Today's Rest Day rule result
  restDayToday: RestDayReason | null;
  daysPerWeek: number | undefined;
  // The current Planned Workout, or null with none or a stale one
  plannedWorkout: {
    plannedExercises: readonly Pick<PlannedExercise, "slug" | "sets">[];
    reasons?: readonly PlanReason[];
  } | null;
};

export type DaySummaryWorkout =
  | { kind: "trained"; muscles: Muscle[]; sets: number; durationMs: number }
  | { kind: "recovery"; label: string; durationMs: number }
  | { kind: "rest-day" }
  | { kind: "none" };

// An amount against its range, as the day's rings show it: rounded as shown, against the target in the middle
export type RangeRow = { amount: number; target: number; state: "under" | "in" | "over" };

// Null when no food is logged, so zeros don't look like a real day
export type DaySummaryFood = { kcal: RangeRow; protein: RangeRow } | null;

// The Daily Targets are the same every day, so tomorrow's are today's
export type TomorrowTargets = Pick<DailyTargets, "kcal" | "proteinG">;

// Tomorrow as the Rest Day rule and the current Planned Workout have it; null when it can't be worked out
export type DaySummaryTomorrow =
  | { rest: true; reason: string; targets: TomorrowTargets }
  // The reason is null for a plan stored before reasons
  | { rest: false; muscles: Muscle[]; reason: string | null; targets: TomorrowTargets }
  | null;

export type DaySummary = {
  // Always false until the finished day is built (#209)
  finished: boolean;
  workout: DaySummaryWorkout;
  food: DaySummaryFood;
  tomorrow: DaySummaryTomorrow;
};

// A receipt row: what it is on the left, its numbers on the right
export type ReceiptRow = { label: string; detail: string };

const FROM_HOUR = 18;
const UNTIL_HOUR = 22;
const NAMED_MUSCLES = 3;

const hourIn = (now: Date, timeZone: string) =>
  Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone }).format(now));

// The Muscles a Workout's Sets credit most, as the Week Ledger credits them; a tie goes in Muscle order
function mostCredited(exercises: readonly { slug: string; sets: number }[]): Muscle[] {
  let credits: MuscleCredits = {};
  for (const { slug, sets } of exercises) {
    const exercise = exerciseBySlug(slug);
    if (exercise) credits = addCredits(credits, creditsPerSet(exercise), sets);
  }
  return Muscle.options
    .filter((muscle) => credits[muscle])
    .sort((a, b) => (credits[b] ?? 0) - (credits[a] ?? 0))
    .slice(0, NAMED_MUSCLES);
}

const totalMs = (workouts: readonly FinishedWorkoutSets[]) =>
  workouts.reduce((sum, workout) => sum + summarizeWorkout(workout).durationMs, 0);

function workoutOf(today: readonly FinishedWorkoutSets[], restDayToday: RestDayReason | null): DaySummaryWorkout {
  const training = today.filter((workout) => !isRecoveryWorkout(workout));
  if (training.length) {
    const exercises = training.flatMap(({ workoutExercises }) =>
      workoutExercises.map(({ slug, sets }) => ({ slug, sets: sets.length })),
    );
    return {
      kind: "trained",
      muscles: mostCredited(exercises),
      sets: training.reduce((sum, workout) => sum + summarizeWorkout(workout).sets, 0),
      durationMs: totalMs(training),
    };
  }
  if (today.length) {
    const label = today.every((workout) => recoveryWorkoutKind(workout) === "mobility") ? MOBILITY : WALK_AND_MOBILITY;
    return { kind: "recovery", label, durationMs: totalMs(today) };
  }
  return restDayToday ? { kind: "rest-day" } : { kind: "none" };
}

const rangeRow = (amount: number, target: number, range: NutritionRange): RangeRow => {
  const { state } = rangeState(amount, range);
  return { amount: Math.round(amount), target, state: state === "below" ? "under" : state };
};

function foodOf({ targets, totals, meals }: NonNullable<DaySummaryInput["day"]>): DaySummaryFood {
  if (!meals.some(({ entries }) => entries.length)) return null;
  const ranges = nutritionRanges(targets);
  return {
    kcal: rangeRow(totals.kcal, targets.kcal, ranges.kcal),
    protein: rangeRow(totals.proteinG, targets.proteinG, ranges.proteinG),
  };
}

const WHY_REST_TOMORROW: Record<Exclude<RestDayReason, "days-per-week-reached">, string> = {
  "trained-today": "You've trained today.",
  "trained-yesterday": "You've trained today, and this week's Workouts still fit.",
};

// The Rest Day rule run for tomorrow, on the phone's local days as Today runs it, so today's Workouts are its
// yesterday. Like Today, there's no Rest Day without a plan, so with none tomorrow isn't guessed
function tomorrowOf(
  { now, workouts, daysPerWeek, plannedWorkout }: DaySummaryInput,
  { kcal, proteinG }: TomorrowTargets,
): DaySummaryTomorrow {
  if (!plannedWorkout) return null;
  const targets = { kcal, proteinG };
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12);
  const rest = restDay(workouts, tomorrow, daysPerWeek);
  if (rest === "days-per-week-reached") {
    const { workoutCount } = thisWeek(workouts, tomorrow);
    return { rest: true, reason: `You've had ${workoutCount} Workouts this week.`, targets };
  }
  if (rest) return { rest: true, reason: WHY_REST_TOMORROW[rest], targets };
  const muscles = mostCredited(plannedWorkout.plannedExercises);
  return { rest: false, muscles, reason: planReasonLines(plannedWorkout.reasons, now)[0] ?? null, targets };
}

// The Day Summary (GLOSSARY.md) from 6 to 10 pm in the user's timezone. Null outside it, and without the day, which
// Today has only once it's loaded, so nothing shows half-made or, offline with nothing cached, at all
export function daySummary(input: DaySummaryInput): DaySummary | null {
  const { now, timeZone, workouts, day, restDayToday } = input;
  const hour = hourIn(now, timeZone);
  if (hour < FROM_HOUR || hour >= UNTIL_HOUR || !day) return null;
  const date = localDateOf(now, timeZone);
  const today = workouts.filter(({ endedAt }) => localDateOf(new Date(endedAt), timeZone) === date);
  return {
    finished: false,
    workout: workoutOf(today, restDayToday),
    food: foodOf(day),
    tomorrow: tomorrowOf(input, day.targets),
  };
}

const counted = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;
const timeLabel = (ms: number) => {
  const { value, unit } = timeStat(ms);
  return `${value} ${unit}`;
};

// Muscles as a name: "Chest, back and quads"
export function musclesName(muscles: readonly Muscle[]) {
  const name = inWords(muscles.map((muscle) => muscleLabel(muscle).toLowerCase()));
  return name.charAt(0).toUpperCase() + name.slice(1);
}

const DONE = "✅";
const NOT_YET = "○";

// The receipt's Workout row: "✅ Chest, back and quads" and "18 Sets · 48 min"
export function workoutRow(workout: DaySummaryWorkout): ReceiptRow {
  switch (workout.kind) {
    case "trained":
      return {
        label: `${DONE} ${workout.muscles.length ? musclesName(workout.muscles) : "Workout"}`,
        detail: `${counted(workout.sets, "Set")} · ${timeLabel(workout.durationMs)}`,
      };
    case "recovery":
      return { label: `${DONE} ${workout.label}`, detail: timeLabel(workout.durationMs) };
    case "rest-day":
      return { label: `${DONE} Rest Day`, detail: "" };
    case "none":
      return { label: `${NOT_YET} No workout yet`, detail: "" };
  }
}

function rangeRowLabel(name: string, { amount, target, state }: RangeRow, unit: string, range: number): ReceiptRow {
  const over = state === "over" ? ` · ${wholeNumber(amount - range)} over` : "";
  return {
    label: `${state === "under" ? NOT_YET : DONE} ${name}`,
    detail: `${wholeNumber(amount)} / ${wholeNumber(target)} ${unit}${over}`,
  };
}

// The receipt's food rows: "○ Calories" and "2,080 / 2,980 kcal", then protein; one row when nothing is logged
export function foodRows(food: DaySummaryFood): ReceiptRow[] {
  if (!food) return [{ label: `${NOT_YET} No food logged`, detail: "" }];
  const ranges = nutritionRanges({ kcal: food.kcal.target, proteinG: food.protein.target });
  return [
    rangeRowLabel("Calories", food.kcal, "kcal", ranges.kcal.max),
    rangeRowLabel("Protein", food.protein, "g", ranges.proteinG.max),
  ];
}

// Tomorrow in one line at the foot of the receipt: "Tomorrow: Rest. You've had 3 Workouts this week. 2,980 kcal ·
// 160 g protein"; null when it's left out
export function tomorrowLine(tomorrow: DaySummaryTomorrow): string | null {
  if (!tomorrow) return null;
  const what = tomorrow.rest ? "Rest" : musclesName(tomorrow.muscles) || "Your next Workout";
  const { kcal, proteinG } = tomorrow.targets;
  const reason = tomorrow.reason ? ` ${tomorrow.reason}` : "";
  return `Tomorrow: ${what}.${reason} ${wholeNumber(kcal)} kcal · ${wholeNumber(proteinG)} g protein`;
}

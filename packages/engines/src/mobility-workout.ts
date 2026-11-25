import type { Exercise, InjuryTag, Muscle, RecoveryArea } from "@fit/shared";
import { z } from "zod";
import { exerciseBySlug } from "./data/exercises";
import type { ProfileWithLoads } from "./equipment";
import { muscleFatigue, type FatigueWorkout } from "./fatigue";
import {
  isRecoveryWorkout,
  possibleHolds,
  type LoggedWorkoutExercise,
  type RecoveryExercise,
} from "./recovery-workout";

export const MOBILITY_MINUTES = [10, 20, 30] as const;
export const MobilityMinutes = z.literal(MOBILITY_MINUTES);
export type MobilityMinutes = z.infer<typeof MobilityMinutes>;

export const MOBILITY_FOCUSES = ["full_body", "hips_and_legs", "back_and_shoulders"] as const;
export const MobilityFocus = z.enum(MOBILITY_FOCUSES);
export type MobilityFocus = z.infer<typeof MobilityFocus>;

const FOCUS_AREAS: Record<MobilityFocus, readonly RecoveryArea[]> = {
  full_body: ["hips_and_legs", "back_and_spine", "chest_and_shoulders"],
  hips_and_legs: ["hips_and_legs"],
  back_and_shoulders: ["back_and_spine", "chest_and_shoulders"],
};

// To change position, before every hold and each side of one
export const CHANGE_SECONDS = 10;
const MOST_OVER_SECONDS = 60;
const MOST_SETS = 2;

// How long a hold takes, every Set and side with the change before it. The target is per side
export const holdTimeSeconds = ({ slug, sets, target }: RecoveryExercise) => {
  const sides = exerciseBySlug(slug)?.unilateral ? 2 : 1;
  return sets * sides * (CHANGE_SECONDS + (target.unit === "seconds" ? target.seconds : 0));
};

export const mobilitySeconds = (holds: readonly RecoveryExercise[]) =>
  holds.reduce((sum, hold) => sum + holdTimeSeconds(hold), 0);

// A Recovery Exercise's Set, as planned. Only for a hold, which the walk isn't
const planHold = (exercise: Exercise): RecoveryExercise => ({
  slug: exercise.slug,
  sets: 1,
  target: { unit: "seconds", seconds: exercise.holdSeconds! },
});

export type MobilityOptions = {
  minutes: MobilityMinutes;
  focus: MobilityFocus;
  // As many recent Workouts as the phone knows: none offline, for a balanced choice (ADR 0001)
  workouts: readonly FatigueWorkout[];
  injuries: readonly InjuryTag[];
  equipmentProfile: ProfileWithLoads;
  // The last Mobility's, to vary from
  lastExercises: readonly string[];
  now: Date;
};

// What each consideration takes off a hold's score, where loosening the most tired Muscle scores 1: being in the last
// Mobility, and each hold already chosen from its area, or for its Muscle
const IN_LAST = 0.5;
const PER_AREA_HOLD = 0.1;
const PER_MUSCLE_HOLD = 0.05;

// The Mobility Workout (GLOSSARY.md), in the order to do it. One hold at a time, the best of those that fit: it loosens
// what recent training left most tired, which counts for half as much each time it's chosen, then varies from the last
// Mobility and balances the areas. Each area of the focus comes before any is repeated. Ties go by the library's order
export function mobilityWorkout({
  minutes,
  focus,
  workouts,
  injuries,
  equipmentProfile,
  lastExercises,
  now,
}: MobilityOptions): RecoveryExercise[] {
  const areas = FOCUS_AREAS[focus];
  const possible = possibleHolds(equipmentProfile, injuries).filter(({ area }) => area && areas.includes(area));
  const most = minutes * 60 + MOST_OVER_SECONDS;

  const fatigue = muscleFatigue(workouts, now);
  const mostTired = Math.max(0, ...Object.values(fatigue));
  const muscleHolds = new Map<Muscle, number>();
  const areaHolds = new Map<RecoveryArea, number>();

  const tiredness = (muscle: Muscle) =>
    mostTired ? (fatigue[muscle] ?? 0) / mostTired / 2 ** (muscleHolds.get(muscle) ?? 0) : 0;
  const score = ({ slug, muscles: { primary, secondary }, area }: Exercise) =>
    Math.max(...primary.map(tiredness), ...secondary.map((muscle) => tiredness(muscle) / 2)) -
    (lastExercises.includes(slug) ? IN_LAST : 0) -
    PER_AREA_HOLD * (areaHolds.get(area!) ?? 0) -
    PER_MUSCLE_HOLD * Math.max(...primary.map((muscle) => muscleHolds.get(muscle) ?? 0));

  const chosen = new Map<string, RecoveryExercise>();
  let seconds = 0;
  while (seconds < minutes * 60) {
    const unused = possible.filter(({ slug }) => !chosen.has(slug));
    const left = unused.length ? unused : possible.filter(({ slug }) => chosen.get(slug)!.sets < MOST_SETS);
    const fitting = left.filter((exercise) => seconds + holdTimeSeconds(planHold(exercise)) <= most);
    const uncovered = fitting.filter(({ area }) => !areaHolds.has(area!));
    // The sort is stable, so ties keep the library's order
    const [best] = (uncovered.length ? uncovered : fitting).sort((a, b) => score(b) - score(a));
    if (!best) break;

    const planned = chosen.get(best.slug);
    chosen.set(best.slug, planned ? { ...planned, sets: planned.sets + 1 } : planHold(best));
    seconds += holdTimeSeconds(planHold(best));
    areaHolds.set(best.area!, (areaHolds.get(best.area!) ?? 0) + 1);
    for (const muscle of best.muscles.primary) muscleHolds.set(muscle, (muscleHolds.get(muscle) ?? 0) + 1);
  }
  return [...chosen.values()];
}

// Which Recovery Workout a logged Workout is, by the Exercises it has Sets of, or null for training. A walk logged by
// itself is neither, so it has no name of its own
export function recoveryWorkoutKind(workout: {
  workoutExercises: readonly LoggedWorkoutExercise[];
}): "mobility" | "walk-and-mobility" | null {
  if (!isRecoveryWorkout(workout)) return null;
  const done = workout.workoutExercises.filter(({ sets }) => sets.length > 0);
  const holds = done.filter(({ slug }) => exerciseBySlug(slug)?.holdSeconds !== undefined);
  if (!holds.length) return null;
  return holds.length === done.length ? "mobility" : "walk-and-mobility";
}

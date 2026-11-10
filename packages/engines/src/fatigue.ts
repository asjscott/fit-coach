import type { Muscle } from "@fit/shared";
import { exerciseBySlug } from "./data/exercises";
import { addCredits, creditsPerSet, type MuscleCredits } from "./week-ledger";
import { FATIGUE_HOURS, FATIGUE_LIMIT } from "./weekly-budget";

const FATIGUE_MS = FATIGUE_HOURS * 3_600_000;

// What fatigue needs from a finished Workout: each Set's own loggedAt
export type FatigueWorkout = {
  id: string;
  workoutExercises: readonly { slug: string; sets: readonly { loggedAt: string }[] }[];
};

// Each logged Set of an Exercise that credits Muscles: one in the library and not a Recovery Exercise. A Workout passed
// twice counts once
export function* creditingSets(workouts: readonly FatigueWorkout[]) {
  const once = new Map(workouts.map((workout) => [workout.id, workout])).values();
  for (const { workoutExercises } of once) {
    for (const { slug, sets } of workoutExercises) {
      const exercise = exerciseBySlug(slug);
      if (!exercise || exercise.recovery) continue;
      for (const { loggedAt } of sets) yield { exercise, loggedAt };
    }
  }
}

// Each Muscle's fatigue from logged Sets, credited as in the Week Ledger: in full now, fading in a straight line to
// nothing after FATIGUE_HOURS. A Muscle with none is absent. Only logged Sets count: M10 adds activities
export function muscleFatigue(workouts: readonly FatigueWorkout[], now: Date): MuscleCredits {
  let fatigue: MuscleCredits = {};
  for (const { exercise, loggedAt } of creditingSets(workouts)) {
    const left = 1 - (now.getTime() - new Date(loggedAt).getTime()) / FATIGUE_MS;
    if (left > 0) fatigue = addCredits(fatigue, creditsPerSet(exercise), Math.min(1, left));
  }
  return fatigue;
}

// Above FATIGUE_LIMIT, a Muscle's Exercises are left out of the plan unless nothing else helps the budget
export const tiredMuscles = (fatigue: MuscleCredits): Muscle[] =>
  (Object.entries(fatigue) as [Muscle, number][])
    .filter(([, value]) => value > FATIGUE_LIMIT)
    .map(([muscle]) => muscle);

import type { Muscle } from "@fit/shared";
import { exerciseBySlug } from "./data/exercises";
import { addCredits, creditsPerSet, type MuscleCredits } from "./week-ledger";
import { FATIGUE_HOURS } from "./weekly-budget";

const FATIGUE_MS = FATIGUE_HOURS * 3_600_000;

// What fatigue needs from a finished Workout: each Set's own loggedAt
export type FatigueWorkout = {
  id: string;
  workoutExercises: readonly { slug: string; sets: readonly { loggedAt: string }[] }[];
};

// Each Muscle's fatigue from logged Sets, credited as in the Week Ledger: in full now, fading in a straight line to
// nothing after FATIGUE_HOURS. A Muscle with none is absent. Only logged Sets count: M10 adds activities
export function muscleFatigue(workouts: readonly FatigueWorkout[], now: Date): MuscleCredits {
  let fatigue: MuscleCredits = {};
  const once = new Map(workouts.map((workout) => [workout.id, workout])).values();
  for (const { workoutExercises } of once) {
    for (const { slug, sets } of workoutExercises) {
      const exercise = exerciseBySlug(slug);
      if (!exercise) continue;
      for (const { loggedAt } of sets) {
        const left = 1 - (now.getTime() - new Date(loggedAt).getTime()) / FATIGUE_MS;
        if (left > 0) fatigue = addCredits(fatigue, creditsPerSet(exercise), Math.min(1, left));
      }
    }
  }
  return fatigue;
}

// The Muscles over the limit
export const tiredMuscles = (fatigue: MuscleCredits, limit: number): Muscle[] =>
  (Object.entries(fatigue) as [Muscle, number][]).filter(([, value]) => value > limit).map(([muscle]) => muscle);

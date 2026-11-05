import { WORKOUT_LENGTH_MINUTES, type UserProfile, type WorkoutLength } from "@fit/shared";

// Part of the Workout Length but not of secondsPerSet: see docs/research/weekly-budget-volume.md
export const WARM_UP_SECONDS = 5 * 60;

// Users onboarded before Workout Length existed have none stored, and count as Standard until they change it
export function usualWorkoutLength(profile: Partial<Pick<UserProfile, "workoutLength">>): WorkoutLength {
  return profile.workoutLength ?? "standard";
}

// What a Workout Length leaves for Sets
export const secondsForSets = (length: WorkoutLength) => WORKOUT_LENGTH_MINUTES[length] * 60 - WARM_UP_SECONDS;

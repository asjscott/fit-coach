import type { UserProfile, WorkoutLength } from "@fit/shared";

// Users onboarded before Workout Length existed have none stored, and count as Standard until they change it
export function usualWorkoutLength(profile: Partial<Pick<UserProfile, "workoutLength">>): WorkoutLength {
  return profile.workoutLength ?? "standard";
}

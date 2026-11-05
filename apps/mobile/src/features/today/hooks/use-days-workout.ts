import { dayChoices, daysWorkout, usualWorkoutLength, type MadeChoices } from "@fit/engines";
import type { PlannedWorkout, WorkoutLength } from "@fit/shared";
import { useCallback, useState } from "react";
import { useCurrentUser } from "@/features/user/current-user-provider";

// The Workout on offer today from the Planned Workout, null without one, with what the user has chosen for it. Choices
// live here and nowhere else, so they never reach the stored plan and are gone once the Workout starts
export function useDaysWorkout(plannedWorkout: PlannedWorkout | null) {
  const profile = useCurrentUser().user?.profile;
  const [made, setMade] = useState<MadeChoices | null>(null);

  const clearChoices = useCallback(() => setMade(null), []);
  if (!plannedWorkout) return { today: null, clearChoices };

  const { id: plannedWorkoutId } = plannedWorkout;
  const choices = dayChoices(plannedWorkoutId, { workoutLength: usualWorkoutLength(profile ?? {}) }, made);
  return {
    today: {
      ...daysWorkout(plannedWorkout, choices, profile?.goal),
      id: plannedWorkoutId,
      workoutLength: choices.workoutLength,
      chooseLength: (workoutLength: WorkoutLength) => setMade({ plannedWorkoutId, choices: { workoutLength } }),
    },
    clearChoices,
  };
}

import {
  dayChoices,
  daysWorkout,
  equipmentChoices,
  usualWorkoutLength,
  withChoice,
  type DayChoices,
  type MadeChoices,
} from "@fit/engines";
import type { BuiltInEquipment, PlannedWorkout, WorkoutLength } from "@fit/shared";
import { useCallback, useState } from "react";
import { useCurrentUser } from "@/features/user/current-user-provider";

// The Workout on offer today from the Planned Workout, null without one, with what the user has chosen for it. Choices
// live here and nowhere else, so they never reach the stored plan and are gone once the Workout starts
export function useDaysWorkout(plannedWorkout: PlannedWorkout | null) {
  const profile = useCurrentUser().user?.profile;
  const [madeChoices, setMadeChoices] = useState<MadeChoices | null>(null);

  const clearChoices = useCallback(() => setMadeChoices(null), []);
  if (!plannedWorkout) return { today: null, clearChoices };

  const { id: plannedWorkoutId } = plannedWorkout;
  const choices = dayChoices(plannedWorkoutId, { workoutLength: usualWorkoutLength(profile ?? {}) }, madeChoices);
  const choose = (choice: Partial<DayChoices>) =>
    setMadeChoices((current) => withChoice(current, plannedWorkoutId, choice));
  return {
    today: {
      ...daysWorkout(plannedWorkout, choices, profile?.goal),
      id: plannedWorkoutId,
      workoutLength: choices.workoutLength,
      equipment: choices.equipment,
      equipmentChoices: equipmentChoices(plannedWorkout),
      chooseLength: (workoutLength: WorkoutLength) => choose({ workoutLength }),
      chooseEquipment: (equipment?: BuiltInEquipment) => choose({ equipment }),
      pickAlternative: (replaces: string, slug: string) =>
        choose({ alternativePicks: { ...choices.alternativePicks, [replaces]: slug } }),
    },
    clearChoices,
  };
}

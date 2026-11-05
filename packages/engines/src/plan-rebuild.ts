import type { PlannedWorkout, UserProfile, WorkoutLength } from "@fit/shared";
import type { ProfileWithLoads } from "./equipment";
import { mondayOf } from "./week-ledger";

// The Profile fields that shape a plan: changing any of them rebuilds it
export type PlanInputs = Pick<UserProfile, "goal" | "daysPerWeek" | "injuries"> & {
  workoutLength: WorkoutLength;
  equipmentProfile: ProfileWithLoads;
};

// What a stored plan was built from, saved with it. Sorted, so the same equipment and injuries in a new order are no
// change. The Equipment Profile's name and id aren't here: renaming one changes nothing about the plan
export function planInputsKey({ goal, daysPerWeek, workoutLength, injuries, equipmentProfile }: PlanInputs) {
  const { tags, loads } = equipmentProfile;
  return JSON.stringify([goal, daysPerWeek, workoutLength, [...injuries].sort(), [...tags].sort(), loads]);
}

// Whether a plan should be built now: none yet, a new week, or a Profile change. Comparing rather than reacting to the
// change means a rebuild that failed is simply still due
export function planIsDue(
  current: (Pick<PlannedWorkout, "weekStart"> & { builtFrom?: string }) | null,
  inputs: PlanInputs,
  now: Date,
  timeZone: string,
) {
  return !current || current.weekStart !== mondayOf(now, timeZone) || current.builtFrom !== planInputsKey(inputs);
}

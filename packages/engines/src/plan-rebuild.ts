import type { PlannedWorkout, UserProfile, WorkoutLength } from "@fit/shared";
import type { ProfileWithLoads } from "./equipment";
import { localDateOf, mondayOf } from "./week-ledger";

// The Profile fields that shape a plan: changing any of them rebuilds it
export type PlanInputs = Pick<UserProfile, "goal" | "daysPerWeek" | "injuries" | "includeJumps"> & {
  workoutLength: WorkoutLength;
  equipmentProfile: ProfileWithLoads;
};

// What a stored plan was built from, saved with it. Sorted, so the same equipment and injuries in a new order are no
// change. The Equipment Profile's name and id aren't here: renaming one changes nothing about the plan. The jumps
// switch is only there when on, so plans built before it aren't rebuilt
export function planInputsKey({
  goal,
  daysPerWeek,
  workoutLength,
  injuries,
  includeJumps,
  equipmentProfile,
}: PlanInputs) {
  const { tags, loads } = equipmentProfile;
  const key = [goal, daysPerWeek, workoutLength, [...injuries].sort(), [...tags].sort(), loads];
  return JSON.stringify(includeJumps ? [...key, "jumps"] : key);
}

// Whether a plan should be built now: none yet, a new week, a new day, or a Profile change. A new day in the user's
// timezone, so that the recovery filter judges fatigue on the day the user looks, not at the upload. builtAt is when it
// was last built, which a rebuild giving the same plan moves on. Comparing rather than reacting to the change means a
// rebuild that failed is simply still due
export function planIsDue(
  current: (Pick<PlannedWorkout, "weekStart"> & { builtFrom?: string; builtAt?: Date | string }) | null,
  inputs: PlanInputs,
  now: Date,
  timeZone: string,
) {
  return (
    !current ||
    current.weekStart !== mondayOf(now, timeZone) ||
    current.builtFrom !== planInputsKey(inputs) ||
    !current.builtAt ||
    localDateOf(new Date(current.builtAt), timeZone) !== localDateOf(now, timeZone)
  );
}

type PlanContent = Pick<PlannedWorkout, "weekStart" | "plannedExercises" | "cue">;

// JSON with every object's keys sorted, so a stored plan read back with its fields in another order is no change
const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, inner: unknown) =>
    inner && typeof inner === "object" && !Array.isArray(inner)
      ? Object.fromEntries(Object.entries(inner).sort(([a], [b]) => a.localeCompare(b)))
      : inner,
  );

// Whether a rebuild gave the plan already stored, which then stays, with its id
export const isSamePlan = (stored: PlanContent, rebuilt: PlanContent) =>
  canonical([stored.weekStart, stored.plannedExercises, stored.cue ?? null]) ===
  canonical([rebuilt.weekStart, rebuilt.plannedExercises, rebuilt.cue ?? null]);

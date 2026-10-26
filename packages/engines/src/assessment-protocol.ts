import type { EquipmentProfile, InProgressWorkoutExercise } from "@fit/shared";
import { EXERCISES } from "./data/exercises";
import { availableLoadsKg } from "./equipment";

// Where a test Exercise is in its protocol, for the logging screen to render. Working up: Sets of 5, each at the
// suggested load (null when the user picks it). Done: a Set reached RPE 9.
// Still to come: a first suggested load (#36), one Set to RPE 9 for bodyweight and timed tests (#37), load-limited (#38)
export type ProtocolState = { status: "working-up"; suggestedKg: number | null } | { status: "done" };

// Every Set of a weighted test is 5 reps
export const TEST_REPS = 5;

// The first Set rated this hard or harder is the test's top Set
export const TOP_SET_RPE = 9;

// How far to aim above the last load, by its RPE: an easy Set jumps further
const JUMP_BY_RPE: Record<number, number> = { 6: 0.2, 7: 0.1, 8: 0.05 };

const bySlug = new Map(EXERCISES.map((exercise) => [exercise.slug, exercise]));

export function protocolState(
  { slug, sets }: Pick<InProgressWorkoutExercise, "slug" | "sets">,
  equipmentProfile: Pick<EquipmentProfile, "tags" | "loads">,
): ProtocolState {
  if (sets.some((set) => (set.rpe ?? 0) >= TOP_SET_RPE)) return { status: "done" };
  const last = sets.at(-1);
  const exercise = bySlug.get(slug);
  if (!last || last.kind !== "external" || !exercise) return { status: "working-up", suggestedKg: null };
  const loads = availableLoadsKg(exercise, equipmentProfile);
  const target = last.kg * (1 + (JUMP_BY_RPE[last.rpe ?? 8] ?? 0));
  // The first load the equipment allows at or past the target, and always heavier than the last; at the heaviest,
  // the heaviest again
  const next = loads.find((kg) => kg > last.kg && kg >= target) ?? loads.at(-1);
  return { status: "working-up", suggestedKg: next ?? null };
}

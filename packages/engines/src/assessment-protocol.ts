import type { BodyProfile, InProgressWorkout, InProgressWorkoutExercise, LoadType, Set } from "@fit/shared";
import { exerciseBySlug } from "./data/exercises";
import { MAX_E1RM_REPS } from "./e1rm";
import { availableLoadsKg, type ProfileWithLoads } from "./equipment";
import { exerciseMaximum, STRENGTH_RATIOS, typicalReferenceStrength } from "./strength-ratios";

// Where a test Exercise is in its protocol, for the logging screen to render. The suggested load is null when the
// equipment's loads aren't known; at the heaviest, past 12 reps short of RPE 9 makes the test load-limited
export type ProtocolState =
  | { status: "working-up"; suggestedKg: number | null }
  | { status: "at-heaviest"; suggestedKg: number }
  | { status: "one-set" }
  | { status: "done" }
  | { status: "load-limited" };

export const TEST_REPS = 5;

export const TOP_SET_RPE = 9;

// How far to aim above the last load, by its RPE: an easy Set jumps further
const JUMP_BY_RPE: Record<number, number> = { 6: 0.2, 7: 0.1, 8: 0.05 };

export const isTopSet = (set: Pick<Set, "rpe">) => (set.rpe ?? 0) >= TOP_SET_RPE;

// Only a weighted test's Sets are rated: a bodyweight or timed test is one Set to the most reps or seconds the user can
export const isRatedTest = ({ assessment }: Pick<InProgressWorkout, "assessment">, loadType: LoadType) =>
  !!assessment && loadType === "external";

// A weighted test with no Set at RPE 9 or higher whose last Set went past 12 reps: the load ran out before the effort
// did. `assess` takes its maximum as a lower bound; the Logbook ends the test there only at the heaviest load
export function isLoadLimited(sets: Set[]): boolean {
  const last = sets.at(-1);
  return last?.kind === "external" && last.reps > MAX_E1RM_REPS && !sets.some(isTopSet);
}

// The first Set is at this share of the likely maximum, so it's easy even for a weaker user
const FIRST_LOAD_SHARE = 0.5;

// The first load: half the likely maximum, down to a load the equipment has (the lightest when all are heavier). None
// without the body weight and gender to judge it by
function firstLoadKg(slug: string, loads: number[], bodyProfile: BodyProfile | undefined) {
  const entry = STRENGTH_RATIOS[slug];
  if (!bodyProfile || entry?.kind !== "weighted" || entry.pattern === "core" || !loads.length) return null;
  const likelyMaximum = exerciseMaximum(slug, typicalReferenceStrength(bodyProfile, entry.pattern));
  return loads.filter((kg) => kg <= likelyMaximum * FIRST_LOAD_SHARE).at(-1) ?? loads[0];
}

export function protocolState(
  { slug, sets }: Pick<InProgressWorkoutExercise, "slug" | "sets">,
  equipmentProfile: ProfileWithLoads,
  bodyProfile: BodyProfile | undefined,
): ProtocolState {
  const exercise = exerciseBySlug(slug);
  if (exercise && exercise.loadType !== "external") return sets.length ? { status: "done" } : { status: "one-set" };
  if (sets.some(isTopSet)) return { status: "done" };
  const last = sets.at(-1);
  const loads = exercise ? availableLoadsKg(exercise, equipmentProfile) : [];
  if (!last) return { status: "working-up", suggestedKg: exercise ? firstLoadKg(slug, loads, bodyProfile) : null };
  if (last.kind !== "external") return { status: "working-up", suggestedKg: null };
  // Past 12 reps short of RPE 9 ends the test only when there's no heavier load to try (or the loads aren't known)
  if (isLoadLimited(sets) && !loads.some((kg) => kg > last.kg)) return { status: "load-limited" };
  const target = last.kg * (1 + (JUMP_BY_RPE[last.rpe ?? 8] ?? 0));
  // The first load the equipment allows at or past the target, and always heavier than the last; at the heaviest,
  // the heaviest again
  const next = loads.find((kg) => kg > last.kg && kg >= target) ?? loads.at(-1);
  if (next === last.kg) return { status: "at-heaviest", suggestedKg: next };
  return { status: "working-up", suggestedKg: next ?? null };
}

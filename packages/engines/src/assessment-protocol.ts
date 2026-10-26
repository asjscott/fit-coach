import type { BodyProfile, EquipmentProfile, InProgressWorkoutExercise, Set } from "@fit/shared";
import { EXERCISES } from "./data/exercises";
import { MAX_E1RM_REPS } from "./e1rm";
import { availableLoadsKg } from "./equipment";
import { exerciseMaximum, STRENGTH_RATIOS, TYPICAL_REFERENCE_PER_KG } from "./strength-ratios";

// Where a test Exercise is in its protocol, for the logging screen to render. Working up: Sets of 5, each at the
// suggested load (null when the equipment's loads aren't known). One Set: a bodyweight or timed test is a single Set
// taken to RPE 9, so there is no load to suggest. Done: a weighted Set reached RPE 9, or the one Set is logged.
// Load-limited: a weighted test ended past 12 reps without reaching RPE 9, so the equipment ran out of load.
export type ProtocolState =
  | { status: "working-up"; suggestedKg: number | null }
  | { status: "one-set" }
  | { status: "done" }
  | { status: "load-limited" };

// Every Set of a weighted test is 5 reps
export const TEST_REPS = 5;

// The first Set rated this hard or harder is the test's top Set
export const TOP_SET_RPE = 9;

// How far to aim above the last load, by its RPE: an easy Set jumps further
const JUMP_BY_RPE: Record<number, number> = { 6: 0.2, 7: 0.1, 8: 0.05 };

// A weighted test with no Set at RPE 9 or higher whose last Set went past 12 reps: the load ran out before the effort
// did. The Logbook ends the test there, and `assess` takes its maximum as a lower bound
export function isLoadLimited(sets: Set[]): boolean {
  const last = sets.at(-1);
  return last?.kind === "external" && last.reps > MAX_E1RM_REPS && !sets.some((set) => (set.rpe ?? 0) >= TOP_SET_RPE);
}

const bySlug = new Map(EXERCISES.map((exercise) => [exercise.slug, exercise]));

// The first Set is at this share of the likely maximum, so it's easy even for a weaker user
const FIRST_LOAD_SHARE = 0.5;

// The first load: half the likely maximum, down to a load the equipment has (the lightest when all are heavier). None
// without the body weight and gender to judge it by
function firstLoadKg(slug: string, loads: number[], bodyProfile: BodyProfile | undefined) {
  const entry = STRENGTH_RATIOS[slug];
  if (!bodyProfile || entry?.kind !== "weighted" || entry.pattern === "core" || !loads.length) return null;
  const { weightKg, gender } = bodyProfile;
  const likelyMaximum = exerciseMaximum(slug, weightKg * TYPICAL_REFERENCE_PER_KG[gender][entry.pattern]);
  return loads.filter((kg) => kg <= likelyMaximum * FIRST_LOAD_SHARE).at(-1) ?? loads[0];
}

export function protocolState(
  { slug, sets }: Pick<InProgressWorkoutExercise, "slug" | "sets">,
  equipmentProfile: Pick<EquipmentProfile, "tags" | "loads">,
  bodyProfile: BodyProfile | undefined,
): ProtocolState {
  const exercise = bySlug.get(slug);
  if (exercise && exercise.loadType !== "external") return sets.length ? { status: "done" } : { status: "one-set" };
  if (sets.some((set) => (set.rpe ?? 0) >= TOP_SET_RPE)) return { status: "done" };
  if (isLoadLimited(sets)) return { status: "load-limited" };
  const last = sets.at(-1);
  if (!exercise) return { status: "working-up", suggestedKg: null };
  const loads = availableLoadsKg(exercise, equipmentProfile);
  if (!last) return { status: "working-up", suggestedKg: firstLoadKg(slug, loads, bodyProfile) };
  if (last.kind !== "external") return { status: "working-up", suggestedKg: null };
  const target = last.kg * (1 + (JUMP_BY_RPE[last.rpe ?? 8] ?? 0));
  // The first load the equipment allows at or past the target, and always heavier than the last; at the heaviest,
  // the heaviest again
  const next = loads.find((kg) => kg > last.kg && kg >= target) ?? loads.at(-1);
  return { status: "working-up", suggestedKg: next ?? null };
}

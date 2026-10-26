import type { EquipmentProfile, InProgressWorkoutExercise, TestedPattern, UserProfile } from "@fit/shared";
import { EXERCISES } from "./data/exercises";
import { availableLoadsKg } from "./equipment";
import { exerciseMaximum, STRENGTH_RATIOS } from "./strength-ratios";

// Where a test Exercise is in its protocol, for the logging screen to render. Working up: Sets of 5, each at the
// suggested load (null when the equipment's loads aren't known). One Set: a bodyweight or timed test is a single Set
// taken to RPE 9, so there is no load to suggest. Done: a weighted Set reached RPE 9, or the one Set is logged.
// Still to come: load-limited (#38)
export type ProtocolState =
  | { status: "working-up"; suggestedKg: number | null }
  | { status: "one-set" }
  | { status: "done" };

// Every Set of a weighted test is 5 reps
export const TEST_REPS = 5;

// The first Set rated this hard or harder is the test's top Set
export const TOP_SET_RPE = 9;

// How far to aim above the last load, by its RPE: an easy Set jumps further
const JUMP_BY_RPE: Record<number, number> = { 6: 0.2, 7: 0.1, 8: 0.05 };

const bySlug = new Map(EXERCISES.map((exercise) => [exercise.slug, exercise]));

// A deliberately low guess at a Pattern's Reference Strength, as a multiple of body weight: roughly a novice's
const LIKELY_REFERENCE_PER_KG: Record<UserProfile["gender"], Record<TestedPattern, number>> = {
  male: { squat: 1, hinge: 1.25, push: 0.75, pull: 1, core: 0 },
  female: { squat: 0.7, hinge: 0.9, push: 0.45, pull: 0.7, core: 0 },
};
// The first Set is at this share of the likely maximum, so it's easy even for a weaker user
const FIRST_LOAD_SHARE = 0.5;

// The first load: half the likely maximum, down to a load the equipment has (the lightest when all are heavier)
function firstLoadKg(slug: string, loads: number[], { weightKg, gender }: Pick<UserProfile, "weightKg" | "gender">) {
  const entry = STRENGTH_RATIOS[slug];
  if (entry?.kind !== "weighted" || !loads.length) return null;
  const likelyMaximum = exerciseMaximum(slug, weightKg * LIKELY_REFERENCE_PER_KG[gender][entry.pattern]);
  return loads.filter((kg) => kg <= likelyMaximum * FIRST_LOAD_SHARE).at(-1) ?? loads[0];
}

export function protocolState(
  { slug, sets }: Pick<InProgressWorkoutExercise, "slug" | "sets">,
  equipmentProfile: Pick<EquipmentProfile, "tags" | "loads">,
  profile: Pick<UserProfile, "weightKg" | "gender">,
): ProtocolState {
  const exercise = bySlug.get(slug);
  if (exercise && exercise.loadType !== "external") return sets.length ? { status: "done" } : { status: "one-set" };
  if (sets.some((set) => (set.rpe ?? 0) >= TOP_SET_RPE)) return { status: "done" };
  const last = sets.at(-1);
  if (!exercise) return { status: "working-up", suggestedKg: null };
  const loads = availableLoadsKg(exercise, equipmentProfile);
  if (!last) return { status: "working-up", suggestedKg: firstLoadKg(slug, loads, profile) };
  if (last.kind !== "external") return { status: "working-up", suggestedKg: null };
  const target = last.kg * (1 + (JUMP_BY_RPE[last.rpe ?? 8] ?? 0));
  // The first load the equipment allows at or past the target, and always heavier than the last; at the heaviest,
  // the heaviest again
  const next = loads.find((kg) => kg > last.kg && kg >= target) ?? loads.at(-1);
  return { status: "working-up", suggestedKg: next ?? null };
}

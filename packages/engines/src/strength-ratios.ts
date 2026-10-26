import type { TestedPattern, UserProfile } from "@fit/shared";

// How an Exercise's strength follows from its Pattern's Reference Strength (GLOSSARY.md). An Exercise's maximum is
// the Reference Strength × its ratio, and a test's maximum ÷ its ratio gives the Reference Strength back.
// - weighted: the maximum is an e1RM in kg. For a dumbbell or kettlebell Exercise it's one implement's weight.
// - bodyweight: the maximum is an e1RM in kg of the load moved, body weight × share.
// - timed: the maximum is seconds; core's Reference Strength is plank seconds.
// - core-reps: a core rep Exercise, always 10 reps. band: the lightest band and 12 reps. Neither scales.
// Carry has no test of its own, so carry Exercises scale from hinge.
export type StrengthRatio =
  | { kind: "weighted"; pattern: TestedPattern; ratio: number }
  | { kind: "bodyweight"; pattern: TestedPattern; ratio: number; share: number }
  | { kind: "timed"; pattern: "core"; ratio: number }
  | { kind: "core-reps" }
  | { kind: "band" };

const weighted = (pattern: TestedPattern, ratio: number): StrengthRatio => ({ kind: "weighted", pattern, ratio });
const bodyweight = (pattern: TestedPattern, ratio: number, share: number): StrengthRatio => ({
  kind: "bodyweight",
  pattern,
  ratio,
  share,
});
const timed = (ratio: number): StrengthRatio => ({ kind: "timed", pattern: "core", ratio });
const CORE_REPS: StrengthRatio = { kind: "core-reps" };
const BAND: StrengthRatio = { kind: "band" };

// First guesses, to be tuned with real Assessments. The bodyweight ratios were set so that a beginner (75 kg; back
// squat 60, deadlift 80, bench 50, pull-up total 80) gets a sensible rep target
export const STRENGTH_RATIOS: Record<string, StrengthRatio> = {
  // ─── Squat: back squat e1RM ───
  "back-squat": weighted("squat", 1),
  "goblet-squat": weighted("squat", 0.4),
  "dumbbell-bulgarian-split-squat": weighted("squat", 0.2),
  "dumbbell-reverse-lunge": weighted("squat", 0.2),
  "dumbbell-step-up": weighted("squat", 0.18),
  "bodyweight-squat": bodyweight("squat", 1.35, 0.7),
  "split-squat": bodyweight("squat", 1.2, 0.7),
  "reverse-lunge": bodyweight("squat", 1.2, 0.7),
  "step-up": bodyweight("squat", 1.2, 0.7),
  "bulgarian-split-squat": bodyweight("squat", 1.15, 0.7),
  "cossack-squat": bodyweight("squat", 1.1, 0.7),
  "shrimp-squat": bodyweight("squat", 1, 0.7),
  "pistol-squat": bodyweight("squat", 0.95, 0.7),

  // ─── Hinge: deadlift e1RM ───
  deadlift: weighted("hinge", 1),
  "barbell-romanian-deadlift": weighted("hinge", 0.75),
  "dumbbell-romanian-deadlift": weighted("hinge", 0.3),
  "dumbbell-single-leg-romanian-deadlift": weighted("hinge", 0.2),
  "dumbbell-hip-thrust": weighted("hinge", 0.5),
  "kettlebell-swing": weighted("hinge", 0.3),
  "single-arm-kettlebell-swing": weighted("hinge", 0.2),
  "glute-bridge": bodyweight("hinge", 0.9, 0.6),
  "single-leg-romanian-deadlift": bodyweight("hinge", 0.8, 0.6),
  "single-leg-glute-bridge": bodyweight("hinge", 0.75, 0.6),
  "suspension-hamstring-curl": bodyweight("hinge", 0.7, 0.6),

  // ─── Carry: from hinge, per hand ───
  "farmers-carry": weighted("hinge", 0.4),
  "suitcase-carry": weighted("hinge", 0.35),
  "front-rack-carry": weighted("hinge", 0.25),
  "overhead-carry": weighted("hinge", 0.2),

  // ─── Push: bench press e1RM ───
  "barbell-bench-press": weighted("push", 1),
  "dumbbell-bench-press": weighted("push", 0.4),
  "single-arm-dumbbell-bench-press": weighted("push", 0.4),
  "dumbbell-floor-press": weighted("push", 0.37),
  "barbell-overhead-press": weighted("push", 0.65),
  "dumbbell-overhead-press": weighted("push", 0.25),
  "single-arm-overhead-press": weighted("push", 0.25),
  "landmine-press": weighted("push", 0.35),
  "dumbbell-lateral-raise": weighted("push", 0.1),
  "push-up": bodyweight("push", 1.3, 0.64),
  "incline-push-up": bodyweight("push", 1.3, 0.5),
  "decline-push-up": bodyweight("push", 1.3, 0.7),
  "ring-push-up": bodyweight("push", 1.2, 0.64),
  "pike-push-up": bodyweight("push", 1.15, 0.6),
  "archer-push-up": bodyweight("push", 1.1, 0.64),
  "bar-dip": bodyweight("push", 1.45, 0.9),
  "ring-dip": bodyweight("push", 1.35, 0.9),

  // ─── Pull: a pull-up's total load (body weight plus anything added) ───
  "pull-up": bodyweight("pull", 1, 1),
  "chin-up": bodyweight("pull", 1.05, 1),
  "pull-up-negative": bodyweight("pull", 1.15, 1),
  "inverted-row": bodyweight("pull", 0.8, 0.6),
  "ring-row": bodyweight("pull", 0.8, 0.6),
  "prone-ytw": bodyweight("pull", 0.15, 0.1),
  "one-arm-dumbbell-row": weighted("pull", 0.3),
  "chest-supported-dumbbell-row": weighted("pull", 0.22),
  "renegade-row": weighted("pull", 0.15),
  "lat-pulldown": weighted("pull", 0.75),
  "seated-cable-row": weighted("pull", 0.75),

  // ─── Core: plank seconds ───
  plank: timed(1),
  "side-plank": timed(0.5),
  "hollow-hold": timed(0.5),
  "dead-bug": CORE_REPS,
  "bird-dog": CORE_REPS,
  "hanging-knee-raise": CORE_REPS,
  "hanging-leg-raise": CORE_REPS,
  "ab-wheel-rollout": CORE_REPS,
  "ring-fallout": CORE_REPS,

  // ─── Bands (and band Exercises a cable machine can stand in for) ───
  "band-pull-apart": BAND,
  "band-row": BAND,
  "band-lat-pulldown": BAND,
  "band-chest-press": BAND,
  "band-overhead-press": BAND,
  "band-good-morning": BAND,
  "band-face-pull": BAND,
  "mini-band-glute-bridge": BAND,
  "pallof-press": BAND,
};

function scalableRatio(slug: string) {
  const entry = STRENGTH_RATIOS[slug];
  if (!entry || !("ratio" in entry)) throw new Error(`"${slug}" doesn't scale from a Reference Strength`);
  return entry;
}

// The Reference Strength a test's maximum gives its Pattern
export const referenceStrength = (slug: string, maximum: number) => maximum / scalableRatio(slug).ratio;

// An Exercise's maximum, from its Pattern's Reference Strength
export const exerciseMaximum = (slug: string, referenceStrength: number) =>
  referenceStrength * scalableRatio(slug).ratio;

// The Patterns whose Reference Strength is an e1RM in kg; core's is plank seconds
export type KgPattern = Exclude<TestedPattern, "core">;
export const KG_PATTERNS: KgPattern[] = ["squat", "hinge", "push", "pull"];

// A deliberately low guess at a Pattern's Reference Strength, as a multiple of body weight: roughly a novice's. It
// sets a test's first load, and the balance between Patterns when an untested one is estimated from the others
export const TYPICAL_REFERENCE_PER_KG: Record<UserProfile["gender"], Record<KgPattern, number>> = {
  male: { squat: 1, hinge: 1.25, push: 0.75, pull: 1 },
  female: { squat: 0.7, hinge: 0.9, push: 0.45, pull: 0.7 },
};

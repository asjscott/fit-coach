import {
  RPE_SCALE,
  type Exercise,
  type ProgressionChange,
  type Set,
  type WorkingLevel,
  type Workout,
  type WorkoutExercise,
} from "@fit/shared";
import { epley, epleyReps } from "./e1rm";
import { availableLoadsKg, nextLoadKg, roundToLoadKg, type ProfileWithLoads } from "./equipment";
import { isJump } from "./jumps";
import { MAX_REPS, repRange, type RepRange } from "./working-levels";

// Everything progression judges one Workout Exercise by (ADR 0007, #132)
export type ProgressionInput = {
  // The Exercise's Working Level before this Workout: the stored one, or the one seeded from Reference Strength
  level: WorkingLevel;
  // The Workout the Sets were logged in
  workout: Pick<Workout, "id" | "startedAt" | "assessment">;
  // The Exercise's Sets in that Workout
  workoutExercise: Pick<WorkoutExercise, "slug" | "sets">;
  // The library Exercise
  exercise: Exercise;
  // The primary Equipment Profile, whose loads the level is prescribed at and whose Load Steps it moves by
  equipmentProfile: ProfileWithLoads;
  // The Block's deload week (weekOfBlock)
  deloadWeek: boolean;
  // The Sets its Planned Workout prescribed, when the Workout was started from one: an Exercise done as one Set is
  // judged on that Set
  plannedSets?: number;
};

// The next Working Level, moved by this Workout, and why it changed: null when the Sets were judged and nothing
// changed. Only the Workout that moved it is new then
export type Progression = { level: WorkingLevel; change: ProgressionChange | null };

// What the rules see: the input, with the Sets judged. For a weighted level these are the Sets at the lowest load used,
// and the level's kg is that load: the prescribed load if it was lifted, else the new base
type Judgement = ProgressionInput & { sets: Set[] };

// A rule gives the Exercise's next Working Level, UNMOVED to leave it as it is (not even recording the Workout), or
// undefined to pass to the next rule. Rules run in RULES' order and the first to decide wins, so a later ticket adds
// one by putting it in its place there
const UNMOVED = "unmoved";
type Outcome = Progression | typeof UNMOVED;
type ProgressionRule = (judgement: Judgement) => Outcome | undefined;

// All the user had: no more reps
const MAX_RPE = RPE_SCALE[RPE_SCALE.length - 1];

// A load logged in the other unit is its exact kg, a hair off the profile's own
const SAME_LOAD_KG = 0.01;

// The level as this Workout leaves it, recording the Workout as the one that last moved it and why it changed
function moved({ level, workout }: Judgement, changes: Partial<WorkingLevel>, change: ProgressionChange | null) {
  // An earlier Workout's reason goes, as this Workout's is the one shown
  const next = { ...level, ...changes, movedBy: { workoutId: workout.id, startedAt: workout.startedAt } };
  delete next.change;
  return { level: { ...next, ...(change && { change }) } as WorkingLevel, change };
}

const repsOf = (set: Set) => ("reps" in set ? set.reps : 0);
const fewestReps = (sets: readonly Set[]) => Math.min(...sets.map(repsOf));
const lowestKg = (sets: readonly Set[]) =>
  Math.min(...sets.map((set) => (set.kind === "external" ? set.kg : Infinity)));

// ─── The rules ───

// Stories 26, 82: only a Workout that started after the one that last moved the level moves it, so a retried, late or
// past upload never moves it twice or backwards
const laterWorkoutsOnly: ProgressionRule = ({ level: { movedBy }, workout }) =>
  movedBy && Date.parse(workout.startedAt) <= Date.parse(movedBy.startedAt) ? UNMOVED : undefined;

// Story 40: an Assessment Workout sets Working Levels, so it doesn't progress them
const notAnAssessment: ProgressionRule = ({ workout }) => (workout.assessment ? UNMOVED : undefined);

// Story 38, 39: one Set decides nothing, unless the Exercise was done as one Set
const atLeastTwoSets: ProgressionRule = ({ sets, plannedSets }) =>
  sets.length >= Math.min(2, plannedSets ?? 2) ? undefined : UNMOVED;

// Until #135 and #136 give them their rules: bodyweight, timed and band ladders, Ballistic Exercises and carries. A
// jump never moves (#105)
const notYetProgressed: ProgressionRule = ({ level, exercise }) =>
  level.unit !== "kg" || exercise.ballistic || isJump(exercise) || !repRange(exercise, level.unit)
    ? UNMOVED
    : undefined;

// Stories 43, 44: an RPE of 10 on the Exercise's last Set logged, whatever its load, holds the load and the target, so a
// Set that was all the user had never pushes them on. The Workout still counts as the one that last moved the level
const rpeTenHolds: ProgressionRule = (judgement) =>
  judgement.workoutExercise.sets.at(-1)?.rpe === MAX_RPE ? moved(judgement, {}, { code: "rpe-10" }) : undefined;

// Story 37: a load other than the one prescribed becomes the new base, at the fewest reps lifted there
const newBase: ProgressionRule = (judgement) => {
  const { level, sets } = judgement;
  if (level.unit !== "kg" || Math.abs(lowestKg(sets) - level.kg) <= SAME_LOAD_KG) return undefined;
  return moved(judgement, { kg: lowestKg(sets), reps: fewestReps(sets) }, { code: "new-base" });
};

// One Load Step up and the reps Epley predicts there from the fewest reps logged, capped at the top of the range; or
// undefined when there's no step (the load ceiling) or Epley predicts fewer than the bottom of the range there
function loadStepUp({ level, exercise, equipmentProfile, sets }: Judgement, range: RepRange) {
  if (level.unit !== "kg") return undefined;
  const kg = nextLoadKg(exercise, equipmentProfile, level.kg, 1);
  if (kg === undefined) return undefined;
  const reps = Math.floor(epleyReps(epley(level.kg, fewestReps(sets)), kg));
  return reps >= range.min ? { kg, reps: Math.min(reps, range.max) } : undefined;
}

// Stories 29–35, weighted double progression: every Set at the target puts it up 1 rep. Every Set at the top of the
// range takes one Load Step up, once Epley predicts at least the bottom of the range there; until then, and at the
// heaviest load the profile has, the target climbs to 20. At 20 with no step to take, the Exercise is outgrown: the
// planner gives its harder variant if the profile can do it, or holds it
const doubleProgression: ProgressionRule = (judgement) => {
  const { level, exercise, sets } = judgement;
  const range = repRange(exercise, level.unit);
  if (level.unit !== "kg" || !range) return undefined;
  if (fewestReps(sets) < level.reps) return moved(judgement, {}, null);
  const stepUp = fewestReps(sets) >= range.max ? loadStepUp(judgement, range) : undefined;
  if (stepUp) return moved(judgement, stepUp, { code: "load-up" });
  if (level.reps >= MAX_REPS) return moved(judgement, { outgrown: true }, { code: "outgrown" });
  return moved(judgement, { reps: level.reps + 1 }, { code: "target-up" });
};

// In order: the first to decide wins. Where later tickets' rules go: the deload week (#137) after notAnAssessment;
// RPE 10 (#133, rpeTenHolds) and Misses (#134) before newBase; ladders (#135) and Ballistic Exercises and carries (#136) in place of
// notYetProgressed
const RULES: readonly ProgressionRule[] = [
  laterWorkoutsOnly,
  notAnAssessment,
  atLeastTwoSets,
  notYetProgressed,
  rpeTenHolds,
  newBase,
  doubleProgression,
];

// The Sets judged: for a weighted level those at the lowest load used, with the level at that load. A level lifted at
// the load it was prescribed at, which is rounded to the profile's loads, takes that load
function judge(input: ProgressionInput): Judgement {
  const { level, workoutExercise, exercise, equipmentProfile } = input;
  const { sets } = workoutExercise;
  if (level.unit !== "kg" || !sets.some((set) => set.kind === "external")) return { ...input, sets };
  const lowest = lowestKg(sets);
  const atLowest = sets.filter((set) => set.kind === "external" && Math.abs(set.kg - lowest) <= SAME_LOAD_KG);
  const prescribed = roundToLoadKg(level.kg, availableLoadsKg(exercise, equipmentProfile));
  const kg = Math.abs(lowest - prescribed) <= SAME_LOAD_KG ? prescribed : level.kg;
  return { ...input, level: { ...level, kg }, sets: atLowest };
}

// The Working Level a Workout Exercise leaves its Exercise at (ADR 0007), or null when it doesn't move it. Pure: the
// server runs it at upload for each Workout Exercise, before the Planned Workout is rebuilt
export function progressWorkingLevel(input: ProgressionInput): Progression | null {
  const judgement = judge(input);
  for (const rule of RULES) {
    const outcome = rule(judgement);
    if (outcome === UNMOVED) return null;
    if (outcome) return outcome;
  }
  return null;
}

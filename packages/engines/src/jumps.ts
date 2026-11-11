import type { Assessment, Exercise, Goal, InjuryTag } from "@fit/shared";
import type { Candidate } from "./alternative-exercises";
import { EXERCISES } from "./data/exercises";
import { isAvailable, isSafeFor, type ProfileWithLoads } from "./equipment";
import { STRENGTH_RATIOS } from "./strength-ratios";
import type { LedgerWorkout } from "./week-ledger";

// A jump (#105): a bodyweight Ballistic Exercise. Its Sets are contacts, it has no Working Level, and it doesn't
// progress by itself. A weighted Ballistic Exercise, a swing, is not one
export const isJump = ({ ballistic, loadType }: Pick<Exercise, "ballistic" | "loadType">) =>
  ballistic && loadType === "bodyweight";

// The research's dose: 2 Workouts a week, each with 2 jumps of 3 Sets, about 48 contacts a Workout
export const JUMP_WORKOUTS_PER_WEEK = 2;
export const JUMPS_PER_WORKOUT = 2;
export const JUMP_SETS = 3;

// Jumps that go forward or sideways, which help sprinting most. The others go up. A Workout mixes the two
const HORIZONTAL_JUMPS: ReadonlySet<string> = new Set(["broad-jump", "lateral-bound"]);

// The jumps easiest first, by following the ladder from the one whose regression isn't a jump, so the library's order
// never decides anything
function jumpLadder(): Exercise[] {
  const jumps = new Map(EXERCISES.filter(isJump).map((exercise) => [exercise.slug, exercise]));
  const ladder: Exercise[] = [];
  let rung = [...jumps.values()].find(({ regression }) => !regression || !jumps.has(regression));
  while (rung && !ladder.includes(rung)) {
    ladder.push(rung);
    rung = rung.progression ? jumps.get(rung.progression) : undefined;
  }
  return ladder;
}

// A jump's contacts a Set, from its place on the ladder (STRENGTH_RATIOS); half in the deload week
function contactsOf(slug: string, deloadWeek: boolean) {
  const entry = STRENGTH_RATIOS[slug];
  if (entry?.kind !== "contacts") throw new Error(`"${slug}" has no contacts`);
  return deloadWeek ? Math.max(1, Math.floor(entry.contacts / 2)) : entry.contacts;
}

// What decides whether a user gets jumps
export type JumpInput = {
  goal: Goal;
  // The one-time "Include jumps" switch, off by default
  includeJumps?: boolean;
  assessment: Pick<Assessment, "patterns">;
  equipmentProfile: ProfileWithLoads;
  injuries: readonly InjuryTag[];
  deloadWeek?: boolean;
};

// The jumps this user can be given, easiest first, each with its contacts as a reps target. None unless the Goal is
// athletic, the switch is on and the squat was tested rather than estimated; a knee or ankle injury rules them out
// through avoidWith. No age or body-weight cut-offs, as no evidence supports any
export function jumpCandidates({
  goal,
  includeJumps,
  assessment,
  equipmentProfile,
  injuries,
  deloadWeek = false,
}: JumpInput): Candidate[] {
  if (goal !== "athletic" || !includeJumps || assessment.patterns.squat?.estimated !== false) return [];
  return jumpLadder()
    .filter((exercise) => isAvailable(exercise, equipmentProfile) && isSafeFor(exercise, [...injuries]))
    .map((exercise) => ({ exercise, target: { unit: "reps", reps: contactsOf(exercise.slug, deloadWeek) } }));
}

const hasJump = ({ workoutExercises }: LedgerWorkout, jumps: readonly Candidate[]) =>
  workoutExercises.some(({ slug }) => jumps.some(({ exercise }) => exercise.slug === slug));

// The next Workout's jumps: none once the week has had its jump Workouts, else one that goes up and one that goes
// forward or sideways, easiest first, preferring jumps not done yet this week so the two Workouts mix types
export function jumpsForWorkout(candidates: readonly Candidate[], thisWeek: readonly LedgerWorkout[]): Candidate[] {
  if (thisWeek.filter((workout) => hasJump(workout, candidates)).length >= JUMP_WORKOUTS_PER_WEEK) return [];
  const doneThisWeek = new Set(thisWeek.flatMap(({ workoutExercises }) => workoutExercises.map(({ slug }) => slug)));
  const fresh = candidates.filter(({ exercise }) => !doneThisWeek.has(exercise.slug));
  const ordered = [...fresh, ...candidates.filter((candidate) => !fresh.includes(candidate))];
  const isHorizontal = ({ exercise }: Candidate) => HORIZONTAL_JUMPS.has(exercise.slug);
  const mixed = [ordered.find((candidate) => !isHorizontal(candidate)), ordered.find(isHorizontal)].filter(
    (candidate): candidate is Candidate => candidate !== undefined,
  );
  const rest = ordered.filter((candidate) => !mixed.includes(candidate));
  return [...mixed, ...rest].slice(0, JUMPS_PER_WORKOUT);
}

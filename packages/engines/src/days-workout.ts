import type { Goal, PlannedExercise, PlannedWorkout, WorkoutLength } from "@fit/shared";
import { exerciseBySlug } from "./data/exercises";
import { SETS_PER_PICK } from "./weekly-budget";
import { secondsForSets, WARM_UP_SECONDS } from "./workout-length";

// The library's median, for an Exercise this app version doesn't know yet
const TYPICAL_SECONDS_PER_SET = 105;

// What the user can change for one Workout. Local to the phone: nothing here reaches the stored plan
export type DayChoices = { workoutLength: WorkoutLength };

// The choices the user has made, tied to the plan they made them on
export type MadeChoices = { plannedWorkoutId: string; choices: Partial<DayChoices> };

// The usual choices, with the user's own on top. They don't stick: a new plan goes back to the usual ones
export const dayChoices = (plannedWorkoutId: string, usual: DayChoices, made: MadeChoices | null): DayChoices =>
  made?.plannedWorkoutId === plannedWorkoutId ? { ...usual, ...made.choices } : usual;

const secondsPerSet = (slug: string) => exerciseBySlug(slug)?.secondsPerSet ?? TYPICAL_SECONDS_PER_SET;

const secondsOf = (plannedExercises: readonly PlannedExercise[]) =>
  plannedExercises.reduce((seconds, { slug, sets }) => seconds + sets * secondsPerSet(slug), 0);

// Every Exercise's first Sets, then the 4th Sets the planner adds last: stored with their Exercise, they're still its
// lowest priority work
const setsInPriorityOrder = (plannedExercises: readonly PlannedExercise[]): PlannedExercise[] => [
  ...plannedExercises.flatMap((exercise) => Array(Math.min(exercise.sets, SETS_PER_PICK)).fill(exercise)),
  ...plannedExercises.flatMap((exercise) => Array(Math.max(exercise.sets - SETS_PER_PICK, 0)).fill(exercise)),
];

// Keeps Sets in priority order and stops at the first that doesn't fit: nothing lower priority may take the place of
// higher priority work
function cutToSeconds(plannedExercises: readonly PlannedExercise[], seconds: number) {
  const keptSets = new Map<PlannedExercise, number>();
  let secondsLeft = seconds;
  for (const plannedExercise of setsInPriorityOrder(plannedExercises)) {
    secondsLeft -= secondsPerSet(plannedExercise.slug);
    if (secondsLeft < 0) break;
    keptSets.set(plannedExercise, (keptSets.get(plannedExercise) ?? 0) + 1);
  }
  return plannedExercises.flatMap((plannedExercise) => {
    const sets = keptSets.get(plannedExercise);
    return sets ? [{ ...plannedExercise, sets }] : [];
  });
}

// Lower goes first
function orderRank(slug: string, goal: Goal | undefined) {
  const exercise = exerciseBySlug(slug);
  if (goal === "athletic" && exercise?.ballistic) return 0;
  return exercise && exercise.muscles.primary.length > 1 ? 1 : 2;
}

// Stable, so Exercises of the same rank stay in priority order
const inWorkoutOrder = (plannedExercises: readonly PlannedExercise[], goal: Goal | undefined) =>
  [...plannedExercises].sort((a, b) => orderRank(a.slug, goal) - orderRank(b.slug, goal));

// The Workout for today from a Planned Workout. Pure, so going back to an earlier choice gives the same Workout. The
// order comes after the cut, which needs priority order. goal is undefined until the user has loaded
export function daysWorkout(
  { plannedExercises }: Pick<PlannedWorkout, "plannedExercises">,
  choices: DayChoices,
  goal?: Goal,
) {
  const kept = cutToSeconds(plannedExercises, secondsForSets(choices.workoutLength));
  return { plannedExercises: inWorkoutOrder(kept, goal), estimatedSeconds: WARM_UP_SECONDS + secondsOf(kept) };
}

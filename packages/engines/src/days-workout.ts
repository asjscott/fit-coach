import {
  BuiltInEquipment,
  type AlternativeExercise,
  type Goal,
  type PlannedExercise,
  type PlannedWorkout,
  type WorkoutLength,
} from "@fit/shared";
import { exerciseBySlug } from "./data/exercises";
import { SETS_PER_PICK } from "./weekly-budget";
import { secondsForSets, TYPICAL_SECONDS_PER_SET, WARM_UP_SECONDS } from "./workout-length";

// What the user can change for one Workout. Local to the phone: nothing here reaches the stored plan
export type DayChoices = {
  workoutLength: WorkoutLength;
  // Absent on the primary Equipment Profile
  equipment?: BuiltInEquipment;
  // The Alternative Exercise the user prefers, by the slug of the planned Exercise it replaces
  alternativePicks?: Record<string, string>;
};

// The choices the user has made, tied to the plan they made them on
export type MadeChoices = { plannedWorkoutId: string; choices: Partial<DayChoices> };

// The usual choices, with the user's own on top. They don't stick: a new plan goes back to the usual ones
export const dayChoices = (plannedWorkoutId: string, usual: DayChoices, madeChoices: MadeChoices | null): DayChoices =>
  madeChoices?.plannedWorkoutId === plannedWorkoutId ? { ...usual, ...madeChoices.choices } : usual;

// One more choice on top of those already made on this plan
export const withChoice = (
  madeChoices: MadeChoices | null,
  plannedWorkoutId: string,
  choice: Partial<DayChoices>,
): MadeChoices => ({
  plannedWorkoutId,
  choices: { ...(madeChoices?.plannedWorkoutId === plannedWorkoutId && madeChoices.choices), ...choice },
});

// The built-in choices the plan was saved with, which leave out one the primary matches. None on a plan stored before
// Alternative Exercises, whose Exercises would have nothing to change to
export const equipmentChoices = ({ plannedExercises }: Pick<PlannedWorkout, "plannedExercises">) =>
  BuiltInEquipment.options.filter((choice) => plannedExercises.every(({ alternatives }) => alternatives?.[choice]));

// An Exercise in today's Workout. replaces and otherOptions are on an Alternative Exercise: the slug of the planned
// Exercise it stands in for, and what else could
export type DayExercise = Omit<PlannedExercise, "alternatives" | "fourthSetAfter"> & {
  replaces?: string;
  otherOptions?: AlternativeExercise[];
};

// A day's Exercise with what the cut needs: its index in the plan, kept when an earlier Exercise drops out
type Placed = { exercise: DayExercise; place: number; fourthSetAfter?: number };

const secondsPerSet = (slug: string) => exerciseBySlug(slug)?.secondsPerSet ?? TYPICAL_SECONDS_PER_SET;

const secondsOf = (dayExercises: readonly DayExercise[]) =>
  dayExercises.reduce((seconds, { slug, sets }) => seconds + sets * secondsPerSet(slug), 0);

// Applies the equipment. No Exercise can be done twice, so what stays claims its slot first, then the user's picks,
// then each remaining Exercise's first free option in priority order
function onEquipment(
  plannedExercises: readonly PlannedExercise[],
  { equipment, alternativePicks = {} }: DayChoices,
): { placed: Placed[]; dropped: string[] } {
  if (!equipment) {
    return {
      placed: plannedExercises.map(({ slug, sets, target, fourthSetAfter }, place) => ({
        exercise: { slug, sets, target },
        place,
        fourthSetAfter,
      })),
      dropped: [],
    };
  }

  const optionsOf = (exercise: PlannedExercise) => exercise.alternatives?.[equipment] ?? [exercise];
  const chosen = new Map<PlannedExercise, AlternativeExercise>();
  const taken = new Set<string>();
  const claim = (
    choose: (exercise: PlannedExercise, options: AlternativeExercise[]) => AlternativeExercise | undefined,
  ) => {
    for (const exercise of plannedExercises) {
      const free = optionsOf(exercise).filter(({ slug }) => !taken.has(slug));
      const option = chosen.has(exercise) ? undefined : choose(exercise, free);
      if (option) {
        chosen.set(exercise, option);
        taken.add(option.slug);
      }
    }
  };
  claim(({ slug }, options) => options.find((option) => option.slug === slug));
  claim(({ slug }, options) => options.find((option) => option.slug === alternativePicks[slug]));
  claim((_, options) => options[0]);

  return {
    placed: plannedExercises.flatMap((exercise, place) => {
      const option = chosen.get(exercise);
      if (!option) return [];
      const dayExercise = { slug: option.slug, sets: exercise.sets, target: option.target };
      const { fourthSetAfter } = exercise;
      if (option.slug === exercise.slug) return [{ exercise: dayExercise, place, fourthSetAfter }];
      const otherOptions = optionsOf(exercise).filter(({ slug }) => !taken.has(slug));
      return [{ exercise: { ...dayExercise, replaces: exercise.slug, otherOptions }, place, fourthSetAfter }];
    }),
    dropped: plannedExercises.filter((exercise) => !chosen.has(exercise)).map(({ slug }) => slug),
  };
}

// The order the planner added the Sets: each Exercise's first Sets at its place, and a 4th between the places it fell
// between, or last on a plan stored without that. Two 4th Sets in one gap keep plan order, as the sort is stable
function setsInPriorityOrder(placed: readonly Placed[]): DayExercise[] {
  const sets = placed.flatMap(({ exercise, place, fourthSetAfter = Number.MAX_SAFE_INTEGER }) =>
    [
      ...Array<number>(Math.min(exercise.sets, SETS_PER_PICK)).fill(place),
      ...Array<number>(Math.max(exercise.sets - SETS_PER_PICK, 0)).fill(fourthSetAfter - 0.5),
    ].map((priority) => ({ exercise, priority })),
  );
  return sets.sort((a, b) => a.priority - b.priority).map(({ exercise }) => exercise);
}

// Keeps Sets in priority order and stops at the first that doesn't fit: nothing lower priority may take the place of
// higher priority work
function cutToSeconds(placed: readonly Placed[], seconds: number) {
  const keptSets = new Map<DayExercise, number>();
  let secondsLeft = seconds;
  for (const exercise of setsInPriorityOrder(placed)) {
    secondsLeft -= secondsPerSet(exercise.slug);
    if (secondsLeft < 0) break;
    keptSets.set(exercise, (keptSets.get(exercise) ?? 0) + 1);
  }
  return placed.flatMap(({ exercise }) => {
    const sets = keptSets.get(exercise);
    return sets ? [{ ...exercise, sets }] : [];
  });
}

// Lower goes first
function orderRank(slug: string, goal: Goal | undefined) {
  const exercise = exerciseBySlug(slug);
  if (goal === "athletic" && exercise?.ballistic) return 0;
  return exercise && exercise.muscles.primary.length > 1 ? 1 : 2;
}

// Stable, so Exercises of the same rank stay in priority order
const inWorkoutOrder = (dayExercises: readonly DayExercise[], goal: Goal | undefined) =>
  [...dayExercises].sort((a, b) => orderRank(a.slug, goal) - orderRank(b.slug, goal));

// The Workout for today and the slugs of Exercises with no option on the chosen equipment. Equipment comes first so
// the cut times what's actually done, the order last as the cut needs priority. goal is undefined until the user loads
export function daysWorkout(
  { plannedExercises }: Pick<PlannedWorkout, "plannedExercises">,
  choices: DayChoices,
  goal?: Goal,
) {
  const { placed, dropped } = onEquipment(plannedExercises, choices);
  const kept = cutToSeconds(placed, secondsForSets(choices.workoutLength));
  return { plannedExercises: inWorkoutOrder(kept, goal), estimatedSeconds: WARM_UP_SECONDS + secondsOf(kept), dropped };
}

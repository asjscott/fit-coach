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
import { secondsForSets, WARM_UP_SECONDS } from "./workout-length";

// The library's median, for an Exercise this app version doesn't know yet
const TYPICAL_SECONDS_PER_SET = 105;

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
export const dayChoices = (plannedWorkoutId: string, usual: DayChoices, made: MadeChoices | null): DayChoices =>
  made?.plannedWorkoutId === plannedWorkoutId ? { ...usual, ...made.choices } : usual;

// One more choice on top of those already made on this plan
export const withChoice = (
  made: MadeChoices | null,
  plannedWorkoutId: string,
  choice: Partial<DayChoices>,
): MadeChoices => ({
  plannedWorkoutId,
  choices: { ...(made?.plannedWorkoutId === plannedWorkoutId && made.choices), ...choice },
});

// The built-in choices the plan was saved with, which leave out one the primary matches. None on a plan stored before
// Alternative Exercises, whose Exercises would have nothing to change to
export const equipmentChoices = ({ plannedExercises }: Pick<PlannedWorkout, "plannedExercises">) =>
  BuiltInEquipment.options.filter((choice) => plannedExercises.every(({ alternatives }) => alternatives?.[choice]));

// An Exercise in today's Workout. replaces and otherOptions are on an Alternative Exercise: the slug of the planned
// Exercise it stands in for, and what else could
export type DayExercise = Omit<PlannedExercise, "alternatives"> & {
  replaces?: string;
  otherOptions?: AlternativeExercise[];
};

const secondsPerSet = (slug: string) => exerciseBySlug(slug)?.secondsPerSet ?? TYPICAL_SECONDS_PER_SET;

const secondsOf = (dayExercises: readonly DayExercise[]) =>
  dayExercises.reduce((seconds, { slug, sets }) => seconds + sets * secondsPerSet(slug), 0);

// Applies the equipment, with the plan's Exercises in their own places. The same Exercise can't be done twice, so
// what stays comes first, then the user's picks, then each remaining Exercise's first free option in priority order.
// One with none left drops out
function onEquipment(
  plannedExercises: readonly PlannedExercise[],
  { equipment, alternativePicks = {} }: DayChoices,
): { dayExercises: DayExercise[]; dropped: string[] } {
  if (!equipment) {
    return { dayExercises: plannedExercises.map(({ slug, sets, target }) => ({ slug, sets, target })), dropped: [] };
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
    dayExercises: plannedExercises.flatMap((exercise) => {
      const option = chosen.get(exercise);
      if (!option) return [];
      const dayExercise = { slug: option.slug, sets: exercise.sets, target: option.target };
      if (option.slug === exercise.slug) return [dayExercise];
      const otherOptions = optionsOf(exercise).filter(({ slug }) => !taken.has(slug));
      return [{ ...dayExercise, replaces: exercise.slug, otherOptions }];
    }),
    dropped: plannedExercises.filter((exercise) => !chosen.has(exercise)).map(({ slug }) => slug),
  };
}

// Every Exercise's first Sets, then the 4th Sets the planner adds last: stored with their Exercise, they're still its
// lowest priority work
const setsInPriorityOrder = (dayExercises: readonly DayExercise[]): DayExercise[] => [
  ...dayExercises.flatMap((exercise) => Array(Math.min(exercise.sets, SETS_PER_PICK)).fill(exercise)),
  ...dayExercises.flatMap((exercise) => Array(Math.max(exercise.sets - SETS_PER_PICK, 0)).fill(exercise)),
];

// Keeps Sets in priority order and stops at the first that doesn't fit: nothing lower priority may take the place of
// higher priority work
function cutToSeconds(dayExercises: readonly DayExercise[], seconds: number) {
  const keptSets = new Map<DayExercise, number>();
  let secondsLeft = seconds;
  for (const exercise of setsInPriorityOrder(dayExercises)) {
    secondsLeft -= secondsPerSet(exercise.slug);
    if (secondsLeft < 0) break;
    keptSets.set(exercise, (keptSets.get(exercise) ?? 0) + 1);
  }
  return dayExercises.flatMap((exercise) => {
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

// The Workout for today from a Planned Workout, and the slugs of Exercises with no option on the chosen equipment.
// Pure, so going back to an earlier choice gives the same Workout. Equipment comes first so the cut times what's
// actually done, and the order last, as the cut needs priority order. goal is undefined until the user has loaded
export function daysWorkout(
  { plannedExercises }: Pick<PlannedWorkout, "plannedExercises">,
  choices: DayChoices,
  goal?: Goal,
) {
  const { dayExercises, dropped } = onEquipment(plannedExercises, choices);
  const kept = cutToSeconds(dayExercises, secondsForSets(choices.workoutLength));
  return { plannedExercises: inWorkoutOrder(kept, goal), estimatedSeconds: WARM_UP_SECONDS + secondsOf(kept), dropped };
}

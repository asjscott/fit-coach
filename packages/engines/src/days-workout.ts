import {
  BuiltInEquipment,
  type AlternativeExercise,
  type CheckIn,
  type DayLength,
  type Goal,
  type PlannedExercise,
  type PlannedWorkout,
} from "@fit/shared";
import { LIGHTEST_SHARE, readinessShare } from "./check-in";
import { exerciseBySlug } from "./data/exercises";
import { canPair, pairSeconds, secondsPerSetOf } from "./supersets";
import { SETS_PER_PICK } from "./weekly-budget";
import { secondsForSets, WARM_UP_SECONDS } from "./workout-length";

// What the user can change for one Workout. Local to the phone: nothing here reaches the stored plan
export type DayChoices = {
  // Can be Quick, unlike the usual Workout Length
  workoutLength: DayLength;
  // Absent on the primary Equipment Profile
  equipment?: BuiltInEquipment;
  // The Alternative Exercise the user prefers, by the slug of the planned Exercise it replaces
  alternativePicks?: Record<string, string>;
  // Today's check-in, which takes Sets off unless the user chooses the Full Workout
  checkIn?: CheckIn;
  fullWorkout?: boolean;
  // Cuts Sets instead of pairing Exercises into supersets when the Workout doesn't fit its Length
  noSupersets?: boolean;
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

// The built-in choices worth offering: saved with the plan, which leaves out one the primary matches, and changing at
// least one Exercise. None on a plan stored before Alternative Exercises, whose Exercises have nothing to change to
export const equipmentChoices = ({ plannedExercises }: Pick<PlannedWorkout, "plannedExercises">) =>
  BuiltInEquipment.options.filter(
    (choice) =>
      plannedExercises.every(({ alternatives }) => alternatives?.[choice]) &&
      plannedExercises.some(({ slug, alternatives }) => alternatives?.[choice]?.[0]?.slug !== slug),
  );

// An Exercise in today's Workout. replaces and otherOptions are on an Alternative Exercise: the slug of the planned
// Exercise it stands in for, and what else could. supersetWith is the slug of the Exercise it's paired with
export type DayExercise = Omit<PlannedExercise, "alternatives" | "fourthSetAfter"> & {
  replaces?: string;
  otherOptions?: AlternativeExercise[];
  supersetWith?: string;
};

// A day's Exercise with what the cut needs: its index in the plan, kept when an earlier Exercise drops out
type Placed = { exercise: DayExercise; place: number; fourthSetAfter?: number };

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

// Each Exercise's partner in a superset, both ways
type Partners = Map<DayExercise, DayExercise>;

// The first so many Sets in priority order, counted by Exercise
function setCounts(sets: readonly DayExercise[], kept: number) {
  const counts = new Map<DayExercise, number>();
  for (const exercise of sets.slice(0, kept)) counts.set(exercise, (counts.get(exercise) ?? 0) + 1);
  return counts;
}

// The Sets' time, a pair's by pairSeconds once both have Sets
function secondsOfSets(counts: ReadonlyMap<DayExercise, number>, partners: Partners) {
  let seconds = 0;
  const timed = new Set<DayExercise>();
  for (const [exercise, sets] of counts) {
    if (timed.has(exercise)) continue;
    const partner = partners.get(exercise);
    const partnerSets = partner && counts.get(partner);
    if (partner && partnerSets) {
      seconds += pairSeconds({ slug: exercise.slug, sets }, { slug: partner.slug, sets: partnerSets });
      timed.add(partner);
    } else {
      seconds += sets * secondsPerSetOf(exercise.slug);
    }
  }
  return seconds;
}

// How many Sets fit in the time: in priority order, stopping at the first that doesn't fit, as nothing lower priority
// may take the place of higher priority work. A Set never makes the Workout shorter, so the first that doesn't fit
// is the end
function setsInSeconds(sets: readonly DayExercise[], partners: Partners, seconds: number) {
  const fitting = sets.findIndex((_, i) => secondsOfSets(setCounts(sets, i + 1), partners) > seconds);
  return fitting === -1 ? sets.length : fitting;
}

// The pairs worth making, in priority order: each Exercise with the first later one whose Pattern goes with its own
function possiblePairs(placed: readonly Placed[]) {
  const paired = new Set<DayExercise>();
  const pairs: [DayExercise, DayExercise][] = [];
  for (const [i, { exercise }] of placed.entries()) {
    if (paired.has(exercise)) continue;
    const partner = placed
      .slice(i + 1)
      .find(({ exercise: other }) => !paired.has(other) && canPair(exercise.slug, other.slug))?.exercise;
    if (!partner) continue;
    pairs.push([exercise, partner]);
    paired.add(exercise).add(partner);
  }
  return pairs;
}

// The Length's cut, then the check-in's share of what's left, both taking the lowest priority Sets first. When the
// Length would cut a Set, Exercises pair first, one pair at a time in priority order until the Workout fits, and
// only what still doesn't fit is cut. lighter says whether the check-in took any, and canBeLighter whether the
// lowest ratings would (#113)
function cut(placed: readonly Placed[], { workoutLength, checkIn, fullWorkout, noSupersets }: DayChoices) {
  const sets = setsInPriorityOrder(placed);
  const seconds = secondsForSets(workoutLength);
  const partners: Partners = new Map();
  let fitting = setsInSeconds(sets, partners, seconds);
  for (const [a, b] of noSupersets ? [] : possiblePairs(placed)) {
    if (fitting === sets.length) break;
    partners.set(a, b).set(b, a);
    fitting = setsInSeconds(sets, partners, seconds);
  }
  const kept = Math.round(fitting * (fullWorkout ? 1 : readinessShare(checkIn)));
  const keptSets = setCounts(sets, kept);
  const dayExercises = placed.flatMap(({ exercise }) => {
    const count = keptSets.get(exercise);
    if (!count) return [];
    const partner = partners.get(exercise);
    const paired = partner && keptSets.get(partner);
    return [{ ...exercise, sets: count, ...(paired && { supersetWith: partner.slug }) }];
  });
  return {
    dayExercises,
    seconds: secondsOfSets(keptSets, partners),
    lighter: kept < fitting,
    canBeLighter: Math.round(fitting * LIGHTEST_SHARE) < fitting,
  };
}

// Lower goes first
function orderRank(slug: string, goal: Goal | undefined) {
  const exercise = exerciseBySlug(slug);
  if (goal === "athletic" && exercise?.ballistic) return 0;
  return exercise && exercise.muscles.primary.length > 1 ? 1 : 2;
}

// Stable, so Exercises of the same rank stay in priority order. A pair stays together, ordered the same way within it,
// and goes where its earlier Exercise would
function inWorkoutOrder(dayExercises: readonly DayExercise[], goal: Goal | undefined) {
  const rank = ({ slug }: DayExercise) => orderRank(slug, goal);
  const byRank = (a: DayExercise, b: DayExercise) => rank(a) - rank(b);
  const units = dayExercises.flatMap((exercise, i) => {
    const partner = dayExercises.find(({ slug }) => slug === exercise.supersetWith);
    if (partner && dayExercises.indexOf(partner) < i) return [];
    return [partner ? [exercise, partner].sort(byRank) : [exercise]];
  });
  return units.sort((a, b) => Math.min(...a.map(rank)) - Math.min(...b.map(rank))).flat();
}

// The Workout for today, the slugs of Exercises with no option on the chosen equipment, whether the check-in made it
// lighter or could, and whether any Exercises are paired. Equipment comes first so the cut times what's actually done, the order last as the cut needs priority. goal
// is undefined until the user loads
export function daysWorkout(
  { plannedExercises }: Pick<PlannedWorkout, "plannedExercises">,
  choices: DayChoices,
  goal?: Goal,
) {
  const { placed, dropped } = onEquipment(plannedExercises, choices);
  const { dayExercises, seconds, lighter, canBeLighter } = cut(placed, choices);
  return {
    plannedExercises: inWorkoutOrder(dayExercises, goal),
    estimatedSeconds: WARM_UP_SECONDS + seconds,
    dropped,
    lighter,
    canBeLighter,
    paired: dayExercises.some(({ supersetWith }) => supersetWith),
  };
}

import { Muscle, MUSCLE_GROUPS, MuscleGroup, type PlanReason } from "@fit/shared";
import { exerciseBySlug } from "./data/exercises";
import type { FatigueWorkout } from "./fatigue";
import { creditsPerSet, localDateOf, type MuscleCredits } from "./week-ledger";
import type { WeeklyBudget } from "./weekly-budget";

type ReasonsInput = {
  // The tired Muscles whose Exercises the recovery filter left out
  heldBack: readonly Muscle[];
  // Training Workouts only, as the planner counts them
  workouts: readonly FatigueWorkout[];
  // This week's credited Sets before this Workout
  ledger: MuscleCredits;
  budget: WeeklyBudget;
  timeZone: string;
};

const groupOf = (muscle: Muscle) => MuscleGroup.options.find((group) => MUSCLE_GROUPS[group].includes(muscle));

// The day, in the user's timezone, of the last Set that credits any of the Muscles
function lastSetOn(muscles: readonly Muscle[], workouts: readonly FatigueWorkout[], timeZone: string) {
  let last = "";
  for (const { workoutExercises } of workouts) {
    for (const { slug, sets } of workoutExercises) {
      const exercise = exerciseBySlug(slug);
      const credits = exercise ? creditsPerSet(exercise) : {};
      if (!muscles.some((muscle) => credits[muscle])) continue;
      for (const { loggedAt } of sets) if (loggedAt > last) last = loggedAt;
    }
  }
  return localDateOf(new Date(last), timeZone);
}

// How much of a group's budget is still to do this week, as a share of it
function shareShort(group: MuscleGroup, { ledger, budget }: ReasonsInput) {
  const muscles = MUSCLE_GROUPS[group];
  const total = muscles.reduce((sum, muscle) => sum + (budget[muscle] ?? 0), 0);
  const short = muscles.reduce((sum, muscle) => sum + Math.max(0, (budget[muscle] ?? 0) - (ledger[muscle] ?? 0)), 0);
  return total ? short / total : 0;
}

// Why the Coach planned this Workout, in the order the phone shows them: recovering, budget met, behind. Only Muscles
// in a group, as reasons are worded by group. A time cut isn't one, as the Length is the user's choice
export function planReasons(input: ReasonsInput): PlanReason[] {
  const { heldBack, workouts, ledger, budget, timeZone } = input;
  const reasons: PlanReason[] = [];

  const recovering = Muscle.options.filter((muscle) => heldBack.includes(muscle) && groupOf(muscle));
  if (recovering.length) {
    reasons.push({ code: "recovering", muscles: recovering, lastSetOn: lastSetOn(recovering, workouts, timeZone) });
  }

  const budgeted = Object.entries(budget) as [Muscle, number][];
  if (budgeted.every(([muscle, sets]) => (ledger[muscle] ?? 0) >= sets)) {
    reasons.push({ code: "budget-met" });
    return reasons;
  }

  // Before anything's done this week every group is as far behind, which says nothing. A recovering group isn't
  // trained today, so it isn't named. A tie goes to the first group
  if (!budgeted.some(([muscle]) => ledger[muscle])) return reasons;
  const recoveringGroups = new Set(recovering.map(groupOf));
  let furthest: { group: MuscleGroup; short: number } | undefined;
  for (const group of MuscleGroup.options) {
    if (recoveringGroups.has(group)) continue;
    const short = shareShort(group, input);
    if (short > 0 && (!furthest || short > furthest.short)) furthest = { group, short };
  }
  if (furthest) reasons.push({ code: "behind", muscles: [...MUSCLE_GROUPS[furthest.group]] });
  return reasons;
}

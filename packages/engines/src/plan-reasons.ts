import { Muscle, MUSCLE_GROUPS, MuscleGroup, muscleGroupsOf, type Exercise, type PlanReason } from "@fit/shared";
import { creditingSets, type FatigueWorkout } from "./fatigue";
import { localDateOf, type MuscleCredits } from "./week-ledger";
import type { WeeklyBudget } from "./weekly-budget";

type ReasonsInput = {
  // The tired Muscles whose Exercises the recovery filter left out
  heldBack: readonly Muscle[];
  // Training Workouts only, as the planner counts them
  workouts: readonly FatigueWorkout[];
  // This week's credited Sets before this Workout
  ledger: MuscleCredits;
  budget: WeeklyBudget;
  // This Week's Workout count before this one, Recovery Workouts left out, and the user's days per week
  workoutsThisWeek: number;
  daysPerWeek: number;
  timeZone: string;
};

// The day, in the user's timezone, of the last Set that worked any of the Muscles as primary: the Sets that tired them.
// Muscles only secondary credit tired, which no Set worked as primary, take the last Set that credited them at all
function lastSetOn(muscles: readonly Muscle[], workouts: readonly FatigueWorkout[], timeZone: string) {
  const lastWorking = (worked: (exercise: Exercise) => readonly Muscle[]) => {
    let last = "";
    for (const { exercise, loggedAt } of creditingSets(workouts)) {
      if (loggedAt > last && worked(exercise).some((muscle) => muscles.includes(muscle))) last = loggedAt;
    }
    return last;
  };
  const last =
    lastWorking(({ muscles }) => muscles.primary) ||
    lastWorking(({ muscles }) => [...muscles.primary, ...muscles.secondary]);
  return localDateOf(new Date(last), timeZone);
}

// How much of a group's budget is still to do this week, as a share of it
function shareShort(group: MuscleGroup, { ledger, budget }: ReasonsInput) {
  const muscles = MUSCLE_GROUPS[group];
  const total = muscles.reduce((sum, muscle) => sum + (budget[muscle] ?? 0), 0);
  const short = muscles.reduce((sum, muscle) => sum + Math.max(0, (budget[muscle] ?? 0) - (ledger[muscle] ?? 0)), 0);
  return total ? short / total : 0;
}

// Why the Coach planned this Workout, in the order the phone shows them: recovering, the week's work done, behind. Only Muscles
// in a group, as reasons are worded by group. A time cut isn't one, as the Length is the user's choice
export function planReasons(input: ReasonsInput): PlanReason[] {
  const { heldBack, workouts, ledger, budget, workoutsThisWeek, daysPerWeek, timeZone } = input;
  const reasons: PlanReason[] = [];

  const recovering = Muscle.options.filter((muscle) => heldBack.includes(muscle) && muscleGroupsOf([muscle]).length);
  if (recovering.length) {
    reasons.push({ code: "recovering", muscles: recovering, lastSetOn: lastSetOn(recovering, workouts, timeZone) });
  }

  // The week's work is done once This Week reaches the days per week, whatever is left of the budget (#114). The code
  // keeps its first name, budget-met, as stored plans carry it
  if (workoutsThisWeek >= daysPerWeek) {
    reasons.push({ code: "budget-met" });
    return reasons;
  }

  // Before anything's done this week every group is as far behind, which says nothing. A recovering group isn't
  // trained today, so it isn't named. A tie goes to the first group
  const budgeted = Object.entries(budget) as [Muscle, number][];
  if (!budgeted.some(([muscle]) => ledger[muscle])) return reasons;
  const recoveringGroups = new Set(muscleGroupsOf(recovering));
  let furthest: { group: MuscleGroup; short: number } | undefined;
  for (const group of MuscleGroup.options) {
    if (recoveringGroups.has(group)) continue;
    const short = shareShort(group, input);
    if (short > 0 && (!furthest || short > furthest.short)) furthest = { group, short };
  }
  if (furthest) reasons.push({ code: "behind", muscles: [...MUSCLE_GROUPS[furthest.group]] });
  return reasons;
}

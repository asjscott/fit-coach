import { restDay, summarizeWorkout, type FinishedWorkoutSets, type RestDayReason } from "@fit/engines";
import { estimatedTimeLabel, kgLabel, timeStat } from "../workouts/format";

// What Today knows about the user's Workouts: History loading, loaded (with or without any Workouts yet), or
// unavailable offline, when only the Pending Workouts on the phone are known (ADR 0001)
export type TodayState = "loading" | "loaded" | "first-run" | "offline";

// Which state Today is in, from whether History has loaded or failed, and how many Workouts there are
// with the Pending ones
export function todayState({
  historyLoaded,
  failed,
  workoutCount,
}: {
  historyLoaded: boolean;
  failed: boolean;
  workoutCount: number;
}): TodayState {
  if (historyLoaded) return workoutCount ? "loaded" : "first-run";
  return failed ? "offline" : "loading";
}

// Where the Planned Workout stands on Today: on show, on its way after an upload, or asking for a connection in place
// of a stale copy
export type TodayPlan = "planned" | "planning" | "connect" | "none";

// A Workout under way is what's on offer, so Resume stands alone until it's finished or discarded. A stale plan is
// never shown (ADR 0003)
export function todayPlan({
  isLoaded,
  workoutInProgress,
  hasPlan,
  stale,
  syncing = false,
}: {
  isLoaded: boolean;
  workoutInProgress: boolean;
  hasPlan: boolean;
  stale: boolean;
  syncing?: boolean;
}): TodayPlan {
  if (!isLoaded || workoutInProgress || !hasPlan) return "none";
  if (!stale) return "planned";
  return syncing ? "planning" : "connect";
}

// Finishing a Workout offline makes the plan stale, which is just when a Rest Day is likely, so a stale plan counts too.
// Pass the Workouts with the Pending ones
export const todayRestDay = (
  plan: TodayPlan,
  workouts: readonly FinishedWorkoutSets[],
  now: Date,
  daysPerWeek: number | undefined,
) => (plan === "none" ? null : restDay(workouts, now, daysPerWeek));

// The one card at the top of Today
export type TodayCard = "loading" | "resume" | "assessment" | "done" | "rest" | "ready" | "connect" | "manual";

// Waits for the phone and History, so that a day already finished doesn't flash as ready to train
export function todayCard({
  isLoaded,
  state,
  plan,
  workoutInProgress,
  assessmentFirst,
  finishedToday,
  restDay: restDayReason,
}: {
  isLoaded: boolean;
  state: TodayState;
  plan: TodayPlan;
  workoutInProgress: boolean;
  assessmentFirst: boolean;
  finishedToday: boolean;
  restDay: RestDayReason | null;
}): TodayCard {
  if (workoutInProgress) return "resume";
  if (!isLoaded || state === "loading") return "loading";
  if (assessmentFirst) return "assessment";
  if (finishedToday) return "done";
  if (restDayReason) return "rest";
  if (plan === "planned") return "ready";
  return plan === "none" ? "manual" : "connect";
}

const counted = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;

// What the day's Workouts came to: "18 Sets · 44 min · 6,240 kg"
export function todayLoggedLine(workouts: readonly FinishedWorkoutSets[]) {
  const summaries = workouts.map(summarizeWorkout);
  const total = (field: "sets" | "durationMs" | "volumeKg") => summaries.reduce((sum, s) => sum + s[field], 0);
  const { value, unit } = timeStat(total("durationMs"));
  const volumeKg = total("volumeKg");
  return [counted(total("sets"), "Set"), `${value} ${unit}`, ...(volumeKg ? [`${kgLabel(volumeKg)} kg`] : [])].join(
    " · ",
  );
}

// What's in a Planned Workout: "6 Exercises · 18 Sets · About 45 min"
export function todayPlanLine(plannedExercises: readonly { sets: number }[], estimatedSeconds: number) {
  const sets = plannedExercises.reduce((sum, exercise) => sum + exercise.sets, 0);
  return [
    counted(plannedExercises.length, "Exercise"),
    counted(sets, "Set"),
    estimatedTimeLabel(estimatedSeconds),
  ].join(" · ");
}

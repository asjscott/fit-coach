import { restDay, type FinishedWorkoutSets } from "@fit/engines";

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

// The one line under Resume workout or a Manual Workout's Start, and above the Planned Workout, e.g. "Workout 3 of 4 this week"
export function todayStatus({
  state,
  workoutCount,
  target,
}: {
  state: TodayState;
  workoutCount: number;
  target: number | undefined;
}): string | null {
  switch (state) {
    case "loading":
      return null;
    case "offline":
      return "No connection. Workouts save on this phone until there is.";
    case "first-run":
      return "Your first Workout. Add Exercises as you go.";
    case "loaded": {
      const next = workoutCount + 1;
      if (!target) return `Workout ${next} this week`;
      if (workoutCount < target) return `Workout ${next} of ${target} this week`;
      return `Workout ${next} this week · ${target} of ${target} done`;
    }
  }
}

// Where the Planned Workout stands on Today: on show, or the line asking for a connection in place of a stale copy
export type TodayPlan = "planned" | "connect" | "none";

// A Workout under way is what's on offer, so Resume stands alone until it's finished or discarded. A stale plan is
// never shown (ADR 0003)
export function todayPlan({
  isLoaded,
  workoutInProgress,
  hasPlan,
  stale,
}: {
  isLoaded: boolean;
  workoutInProgress: boolean;
  hasPlan: boolean;
  stale: boolean;
}): TodayPlan {
  if (!isLoaded || workoutInProgress || !hasPlan) return "none";
  return stale ? "connect" : "planned";
}

// Finishing a Workout offline makes the plan stale, which is just when a Rest Day is likely, so a stale plan counts too.
// Pass the Workouts with the Pending ones
export const todayRestDay = (
  plan: TodayPlan,
  workouts: readonly FinishedWorkoutSets[],
  now: Date,
  daysPerWeek: number | undefined,
) => (plan === "none" ? null : restDay(workouts, now, daysPerWeek));

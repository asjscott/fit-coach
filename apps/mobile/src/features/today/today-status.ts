import type { Assessment, AssessmentPart, Workout } from "@fit/shared";

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

// What Today offers about the Assessment: to start A or B, or a link to the Results
export type AssessmentOffer = { kind: "start"; part: AssessmentPart } | { kind: "results" } | null;

// From History with the Pending Workouts, and the latest Assessment on the server (null when there is none).
// Still to come (#39): Redo A when A is stale, "Results once synced" while B is Pending, dismissing, and offline
export function assessmentOffer({
  workouts,
  latestAssessment,
}: {
  workouts: Pick<Workout, "id" | "startedAt" | "assessment">[];
  latestAssessment: Pick<Assessment, "aWorkoutId"> | null;
}): AssessmentOffer {
  const newest = (part: AssessmentPart) =>
    workouts
      .filter((workout) => workout.assessment === part)
      .reduce<(typeof workouts)[number] | null>(
        (latest, workout) => (latest && latest.startedAt >= workout.startedAt ? latest : workout),
        null,
      );
  const a = newest("A");
  const b = newest("B");
  if (latestAssessment && (!a || latestAssessment.aWorkoutId === a.id)) return { kind: "results" };
  if (!a) return { kind: "start", part: "A" };
  if (!b || b.startedAt < a.startedAt) return { kind: "start", part: "B" };
  // B is done but its Assessment hasn't been worked out yet
  return null;
}

// The one line under Start/Resume workout, e.g. "Workout 3 of 4 this week"
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

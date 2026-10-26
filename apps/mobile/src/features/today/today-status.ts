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

// What Today offers about the Assessment: to start A, to start B (and redo A when it's stale), that the Results come
// once B syncs, or a link to the Results. `key` names this offer, so dismissing it hides it until another comes along
export type AssessmentOffer = (
  | { kind: "start"; part: "A" }
  | { kind: "start"; part: "B"; redoA: boolean }
  | { kind: "syncing" }
  | { kind: "results" }
) & { key: string };

// An A older than this with no B after it is stale: Today also offers to redo it
const STALE_A_MS = 14 * 24 * 60 * 60 * 1000;

type AssessmentOfferInput = {
  // History with the Pending Workouts
  workouts: (Pick<Workout, "id" | "startedAt" | "assessment"> & { isPending: boolean })[];
  // The latest Assessment on the server, null when there is none. undefined when it can't be known (offline, or
  // History or the Assessment still loading): then only the Pending Workouts on the phone count (ADR 0001)
  latestAssessment: Pick<Assessment, "id" | "createdAt"> | null | undefined;
  now: Date;
  // The key of the offer the user dismissed last, if any
  dismissed: string | null;
};

// Today's Assessment offer, or null when there's none or the user dismissed it
export function assessmentOffer({ dismissed, ...input }: AssessmentOfferInput): AssessmentOffer | null {
  const offer = currentOffer(input);
  return offer && offer.key !== dismissed ? offer : null;
}

function currentOffer({
  workouts,
  latestAssessment,
  now,
}: Omit<AssessmentOfferInput, "dismissed">): AssessmentOffer | null {
  const newest = (part: AssessmentPart) =>
    workouts
      .filter((workout) => workout.assessment === part)
      .reduce<(typeof workouts)[number] | null>(
        (latest, workout) => (latest && latest.startedAt >= workout.startedAt ? latest : workout),
        null,
      );
  const a = newest("A");
  const b = newest("B");
  // B is on the phone, so its Assessment can't be worked out yet
  if (b?.isPending && (!a || b.startedAt > a.startedAt)) return { kind: "syncing", key: `syncing:${b.id}` };
  // An A waiting for its B: the first ever, or a retake started after the latest Assessment was worked out
  const awaitingB =
    a && (!b || b.startedAt < a.startedAt) && (!latestAssessment || a.startedAt > latestAssessment.createdAt);
  if (awaitingB && (latestAssessment !== undefined || a.isPending)) {
    // Going stale is news, so a dismissed B offer comes back with Redo A
    const redoA = now.getTime() - new Date(a.startedAt).getTime() > STALE_A_MS;
    return { kind: "start", part: "B", redoA, key: `start-B:${a.id}${redoA ? ":redo-A" : ""}` };
  }
  if (latestAssessment === undefined) return null;
  // The Assessment is a snapshot, so it stands even once its Workouts are deleted from History
  if (latestAssessment) return { kind: "results", key: `results:${latestAssessment.id}` };
  if (!a) return { kind: "start", part: "A", key: "start-A" };
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

import type { Assessment, TestedPattern, Workout } from "@fit/shared";
import { hasAssessmentResult } from "./assess";
import { latestAssessmentWorkout } from "./assessment-pairing";
import { assessmentTests, canAssess, type ChosenTests } from "./assessment-tests";
import { weekOfBlock } from "./block";
import { mondayOf } from "./week-ledger";

// What Today offers about the Assessment: to start it, that the Results come once its Workout syncs, a link to the
// Results, or in the deload week to retake it (#137), named by that week's Monday. A start names the Patterns it can't
// test; when none has a test, the Assessment is unavailable instead
export type AssessmentOffer =
  | { kind: "start"; untested: TestedPattern[] }
  | { kind: "unavailable" }
  | { kind: "syncing"; workoutId: string }
  | { kind: "results"; assessmentId: string }
  | { kind: "retake"; deloadWeek: string; untested: TestedPattern[] };

// What a dismissed offer is remembered by: the whole offer, so one that changes comes back
export const offerKey = (offer: AssessmentOffer) => JSON.stringify(offer);

type OfferWorkout = Pick<Workout, "id" | "startedAt" | "assessment" | "workoutExercises"> & { isPending: boolean };

export type AssessmentOfferInput = {
  // History with the Pending Workouts
  workouts: OfferWorkout[];
  historyLoaded: boolean;
  // The latest Assessment on the server, null when there is none, undefined until it arrives (or when it can't)
  latestAssessment: Pick<Assessment, "id" | "lastStartedAt"> | null | undefined;
  now: Date;
  // The tests the user's primary Equipment Profile and injuries allow
  tests: ChosenTests;
  // The key of the offer the user dismissed last, if any
  dismissed: string | null;
  // The user's, whose weeks the Block's are
  timeZone: string;
};

type AssessedWorkout = Pick<Workout, "assessment"> & {
  startedAt: string;
  workoutExercises: Parameters<typeof hasAssessmentResult>[0][number]["workoutExercises"];
};

// Whether this Workout makes an Assessment once it's on the server: a single one or an old B with a result, or perhaps a
// B whose A isn't among the Workouts
function makesAssessment(workout: AssessedWorkout, workouts: readonly AssessedWorkout[]): "yes" | "no" | "perhaps" {
  if (workout.assessment !== "single" && workout.assessment !== "B") return "no";
  const a = workout.assessment === "B" && latestAssessmentWorkout(workouts, "A", workout.startedAt);
  if (a === undefined) return "perhaps";
  return hasAssessmentResult(a ? [a, workout] : [workout]) ? "yes" : "no";
}

// Whether a just-finished Workout makes an Assessment once it's uploaded: an old B's A is on the server
export const completesAssessment = (workout: AssessedWorkout): boolean => makesAssessment(workout, []) !== "no";

// The newest Workout that completes an Assessment, a single one or an old B, while it's still on the phone, so its
// Assessment can't be worked out yet. One that measured nothing completes none, but a B whose A isn't loaded may
export function pendingAssessment(workouts: OfferWorkout[]): OfferWorkout | undefined {
  const [newest] = workouts
    .filter((workout) => makesAssessment(workout, workouts) !== "no")
    .sort((x, y) => Date.parse(y.startedAt) - Date.parse(x.startedAt));
  return newest?.isPending ? newest : undefined;
}

// Today's Assessment offer, or null when there's none or the user dismissed it
export function assessmentOffer({ dismissed, ...input }: AssessmentOfferInput): AssessmentOffer | null {
  const offer = currentOffer(input);
  return offer && offerKey(offer) !== dismissed ? offer : null;
}

function currentOffer({
  workouts,
  historyLoaded,
  latestAssessment,
  now,
  tests,
  timeZone,
}: Omit<AssessmentOfferInput, "dismissed">): AssessmentOffer | null {
  // The latest Assessment counts only with History, so the Assessment isn't offered to someone who has done it. Until
  // then only the Pending Workouts on the phone count (ADR 0001)
  const latest = historyLoaded ? latestAssessment : undefined;
  const syncing = pendingAssessment(workouts);
  if (syncing) return { kind: "syncing", workoutId: syncing.id };
  if (latest === undefined) return null;
  const { untested } = assessmentTests(tests);
  // The Assessment is a snapshot, so it stands even once its Workouts are deleted from History
  // The deload week offers a retake, which keeps the Block's progress; ignored, the next Block starts as usual
  if (latest && weekOfBlock(latest, now, timeZone)?.deload && canAssess(tests)) {
    return { kind: "retake", deloadWeek: mondayOf(now, timeZone), untested };
  }
  if (latest) return { kind: "results", assessmentId: latest.id };
  // It's done but the phone hasn't got its Assessment yet. An A with no B doesn't count, nor a B with no A,
  // nor one that measured nothing, which makes none
  const isDone = workouts.some((workout) => makesAssessment(workout, workouts) === "yes");
  if (isDone) return null;
  return canAssess(tests) ? { kind: "start", untested } : { kind: "unavailable" };
}

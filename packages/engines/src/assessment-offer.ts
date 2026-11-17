import type { Assessment, TestedPattern, Workout } from "@fit/shared";
import { latestAssessmentWorkout } from "./assessment-pairing";
import { canAssess, partTests, type ChosenTests } from "./assessment-tests";
import { weekOfBlock } from "./block";
import { mondayOf } from "./week-ledger";

// What Today offers about the Assessment: to start A, to start B (and redo A when it's stale), that the Results come
// once B syncs, a link to the Results, or in the deload week to retake it (#137), named by that week's Monday. Each names the Workout or Assessment it's about. A start names the Patterns
// it can't test; when A or B has no test at all, the Assessment is unavailable instead
export type AssessmentOffer =
  | { kind: "start"; part: "A"; untested: TestedPattern[] }
  | { kind: "start"; part: "B"; aWorkoutId: string; redoA: boolean; untested: TestedPattern[] }
  | { kind: "unavailable" }
  | { kind: "syncing"; bWorkoutId: string }
  | { kind: "results"; assessmentId: string }
  | { kind: "retake"; deloadWeek: string; untested: TestedPattern[] };

// What a dismissed offer is remembered by: the whole offer, so one going stale (Redo A) comes back
export const offerKey = (offer: AssessmentOffer) => JSON.stringify(offer);

// An A older than this with no B after it is stale: Today also offers to redo it
const STALE_A_MS = 14 * 24 * 60 * 60 * 1000;

type OfferWorkout = Pick<Workout, "id" | "startedAt" | "assessment"> & { isPending: boolean };

export type AssessmentOfferInput = {
  // History with the Pending Workouts
  workouts: OfferWorkout[];
  historyLoaded: boolean;
  // The latest Assessment on the server, null when there is none, undefined until it arrives (or when it can't)
  latestAssessment: Pick<Assessment, "id" | "bStartedAt"> | null | undefined;
  now: Date;
  // The tests the user's primary Equipment Profile and injuries allow
  tests: ChosenTests;
  // The key of the offer the user dismissed last, if any
  dismissed: string | null;
  // The user's, whose weeks the Block's are
  timeZone: string;
};

// The newest A and B, and whether that A still awaits a B: as pairing has it, the newest B belongs to the latest A
// before it, which may not be the newest A
function newestAAndB(workouts: OfferWorkout[]) {
  const a = latestAssessmentWorkout(workouts, "A");
  const b = latestAssessmentWorkout(workouts, "B");
  const aAwaitsB = !!a && (!b || latestAssessmentWorkout(workouts, "A", b.startedAt) !== a);
  return { a, b, aAwaitsB };
}

// The newest B while it's still on the phone, so its Assessment can't be worked out yet
export function pendingB(workouts: OfferWorkout[]): OfferWorkout | undefined {
  const { b, aAwaitsB } = newestAAndB(workouts);
  return b?.isPending && !aAwaitsB ? b : undefined;
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
  const start = (offer: { part: "A" } | { part: "B"; aWorkoutId: string; redoA: boolean }): AssessmentOffer =>
    canAssess(tests)
      ? { kind: "start", ...offer, untested: partTests(tests, offer.part).untested }
      : { kind: "unavailable" };
  // The latest Assessment counts only with History, so A isn't offered to someone who has done it. Until then only the
  // Pending Workouts on the phone count (ADR 0001)
  const latest = historyLoaded ? latestAssessment : undefined;
  const { a, aAwaitsB } = newestAAndB(workouts);
  const syncing = pendingB(workouts);
  if (syncing) return { kind: "syncing", bWorkoutId: syncing.id };
  // The first A ever, or a retake started after the latest Assessment's B. Without the server, only a Pending A is sure
  const aIsNew =
    a && (latest === undefined ? a.isPending : !latest || Date.parse(a.startedAt) > Date.parse(latest.bStartedAt));
  if (a && aAwaitsB && aIsNew) {
    const redoA = now.getTime() - Date.parse(a.startedAt) > STALE_A_MS;
    return start({ part: "B", aWorkoutId: a.id, redoA });
  }
  if (latest === undefined) return null;
  // The Assessment is a snapshot, so it stands even once its Workouts are deleted from History
  // The deload week offers a retake, which keeps the Block's progress; ignored, the next Block starts as usual
  if (latest && weekOfBlock(latest, now, timeZone)?.deload && canAssess(tests)) {
    return { kind: "retake", deloadWeek: mondayOf(now, timeZone), untested: partTests(tests, "A").untested };
  }
  if (latest) return { kind: "results", assessmentId: latest.id };
  if (!a) return start({ part: "A" });
  // B is done but its Assessment hasn't been worked out yet
  return null;
}

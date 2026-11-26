import type { AssessmentMarker } from "@fit/shared";
import { describe, expect, it } from "vitest";
import {
  assessmentOffer,
  completesAssessment,
  offerKey,
  pendingAssessment,
  type AssessmentOfferInput,
} from "./assessment-offer";
import { chooseTests } from "./assessment-tests";

const loggedAt = "2026-10-20T09:10:00.000Z";
// Its plank was held, unless it measured nothing: a squat short of RPE 9
const workout = (id: string, day: string, assessment?: AssessmentMarker, isPending = false, measured = true) => ({
  id,
  startedAt: `2026-10-${day}T09:00:00.000Z`,
  isPending,
  workoutExercises: [
    measured
      ? { slug: "plank", loadType: "timed" as const, sets: [{ kind: "timed" as const, seconds: 60, loggedAt }] }
      : {
          slug: "goblet-squat",
          loadType: "external" as const,
          sets: [{ kind: "external" as const, kg: 10, reps: 5, rpe: 7, loggedAt }],
        },
  ],
  ...(assessment && { assessment }),
});
const NO_TESTS = { squat: null, push: null, hinge: null, pull: null, core: null };
// The latest Assessment, from a Workout started on this day
const assessment = (id: string, day: string) => ({ id, lastStartedAt: `2026-10-${day}T08:00:00.000Z` });
// Today's offer on 23 October with History loaded, a test for every Pattern, and nothing dismissed unless a test says so
const offer = (
  workouts: AssessmentOfferInput["workouts"],
  latestAssessment: AssessmentOfferInput["latestAssessment"],
  more?: Partial<AssessmentOfferInput>,
) =>
  assessmentOffer({
    workouts,
    historyLoaded: true,
    latestAssessment,
    now: new Date("2026-10-23T09:00:00Z"),
    tests: chooseTests({ tags: ["dumbbells"], loads: {} }, []),
    dismissed: null,
    timeZone: "UTC",
    ...more,
  });

describe("assessmentOffer", () => {
  it("offers the Assessment to a user who hasn't done one", () => {
    expect(offer([workout("w1", "20")], null)).toEqual({ kind: "start", untested: [] });
  });

  it("offers it to a user with no Workouts at all", () => {
    expect(offer([], null)).toEqual({ kind: "start", untested: [] });
  });

  // Story 10
  it("offers it to a user who did an A with no B, or a B with no A before it", () => {
    expect(offer([workout("w2", "21"), workout("a1", "20", "A")], null)).toMatchObject({ kind: "start" });
    expect(offer([workout("a1", "20", "A"), workout("b1", "19", "B")], null)).toMatchObject({ kind: "start" });
  });

  it("offers it while that A is still on the phone, as A alone gives no Results", () => {
    expect(offer([workout("a1", "20", "A", true)], null)).toMatchObject({ kind: "start" });
  });

  // Story 9
  it("links to the Results of an Assessment made from an A and B, even with a newer A alone", () => {
    const workouts = [workout("b1", "12", "B"), workout("a1", "10", "A")];
    expect(offer(workouts, assessment("x1", "12"))).toEqual({ kind: "results", assessmentId: "x1" });
    expect(offer([workout("a2", "15", "A"), ...workouts], assessment("x1", "12"))).toMatchObject({ kind: "results" });
  });

  it("names the Patterns it can't test, which the Assessment estimates", () => {
    // Every push on the list, push-up included, is flagged for a wrist injury
    const tests = chooseTests({ tags: ["table"], loads: {} }, ["wrist"]);
    expect(offer([], null, { tests })).toEqual({ kind: "start", untested: ["push"] });
  });

  it("is unavailable only when no Pattern has a test", () => {
    const { core } = chooseTests({ tags: [], loads: {} }, []);
    expect(offer([], null, { tests: { ...NO_TESTS, core } })).toEqual({
      kind: "start",
      untested: ["squat", "push", "hinge", "pull"],
    });
    expect(offer([], null, { tests: NO_TESTS })).toEqual({ kind: "unavailable" });
  });

  it("still links to the Results when the Assessment is no longer available", () => {
    expect(offer([workout("s1", "22", "single")], assessment("x1", "22"), { tests: NO_TESTS })).toEqual({
      kind: "results",
      assessmentId: "x1",
    });
  });

  it("says the Results come once synced while a finished one is Pending, an old B included", () => {
    expect(offer([workout("s1", "22", "single", true)], null)).toEqual({ kind: "syncing", workoutId: "s1" });
    const pair = [workout("b1", "22", "B", true), workout("a1", "20", "A")];
    expect(offer(pair, null)).toEqual({ kind: "syncing", workoutId: "b1" });
  });

  it("says so while a retake is Pending too", () => {
    const workouts = [workout("s2", "22", "single", true), workout("s1", "12", "single")];
    expect(offer(workouts, assessment("x1", "12"))).toEqual({ kind: "syncing", workoutId: "s2" });
  });

  it("offers nothing while a synced one's Assessment hasn't reached the phone", () => {
    expect(offer([workout("s1", "22", "single")], null)).toBeNull();
    expect(offer([workout("b1", "22", "B"), workout("a1", "20", "A")], null)).toBeNull();
  });

  // Spec #176 story 7
  it("offers it again after one that measured nothing, synced or still Pending", () => {
    expect(offer([workout("s1", "22", "single", false, false)], null)).toMatchObject({ kind: "start" });
    expect(offer([workout("s1", "22", "single", true, false)], null)).toMatchObject({ kind: "start" });
  });

  it("offers it again after an old A and B that measured nothing between them", () => {
    const pair = (aMeasured: boolean, isPending: boolean) => [
      workout("b1", "22", "B", isPending, false),
      workout("a1", "20", "A", false, aMeasured),
    ];
    expect(offer(pair(false, false), null)).toMatchObject({ kind: "start" });
    expect(offer(pair(false, true), null)).toMatchObject({ kind: "start" });
    expect(offer(pair(true, false), null)).toBeNull();
    expect(offer(pair(true, true), null)).toMatchObject({ kind: "syncing" });
  });

  it("keeps linking to the Results after a retake that measured nothing", () => {
    const workouts = [workout("s2", "22", "single", true, false), workout("s1", "12", "single")];
    expect(offer(workouts, assessment("x1", "12"))).toMatchObject({ kind: "results" });
  });

  it("says a measured one is syncing under a newer one that measured nothing", () => {
    const workouts = [workout("s2", "22", "single", true, false), workout("s1", "21", "single", true)];
    expect(offer(workouts, null)).toEqual({ kind: "syncing", workoutId: "s1" });
  });

  it("links to the Results once the Assessment is on the server", () => {
    expect(offer([workout("s1", "22", "single")], assessment("x1", "22"))).toEqual({
      kind: "results",
      assessmentId: "x1",
    });
  });

  it("keeps linking to the Results when the Assessment's Workouts were deleted from History", () => {
    expect(offer([workout("w1", "20")], assessment("x1", "12"))).toMatchObject({ kind: "results" });
  });

  it("offline, offers only what the Pending Workouts show", () => {
    const offline = { historyLoaded: false };
    expect(offer([workout("s1", "22", "single", true)], undefined, offline)).toMatchObject({ kind: "syncing" });
    expect(offer([workout("b1", "22", "B", true)], undefined, offline)).toMatchObject({ kind: "syncing" });
    // With History unknown, an Assessment may well be on the server already
    expect(offer([workout("w1", "22", undefined, true)], undefined, offline)).toBeNull();
    expect(offer([workout("a1", "20", "A", true)], undefined, offline)).toBeNull();
  });

  it("ignores the latest Assessment until History has loaded too", () => {
    expect(offer([], assessment("x1", "12"), { historyLoaded: false })).toBeNull();
  });

  it("hides a dismissed offer until a different one comes along", () => {
    const dismissed = offerKey(offer([], null)!);
    expect(offer([], null, { dismissed })).toBeNull();
    expect(offer([workout("s1", "22", "single", true)], null, { dismissed })).toMatchObject({ kind: "syncing" });
  });
});

// Stories 69, 70: the Block started by an Assessment on Monday 12 October has its deload week, the 5th, from
// Monday 9 November
describe("assessmentOffer: the retake in the deload week (#137)", () => {
  const workouts = [workout("s1", "12", "single")];
  const on = (date: string, more?: Partial<AssessmentOfferInput>) =>
    offer(workouts, assessment("x1", "12"), { now: new Date(`${date}T09:00:00Z`), ...more });

  // Story 69
  it("offers to retake the Assessment in the deload week", () => {
    expect(on("2026-11-09")).toMatchObject({ kind: "retake", deloadWeek: "2026-11-09", untested: [] });
    expect(on("2026-11-15")).toMatchObject({ kind: "retake" });
  });

  it("links to the Results in the Block's other weeks", () => {
    expect(on("2026-11-08")).toMatchObject({ kind: "results" });
  });

  // Story 70
  it("goes once the deload week ends, the next Block starting as usual", () => {
    expect(on("2026-11-16")).toMatchObject({ kind: "results" });
  });

  it("comes back in the next deload week once dismissed", () => {
    const dismissed = offerKey(on("2026-11-10")!);
    expect(on("2026-11-11", { dismissed })).toBeNull();
    expect(on("2026-12-14", { dismissed })).toMatchObject({ kind: "retake", deloadWeek: "2026-12-14" });
  });

  it("follows the user's timezone for the deload week", () => {
    // 05:00 on Monday 9 November in UTC is still Sunday in Los Angeles
    const sunday = { now: new Date("2026-11-09T05:00:00Z"), timeZone: "America/Los_Angeles" };
    expect(offer(workouts, assessment("x1", "12"), sunday)).toMatchObject({ kind: "results" });
  });

  it("links to the Results when no test suits the user any longer", () => {
    expect(on("2026-11-10", { tests: NO_TESTS })).toMatchObject({ kind: "results" });
  });
});

describe("pendingAssessment", () => {
  it("is the newest single Assessment Workout or B while it's on the phone", () => {
    expect(pendingAssessment([workout("s1", "22", "single", true), workout("a1", "20", "A")])?.id).toBe("s1");
    expect(pendingAssessment([workout("b1", "22", "B", true), workout("a1", "20", "A")])?.id).toBe("b1");
  });

  it("is none for an A alone, or once it has synced", () => {
    expect(pendingAssessment([workout("a1", "20", "A", true)])).toBeUndefined();
    expect(pendingAssessment([workout("s1", "22", "single")])).toBeUndefined();
  });
});

describe("completesAssessment", () => {
  const startedAt = "2026-11-09T10:00:00.000Z";
  const plank = (...seconds: number[]) => [
    {
      slug: "plank",
      loadType: "timed" as const,
      sets: seconds.map((each) => ({ kind: "timed" as const, seconds: each, loggedAt: "2026-11-09T10:00:00.000Z" })),
    },
  ];

  it("is a single one that measured a test", () => {
    expect(completesAssessment({ startedAt, assessment: "single", workoutExercises: plank(60) })).toBe(true);
    expect(completesAssessment({ startedAt, assessment: "single", workoutExercises: plank() })).toBe(false);
  });

  it("is an old B, whose A may have the result, and not an A", () => {
    expect(completesAssessment({ startedAt, assessment: "B", workoutExercises: plank() })).toBe(true);
    expect(completesAssessment({ startedAt, assessment: "A", workoutExercises: plank(60) })).toBe(false);
  });

  it("isn't any other Workout", () => {
    expect(completesAssessment({ startedAt, workoutExercises: plank(60) })).toBe(false);
  });
});

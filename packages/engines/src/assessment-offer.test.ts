import { describe, expect, it } from "vitest";
import { assessmentOffer, offerKey, pendingB, type AssessmentOfferInput } from "./assessment-offer";
import { chooseTests } from "./assessment-tests";

const workout = (id: string, day: string, assessment?: "A" | "B", isPending = false) => ({
  id,
  startedAt: `2026-10-${day}T09:00:00.000Z`,
  isPending,
  ...(assessment && { assessment }),
});
// The latest Assessment, from a B started on this day
const assessment = (id: string, day: string) => ({ id, bStartedAt: `2026-10-${day}T08:00:00.000Z` });
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
    tests: chooseTests({ tags: ["dumbbells"] }, []),
    dismissed: null,
    timeZone: "UTC",
    ...more,
  });

describe("assessmentOffer", () => {
  it("offers A to a user who hasn't done one", () => {
    expect(offer([workout("w1", "20")], null)).toEqual({ kind: "start", part: "A", untested: [] });
  });

  it("offers A to a user with no Workouts at all", () => {
    expect(offer([], null)).toEqual({ kind: "start", part: "A", untested: [] });
  });

  it("offers B once A is done, until a B follows it", () => {
    const workouts = [workout("w2", "21"), workout("a1", "20", "A")];
    expect(offer(workouts, null)).toEqual({ kind: "start", part: "B", aWorkoutId: "a1", redoA: false, untested: [] });
  });

  it("doesn't count a B from before the latest A", () => {
    const workouts = [workout("a2", "22", "A"), workout("b1", "21", "B"), workout("a1", "20", "A")];
    expect(offer(workouts, assessment("x1", "21"))).toMatchObject({ kind: "start", part: "B", aWorkoutId: "a2" });
  });

  it("also offers to redo A when it's more than 14 days old with no B after it", () => {
    const workouts = [workout("a1", "01", "A")];
    expect(offer(workouts, null, { now: new Date("2026-10-16T09:00:00Z") })).toMatchObject({
      kind: "start",
      part: "B",
      redoA: true,
    });
  });

  it("names the Patterns it can't test, which the Assessment estimates", () => {
    // Every push on the list, push-up included, is flagged for a wrist injury
    const tests = chooseTests({ tags: ["table"] }, ["wrist"]);
    expect(offer([], null, { tests })).toMatchObject({ part: "A", untested: [] });
    expect(offer([workout("a1", "20", "A")], null, { tests })).toMatchObject({ part: "B", untested: ["push"] });
  });

  it("says the Assessment is unavailable when A or B has no test at all", () => {
    const tests = { ...chooseTests({ tags: [] }, []), push: null, pull: null };
    expect(offer([], null, { tests })).toEqual({ kind: "unavailable" });
    expect(offer([workout("a1", "20", "A")], null, { tests })).toEqual({ kind: "unavailable" });
  });

  it("still links to the Results when the Assessment is no longer available", () => {
    const tests = { ...chooseTests({ tags: [] }, []), squat: null, hinge: null, core: null };
    const workouts = [workout("b1", "22", "B"), workout("a1", "20", "A")];
    expect(offer(workouts, assessment("x1", "22"), { tests })).toEqual({ kind: "results", assessmentId: "x1" });
  });

  it("says the Results come once synced while B is Pending", () => {
    const workouts = [workout("b1", "22", "B", true), workout("a1", "20", "A")];
    expect(offer(workouts, null)).toEqual({ kind: "syncing", bWorkoutId: "b1" });
  });

  it("links to the Results once the Assessment is on the server", () => {
    const workouts = [workout("b1", "22", "B"), workout("a1", "20", "A")];
    expect(offer(workouts, assessment("x1", "22"))).toEqual({ kind: "results", assessmentId: "x1" });
  });

  it("keeps linking to the Results when the Assessment's Workouts were deleted from History", () => {
    // a0 is from an earlier Assessment; the latest one's A and B are gone from History
    const workouts = [workout("w1", "20"), workout("a0", "01", "A")];
    expect(offer(workouts, assessment("x1", "12"))).toMatchObject({ kind: "results" });
  });

  it("offers B for a retake: an A newer than the latest Assessment", () => {
    const workouts = [workout("a2", "22", "A"), workout("b1", "12", "B"), workout("a1", "10", "A")];
    expect(offer(workouts, assessment("x1", "12"))).toMatchObject({ kind: "start", part: "B", aWorkoutId: "a2" });
  });

  it("offers B for a retake started after the latest Assessment's B, though that Assessment was worked out later", () => {
    // a1 and b1 synced on the 22nd, after a2 was started offline
    const workouts = [workout("a2", "15", "A"), workout("b1", "12", "B"), workout("a1", "10", "A")];
    const latest = { ...assessment("x1", "12"), createdAt: "2026-10-22T10:00:00.000Z" };
    expect(offer(workouts, latest)).toMatchObject({ kind: "start", part: "B", aWorkoutId: "a2" });
  });

  it("offline, offers only what the Pending Workouts show", () => {
    const offline = { historyLoaded: false };
    expect(offer([workout("a1", "20", "A", true)], undefined, offline)).toMatchObject({ kind: "start", part: "B" });
    expect(offer([workout("b1", "22", "B", true)], undefined, offline)).toMatchObject({ kind: "syncing" });
    // With History unknown, an A may well be on the server already
    expect(offer([workout("w1", "22", undefined, true)], undefined, offline)).toBeNull();
  });

  it("ignores the latest Assessment until History has loaded too", () => {
    const pendingA = [workout("a2", "22", "A", true)];
    expect(offer(pendingA, assessment("x1", "12"), { historyLoaded: false })).toMatchObject({ kind: "start" });
    expect(offer([], assessment("x1", "12"), { historyLoaded: false })).toBeNull();
  });

  it("hides a dismissed offer until a different one comes along", () => {
    const workouts = [workout("a1", "20", "A")];
    const dismissed = offerKey(offer(workouts, null)!);
    expect(offer(workouts, null, { dismissed })).toBeNull();

    const withB = [workout("b1", "22", "B", true), ...workouts];
    expect(offer(withB, null, { dismissed })).toMatchObject({ kind: "syncing" });
  });

  it("brings a dismissed B offer back once A goes stale", () => {
    const workouts = [workout("a1", "01", "A")];
    const dismissed = offerKey(offer(workouts, null, { now: new Date("2026-10-10T09:00:00Z") })!);
    expect(offer(workouts, null, { now: new Date("2026-10-16T09:00:00Z"), dismissed })).toMatchObject({ redoA: true });
  });
});

// Stories 69, 70: the Block started by an Assessment whose B was on Monday 12 October has its deload week, the 5th, from
// Monday 9 November
describe("assessmentOffer: the retake in the deload week (#137)", () => {
  const workouts = [workout("b1", "12", "B"), workout("a1", "10", "A")];
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

  it("offers B once the retake's A is done", () => {
    const withA = [{ ...workout("a2", "12", "A"), startedAt: "2026-11-10T09:00:00.000Z" }, ...workouts];
    const retaking = offer(withA, assessment("x1", "12"), { now: new Date("2026-11-11T09:00:00Z") });
    expect(retaking).toMatchObject({ kind: "start", part: "B", aWorkoutId: "a2" });
  });

  it("follows the user's timezone for the deload week", () => {
    // 05:00 on Monday 9 November in UTC is still Sunday in Los Angeles
    const sunday = { now: new Date("2026-11-09T05:00:00Z"), timeZone: "America/Los_Angeles" };
    expect(offer(workouts, assessment("x1", "12"), sunday)).toMatchObject({ kind: "results" });
  });

  it("links to the Results when no test suits the user any longer", () => {
    const tests = { ...chooseTests({ tags: [] }, []), squat: null, hinge: null, core: null };
    expect(on("2026-11-10", { tests })).toMatchObject({ kind: "results" });
  });
});

describe("pendingB", () => {
  it("is the newest B while it's on the phone", () => {
    expect(pendingB([workout("b1", "22", "B", true), workout("a1", "20", "A")])?.id).toBe("b1");
  });

  it("is none once B has synced, or when a newer A awaits its own B", () => {
    expect(pendingB([workout("b1", "22", "B"), workout("a1", "20", "A")])).toBeUndefined();
    expect(pendingB([workout("a2", "23", "A"), workout("b1", "22", "B", true)])).toBeUndefined();
  });
});

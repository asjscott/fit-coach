import { describe, expect, it } from "vitest";
import { assessmentOffer, todayState, todayStatus } from "./today-status";

describe("todayStatus", () => {
  it("numbers the next Workout against days per week", () => {
    expect(todayStatus({ state: "loaded", workoutCount: 2, target: 4 })).toBe("Workout 3 of 4 this week");
  });

  it("says when the week's target is already met", () => {
    expect(todayStatus({ state: "loaded", workoutCount: 4, target: 4 })).toBe("Workout 5 this week · 4 of 4 done");
  });

  it("numbers the next Workout without a target", () => {
    expect(todayStatus({ state: "loaded", workoutCount: 1, target: undefined })).toBe("Workout 2 this week");
  });

  it("welcomes a first Workout", () => {
    expect(todayStatus({ state: "first-run", workoutCount: 0, target: 4 })).toBe(
      "Your first Workout. Add Exercises as you go.",
    );
  });

  it("doesn't number the Workout offline, when it can't know this week's count", () => {
    expect(todayStatus({ state: "offline", workoutCount: 1, target: 4 })).toBe(
      "No connection. Workouts save on this phone until there is.",
    );
  });

  it("says nothing while History loads", () => {
    expect(todayStatus({ state: "loading", workoutCount: 0, target: 4 })).toBeNull();
  });
});

describe("assessmentOffer", () => {
  const workout = (id: string, day: string, assessment?: "A" | "B", isPending = false) => ({
    id,
    startedAt: `2026-10-${day}T09:00:00.000Z`,
    isPending,
    ...(assessment && { assessment }),
  });
  const assessment = (id: string, day: string) => ({ id, createdAt: `2026-10-${day}T10:00:00.000Z` });
  type Input = Parameters<typeof assessmentOffer>[0];
  // Today's offer on 23 October, with nothing dismissed unless a test says so
  const offer = (workouts: Input["workouts"], latestAssessment: Input["latestAssessment"], more?: Partial<Input>) =>
    assessmentOffer({ workouts, latestAssessment, now: new Date("2026-10-23T09:00:00Z"), dismissed: null, ...more });

  it("offers A to a user who hasn't done one", () => {
    expect(offer([workout("w1", "20")], null)).toMatchObject({ kind: "start", part: "A" });
  });

  it("offers A to a user with no Workouts at all", () => {
    expect(offer([], null)).toMatchObject({ kind: "start", part: "A" });
  });

  it("offers B once A is done, until a B follows it", () => {
    const workouts = [workout("w2", "21"), workout("a1", "20", "A")];
    expect(offer(workouts, null)).toMatchObject({ kind: "start", part: "B", redoA: false });
  });

  it("doesn't count a B from before the latest A", () => {
    const workouts = [workout("a2", "22", "A"), workout("b1", "21", "B"), workout("a1", "20", "A")];
    expect(offer(workouts, assessment("x1", "21"))).toMatchObject({ kind: "start", part: "B", redoA: false });
  });

  it("also offers to redo A when it's more than 14 days old with no B after it", () => {
    const workouts = [workout("a1", "01", "A")];
    expect(offer(workouts, null, { now: new Date("2026-10-16T09:00:00Z") })).toMatchObject({
      kind: "start",
      part: "B",
      redoA: true,
    });
  });

  it("says the Results come once synced while B is Pending", () => {
    const workouts = [workout("b1", "22", "B", true), workout("a1", "20", "A")];
    expect(offer(workouts, null)).toMatchObject({ kind: "syncing" });
  });

  it("links to the Results once the Assessment is on the server", () => {
    const workouts = [workout("b1", "22", "B"), workout("a1", "20", "A")];
    expect(offer(workouts, assessment("x1", "22"))).toMatchObject({ kind: "results" });
  });

  it("keeps linking to the Results when the Assessment's Workouts were deleted from History", () => {
    // a0 is from an earlier Assessment; the latest one's A and B are gone from History
    const workouts = [workout("w1", "20"), workout("a0", "01", "A")];
    expect(offer(workouts, assessment("x1", "12"))).toMatchObject({ kind: "results" });
  });

  it("offers B for a retake: an A newer than the latest Assessment", () => {
    const workouts = [workout("a2", "22", "A"), workout("b1", "12", "B"), workout("a1", "10", "A")];
    expect(offer(workouts, assessment("x1", "12"))).toMatchObject({ kind: "start", part: "B", redoA: false });
  });

  it("offline, offers only what the Pending Workouts show", () => {
    expect(offer([workout("a1", "20", "A", true)], undefined)).toMatchObject({ kind: "start", part: "B" });
    expect(offer([workout("b1", "22", "B", true)], undefined)).toMatchObject({ kind: "syncing" });
    // With History unknown, an A may well be on the server already
    expect(offer([workout("w1", "22", undefined, true)], undefined)).toBeNull();
  });

  it("hides a dismissed offer until a different one comes along", () => {
    const workouts = [workout("a1", "20", "A")];
    const { key } = offer(workouts, null)!;
    expect(offer(workouts, null, { dismissed: key })).toBeNull();

    const withB = [workout("b1", "22", "B", true), ...workouts];
    expect(offer(withB, null, { dismissed: key })).toMatchObject({ kind: "syncing" });
  });
});

describe("todayState", () => {
  it("is loading until History arrives", () => {
    expect(todayState({ historyLoaded: false, failed: false, workoutCount: 0 })).toBe("loading");
  });

  it("is offline when History couldn't load", () => {
    expect(todayState({ historyLoaded: false, failed: true, workoutCount: 1 })).toBe("offline");
  });

  it("is a first run when there are no Workouts at all", () => {
    expect(todayState({ historyLoaded: true, failed: false, workoutCount: 0 })).toBe("first-run");
  });

  it("is loaded once History arrives with Workouts, Pending ones included", () => {
    expect(todayState({ historyLoaded: true, failed: false, workoutCount: 1 })).toBe("loaded");
  });
});

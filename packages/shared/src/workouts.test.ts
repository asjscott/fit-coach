import { describe, expect, it } from "vitest";
import { Workout, WorkoutsQuery } from "./workouts";

const loggedAt = "2026-10-24T09:10:00.000Z";

const workout = (workoutExercises: unknown[], times = { startedAt: "2026-10-24T09:00:00.000Z", endedAt: "2026-10-24T10:00:00.000Z" }) => ({
  id: "3b241101-e2bb-4255-8caf-4136c566a962",
  ...times,
  workoutExercises,
});

const gobletSquat = {
  slug: "goblet-squat",
  loadType: "external",
  sets: [{ kind: "external", kg: 22.5, reps: 10, loggedAt }],
};

describe("Workout", () => {
  it.each([
    ["external", gobletSquat],
    ["bodyweight", { slug: "push-up", loadType: "bodyweight", sets: [{ kind: "bodyweight", reps: 12, loggedAt }] }],
    ["timed", { slug: "plank", loadType: "timed", sets: [{ kind: "timed", seconds: 45, loggedAt }] }],
  ])("parses a Workout with a %s Set", (_loadType, workoutExercise) => {
    expect(Workout.safeParse(workout([workoutExercise])).success).toBe(true);
  });

  it("accepts a well-formed slug the library doesn't know", () => {
    expect(Workout.safeParse(workout([{ ...gobletSquat, slug: "added-in-a-later-version" }])).success).toBe(true);
  });

  it("rejects a Set whose kind doesn't match its Workout Exercise's Load Type", () => {
    const mismatched = { ...gobletSquat, sets: [{ kind: "bodyweight", reps: 10, loggedAt }] };
    expect(Workout.safeParse(workout([mismatched])).success).toBe(false);
  });

  it("rejects a Workout Exercise with no Sets", () => {
    expect(Workout.safeParse(workout([{ ...gobletSquat, sets: [] }])).success).toBe(false);
  });

  it("rejects a Workout with no Workout Exercises", () => {
    expect(Workout.safeParse(workout([])).success).toBe(false);
  });

  it("rejects an end before the start", () => {
    const backwards = { startedAt: "2026-10-24T10:00:00.000Z", endedAt: "2026-10-24T09:00:00.000Z" };
    expect(Workout.safeParse(workout([gobletSquat], backwards)).success).toBe(false);
  });

  it("rejects a weight that isn't in 0.25 kg steps", () => {
    const awkward = { ...gobletSquat, sets: [{ kind: "external", kg: 22.3, reps: 10, loggedAt }] };
    expect(Workout.safeParse(workout([awkward])).success).toBe(false);
  });
});

describe("WorkoutsQuery", () => {
  it("defaults to the newest page of 20", () => {
    expect(WorkoutsQuery.parse({})).toEqual({ limit: 20 });
  });

  it("reads limit and before from query strings", () => {
    expect(WorkoutsQuery.parse({ limit: "5", before: "2026-10-24T09:00:00.000Z" })).toEqual({
      limit: 5,
      before: "2026-10-24T09:00:00.000Z",
    });
  });

  it.each([["0"], ["101"], ["2.5"], ["lots"]])("rejects a limit of %s", (limit) => {
    expect(WorkoutsQuery.safeParse({ limit }).success).toBe(false);
  });

  it("rejects a before cursor that isn't a datetime", () => {
    expect(WorkoutsQuery.safeParse({ before: "yesterday" }).success).toBe(false);
  });
});

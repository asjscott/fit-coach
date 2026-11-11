import { describe, expect, it } from "vitest";
import { InProgressWorkout, Workout, WorkoutsQuery } from "./workouts";

const loggedAt = "2026-10-24T09:10:00.000Z";

const workout = (
  workoutExercises: unknown[],
  times = { startedAt: "2026-10-24T09:00:00.000Z", endedAt: "2026-10-24T10:00:00.000Z" },
) => ({
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

  it("rejects a Workout Exercise carrying Previous Sets", () => {
    expect(Workout.safeParse(workout([{ ...gobletSquat, previousSets }])).success).toBe(false);
  });

  it("drops other fields it doesn't know from a Workout Exercise, as before", () => {
    const parsed = Workout.parse(workout([{ ...gobletSquat, note: "from a later version" }]));
    expect(parsed.workoutExercises[0]).toEqual(gobletSquat);
  });

  // User story 19: a load entered in pounds is stored as its exact kg, so 25 lb never comes back as 24.9
  it("keeps a weight entered in pounds as its exact kg", () => {
    const pounds = { ...gobletSquat, sets: [{ kind: "external", kg: 11.33980925, reps: 10, loggedAt }] };
    expect(Workout.parse(workout([pounds])).workoutExercises[0].sets[0]).toMatchObject({ kg: 11.33980925 });
  });

  it("keeps a Set's RPE", () => {
    const rated = { ...gobletSquat, sets: [{ kind: "external", kg: 22.5, reps: 5, rpe: 9, loggedAt }] };
    expect(Workout.parse(workout([rated])).workoutExercises[0].sets[0]).toMatchObject({ rpe: 9 });
  });

  it.each([[5], [11], [8.5]])("rejects an RPE of %s", (rpe) => {
    const rated = { ...gobletSquat, sets: [{ kind: "external", kg: 22.5, reps: 5, rpe, loggedAt }] };
    expect(Workout.safeParse(workout([rated])).success).toBe(false);
  });

  it("keeps which Assessment Workout it is", () => {
    expect(Workout.parse({ ...workout([gobletSquat]), assessment: "A" }).assessment).toBe("A");
  });

  it("keeps the Planned Workout it was started from", () => {
    const linked = { ...workout([gobletSquat]), plannedWorkoutId: "7c9e6679-7425-40de-944b-e07fc1f90ae7" };
    expect(Workout.parse(linked).plannedWorkoutId).toBe("7c9e6679-7425-40de-944b-e07fc1f90ae7");
  });

  it("doesn't need a Planned Workout", () => {
    expect(Workout.parse(workout([gobletSquat]))).not.toHaveProperty("plannedWorkoutId");
  });

  it("rejects a link that isn't an id", () => {
    expect(Workout.safeParse({ ...workout([gobletSquat]), plannedWorkoutId: "plan-1" }).success).toBe(false);
  });

  it("rejects an Assessment Workout other than A or B", () => {
    expect(Workout.safeParse({ ...workout([gobletSquat]), assessment: "C" }).success).toBe(false);
  });
});

const previousSets = {
  startedAt: "2026-10-20T09:00:00.000Z",
  endedAt: "2026-10-20T09:45:00.000Z",
  sets: [{ kind: "external", kg: 20, reps: 10, loggedAt: "2026-10-20T09:10:00.000Z" }],
};

describe("InProgressWorkout", () => {
  const inProgress = (workoutExercise: object) => ({
    id: "3b241101-e2bb-4255-8caf-4136c566a962",
    startedAt: "2026-10-24T09:00:00.000Z",
    workoutExercises: [{ id: "phone-id", ...workoutExercise }],
  });

  it("keeps the Planned Workout it started from", () => {
    const linked = {
      ...inProgress({ ...gobletSquat, sets: [] }),
      plannedWorkoutId: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    };
    expect(InProgressWorkout.parse(linked).plannedWorkoutId).toBe("7c9e6679-7425-40de-944b-e07fc1f90ae7");
  });

  it("keeps what the plan set for a Workout Exercise", () => {
    const planned = { sets: 3, target: { unit: "kg", kg: 22.5, reps: 8 } };
    const parsed = InProgressWorkout.parse(inProgress({ ...gobletSquat, sets: [], planned }));
    expect(parsed.workoutExercises[0].planned).toEqual(planned);
  });

  it("keeps Previous Sets saved with a Workout Exercise", () => {
    const parsed = InProgressWorkout.parse(inProgress({ ...gobletSquat, sets: [], previousSets }));
    expect(parsed.workoutExercises[0].previousSets).toEqual(previousSets);
  });

  it("accepts a Workout Exercise without Previous Sets", () => {
    expect(InProgressWorkout.safeParse(inProgress({ ...gobletSquat, sets: [] })).success).toBe(true);
  });

  it("keeps which Assessment Workout it is", () => {
    expect(InProgressWorkout.parse({ ...inProgress({ ...gobletSquat, sets: [] }), assessment: "B" }).assessment).toBe(
      "B",
    );
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

  it("reads the id of the last Workout received alongside before, to break start-time ties", () => {
    const query = { before: "2026-10-24T09:00:00.000Z", beforeId: "3b241101-e2bb-4255-8caf-4136c566a962" };
    expect(WorkoutsQuery.parse(query)).toEqual({ limit: 20, ...query });
  });

  it("rejects a beforeId without before", () => {
    expect(WorkoutsQuery.safeParse({ beforeId: "3b241101-e2bb-4255-8caf-4136c566a962" }).success).toBe(false);
  });

  it("rejects a beforeId that isn't a Workout id", () => {
    expect(WorkoutsQuery.safeParse({ before: "2026-10-24T09:00:00.000Z", beforeId: "nope" }).success).toBe(false);
  });
});

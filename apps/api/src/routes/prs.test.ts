import type { Workout } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { useRouteTestApi } from "../test/route-test-api";
import { assessmentPair, held, lifted, repsDone, workout } from "../test/workouts";

const api = useRouteTestApi();

// PRs (GLOSSARY.md), found when a Workout uploads: spec #119, user stories 72–80, ticket #130
describe("PRs at upload", () => {
  // Stories 72 and 76: the first Workout on an Exercise is a baseline; a higher Epley e1RM after it is a PR
  it("finds a PR when a weighted Exercise beats its best estimated one-rep maximum, after a baseline", async () => {
    const user = await api.signIn();

    const baseline = await user.post(
      "/workouts",
      workout(30, [{ slug: "goblet-squat", sets: [lifted(14, 10), lifted(14, 9)] }]),
    );
    expect(prsOf(baseline.body)).toEqual([]);

    const stronger = await user.post(
      "/workouts",
      workout(2, [{ slug: "goblet-squat", sets: [lifted(16, 10), lifted(16, 8)] }]),
    );
    expect(stronger.statusCode).toBe(201);
    expect(prsOf(stronger.body)).toEqual([
      {
        slug: "goblet-squat",
        measure: "e1rm",
        best: closeTo(16 * (1 + 10 / 30)),
        previous: closeTo(14 * (1 + 10 / 30)),
      },
    ]);
  });

  // Story 72: Epley is only fair to 12 reps, so a Set past that neither sets nor beats a best
  it("leaves Sets of more than 12 reps out of a weighted Exercise's PR", async () => {
    const user = await api.signIn();
    await user.post("/workouts", workout(30, [{ slug: "goblet-squat", sets: [lifted(14, 10)] }]));

    const manyReps = await user.post("/workouts", workout(2, [{ slug: "goblet-squat", sets: [lifted(16, 15)] }]));

    expect(prsOf(manyReps.body)).toEqual([]);
  });

  it("finds no PR when a Workout only matches its best", async () => {
    const user = await api.signIn();
    await user.post("/workouts", workout(30, [{ slug: "goblet-squat", sets: [lifted(14, 10)] }]));

    const same = await user.post(
      "/workouts",
      workout(2, [{ slug: "goblet-squat", sets: [lifted(14, 10), lifted(12, 10)] }]),
    );

    expect(prsOf(same.body)).toEqual([]);
  });

  // Story 74: on a weighted Ballistic Exercise, only the load counts, and only for 8 reps
  it("finds a weighted Ballistic Exercise's PR in the heaviest load for 8 reps", async () => {
    const user = await api.signIn();
    await user.post("/workouts", workout(50, [{ slug: "kettlebell-swing", sets: [lifted(16, 8), lifted(20, 6)] }]));

    const heavierFor6 = await user.post(
      "/workouts",
      workout(26, [{ slug: "kettlebell-swing", sets: [lifted(24, 6)] }]),
    );
    const heavierFor8 = await user.post("/workouts", workout(2, [{ slug: "kettlebell-swing", sets: [lifted(20, 8)] }]));

    expect(prsOf(heavierFor6.body)).toEqual([]);
    expect(prsOf(heavierFor8.body)).toEqual([{ slug: "kettlebell-swing", measure: "load", best: 20, previous: 16 }]);
  });

  // Story 73: a bodyweight or timed variant's PR is its most reps or seconds in a Set
  it("finds the most reps on a bodyweight variant and the most seconds on a timed one", async () => {
    const user = await api.signIn();
    await user.post(
      "/workouts",
      workout(30, [
        { slug: "push-up", sets: [repsDone(12), repsDone(10)] },
        { slug: "plank", sets: [held(45)] },
      ]),
    );

    const better = await user.post(
      "/workouts",
      workout(2, [
        { slug: "push-up", sets: [repsDone(14), repsDone(9)] },
        { slug: "plank", sets: [held(50)] },
      ]),
    );

    expect(prsOf(better.body)).toEqual([
      { slug: "push-up", measure: "reps", best: 14, previous: 12 },
      { slug: "plank", measure: "seconds", best: 50, previous: 45 },
    ]);
  });

  // Story 75: a carry's reps mean nothing, so it has no PRs however heavy
  it("finds no PRs on a carry", async () => {
    const user = await api.signIn();
    await user.post("/workouts", workout(30, [{ slug: "farmers-carry", sets: [lifted(16, 1)] }]));

    const heavier = await user.post("/workouts", workout(2, [{ slug: "farmers-carry", sets: [lifted(24, 1)] }]));

    expect(prsOf(heavier.body)).toEqual([]);
  });

  // Story 77: an Assessment's Sets count, both as the best to beat and as a PR
  it("counts Assessment Sets for PRs", async () => {
    const user = await api.signIn();
    const [a, b] = assessmentPair();
    await user.post("/workouts", a);
    // Goblet squat 14 kg × 5 in A; this B-day Workout isn't an Assessment Workout, so nothing pairs it
    const afterA = await user.post("/workouts", workout(40, [{ slug: "goblet-squat", sets: [lifted(16, 5)] }]));
    const uploadedB = await user.post("/workouts", b);
    const afterB = await user.post("/workouts", workout(2, [{ slug: "dumbbell-floor-press", sets: [lifted(14, 5)] }]));

    expect(prsOf(afterA.body)).toEqual([
      { slug: "goblet-squat", measure: "e1rm", best: closeTo(16 * (1 + 5 / 30)), previous: closeTo(14 * (1 + 5 / 30)) },
    ]);
    expect(prsOf(uploadedB.body)).toEqual([]);
    expect(prsOf(afterB.body)).toEqual([
      {
        slug: "dumbbell-floor-press",
        measure: "e1rm",
        best: closeTo(14 * (1 + 5 / 30)),
        previous: closeTo(12 * (1 + 5 / 30)),
      },
    ]);
  });

  // Story 80: a Pending Workout is retried until it uploads, and every retry answers with the PRs found the first time
  it("never finds the same PR twice when an upload is retried", async () => {
    const user = await api.signIn();
    await user.post("/workouts", workout(30, [{ slug: "goblet-squat", sets: [lifted(14, 10)] }]));
    const stronger = workout(2, [{ slug: "goblet-squat", sets: [lifted(16, 10)] }]);

    const first = await user.post("/workouts", stronger);
    const retry = await user.post("/workouts", stronger);

    expect(retry.statusCode).toBe(200);
    expect(prsOf(first.body)).toHaveLength(1);
    expect(prsOf(retry.body)).toEqual(prsOf(first.body));
    const history = (await user.get("/workouts")).body as Workout[];
    expect(history.flatMap((w) => w.prs ?? [])).toHaveLength(1);
  });

  // Stories 25 and 79: a Workout uploaded late, or logged for an earlier day, is measured against the Workouts before it,
  // and History shows its PRs
  it("measures a late upload against the Workouts that started before it, and shows its PRs in History", async () => {
    const user = await api.signIn();
    await user.post("/workouts", workout(70, [{ slug: "goblet-squat", sets: [lifted(12, 10)] }]));
    await user.post("/workouts", workout(2, [{ slug: "goblet-squat", sets: [lifted(18, 10)] }]));

    const late = workout(30, [{ slug: "goblet-squat", sets: [lifted(14, 10)] }]);
    const uploaded = await user.post("/workouts", late);

    const pr = {
      slug: "goblet-squat",
      measure: "e1rm",
      best: closeTo(14 * (1 + 10 / 30)),
      previous: closeTo(12 * (1 + 10 / 30)),
    };
    expect(prsOf(uploaded.body)).toEqual([pr]);
    const history = (await user.get("/workouts")).body as Workout[];
    expect(history.find((w) => w.id === late.id)?.prs).toEqual([pr]);
  });

  it("ignores PRs a phone sends with its upload", async () => {
    const user = await api.signIn();
    const claimed = { slug: "goblet-squat", measure: "e1rm" as const, best: 100, previous: 50 };

    const baseline = await user.post("/workouts", {
      ...workout(2, [{ slug: "goblet-squat", sets: [lifted(14, 10)] }]),
      prs: [claimed],
    });

    expect(prsOf(baseline.body)).toEqual([]);
  });
});

const prsOf = (body: unknown) => (body as Workout).prs;
const closeTo = (value: number) => expect.closeTo(value, 1);

import type { LatestAssessment, PlannedWorkout, Set, WorkingLevel, Workout } from "@fit/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type TestUser, useRouteTestApi } from "../test/route-test-api";
import { assessmentPair, hoursAgo, lifted, workout } from "../test/workouts";

const api = useRouteTestApi();

// The deload week and the retest (#137, ADR 0007). The user is the harness's dumbbells-at-home user (8–24 kg in 2 kg
// steps) in UTC. They're assessed on Tuesday 10 November 2026, so their Block starts on Monday 9 November and its 5th
// week, the deload week, is the week of Monday 7 December. Only the clock is faked, so uploads can be weeks apart
const ASSESSED = "2026-11-11T15:00:00Z";
const WEEK_2 = "2026-11-18T15:00:00Z";
const DELOAD_WEEK = "2026-12-09T15:00:00Z";
const NEXT_BLOCK = "2026-12-16T15:00:00Z";

const setClock = (iso: string) => vi.setSystemTime(new Date(iso));

afterEach(() => {
  vi.useRealTimers();
});

describe("the deload week (#137)", () => {
  // Stories 64, 67, 70
  it("prescribes lighter Sets, moves nothing, and leaves the next Block to progress as usual", async () => {
    const user = await assessedUser();
    const slug = "one-arm-dumbbell-row";
    const before = (await workingLevels(user)).get(slug);
    expect(before).toMatchObject({ kg: 14, reps: 8 });

    setClock(DELOAD_WEEK);
    // 14 kg less 10% is 12.6 kg, rounded down to the 12 kg dumbbells, for the same 8 reps
    expect(await plannedExercise(user, slug)).toMatchObject({ target: { unit: "kg", kg: 12, reps: 8 } });
    await upload(user, at(3, [{ slug, sets: [lifted(14, 12), lifted(14, 12)] }]));
    expect((await workingLevels(user)).get(slug)).toEqual(before);

    // Retest ignored: the next Block starts the Monday after, and progresses as usual
    setClock(NEXT_BLOCK);
    expect(await plannedExercise(user, slug)).toMatchObject({ target: { unit: "kg", kg: 14, reps: 8 } });
    await upload(user, at(3, [{ slug, sets: [lifted(14, 8), lifted(14, 8)] }]));
    expect((await workingLevels(user)).get(slug)).toMatchObject({ kg: 14, reps: 9 });
  });

  // Story 68
  it("neither adds a Miss nor ends the run of Misses", async () => {
    const user = await assessedUser();
    setClock(WEEK_2);
    await upload(user, at(3, [{ slug: "goblet-squat", sets: [lifted(12, 5), lifted(12, 5)] }]));
    expect((await workingLevels(user)).get("goblet-squat")).toMatchObject({ misses: 1 });

    setClock(DELOAD_WEEK);
    await upload(user, at(30, [{ slug: "goblet-squat", sets: [lifted(10, 5), lifted(10, 5)] }]));
    await upload(user, at(3, [{ slug: "goblet-squat", sets: [lifted(10, 8), lifted(10, 8)] }]));
    expect((await workingLevels(user)).get("goblet-squat")).toMatchObject({ kg: 12, reps: 8, misses: 1 });
  });
});

describe("the retest (#137)", () => {
  // Story 71: the Exercises it tested, and those with no logged Sets in the last Block, take new Working Levels; the
  // Block's progress on every other Exercise stays
  it("replaces only the tested Exercises' levels and those of Exercises not done in the last Block", async () => {
    const user = await assessedUser();
    const first = await workingLevels(user);
    // Trained this Block and not tested: its progress stays. Not trained this Block and not tested: a new level
    const trained = "dumbbell-lateral-raise";
    const untrained = "dumbbell-curl";
    const trainedLevel = first.get(trained) as Extract<WorkingLevel, { unit: "kg" }>;
    expect(trainedLevel).toBeDefined();
    expect(first.get(untrained)).toBeDefined();

    setClock(WEEK_2);
    const atTarget = (level: Extract<WorkingLevel, { unit: "kg" }>) => [
      lifted(level.kg, level.reps),
      lifted(level.kg, level.reps),
    ];
    // The goblet squat is trained this Block too, but the retest tests it
    await upload(
      user,
      at(3, [
        { slug: "goblet-squat", sets: [lifted(12, 8), lifted(12, 8)] },
        { slug: trained, sets: atTarget(trainedLevel) },
      ]),
    );
    const progressed = (await workingLevels(user)).get(trained);
    expect(progressed).toMatchObject({ kg: trainedLevel.kg, reps: trainedLevel.reps + 1 });

    setClock(DELOAD_WEEK);
    const [a, b] = strongerAssessmentPair();
    await upload(user, a);
    await upload(user, b);

    const after = await workingLevels(user);
    // A goblet squat test of 18 kg × 5 at RPE 9 seeds a heavier level than the first Assessment's 12 kg × 8
    expect(after.get("goblet-squat")).toMatchObject({ unit: "kg", reps: 8, movedBy: { workoutId: b.id } });
    expect((after.get("goblet-squat") as { kg: number }).kg).toBeGreaterThan(12);
    expect(after.get(trained)).toEqual(progressed);
    expect(after.get(untrained)).not.toEqual(first.get(untrained));
    expect(after.get(untrained)).toMatchObject({ movedBy: { workoutId: b.id } });
  });

  // Story 69's retest, taken before any training: every level is new
  it("replaces every level when nothing was logged in the last Block", async () => {
    const user = await assessedUser();
    setClock(DELOAD_WEEK);
    const [a, b] = strongerAssessmentPair();
    await upload(user, a);
    await upload(user, b);

    const after = await workingLevels(user);
    expect([...after.values()].every((level) => level.movedBy?.workoutId === b.id)).toBe(true);
  });
});

// The dumbbells-at-home user, assessed on Tuesday 10 November
async function assessedUser() {
  vi.useFakeTimers({ toFake: ["Date"] });
  setClock(ASSESSED);
  const user = await api.signIn();
  const [a, b] = assessmentPair();
  await upload(user, a);
  await upload(user, b);
  return user;
}

// A retake, stronger on every test than assessmentPair: A yesterday and B a few hours ago
function strongerAssessmentPair(): [Workout, Workout] {
  const a = workout(
    30,
    [
      { slug: "goblet-squat", sets: [lifted(14, 5, 7), lifted(16, 5, 8), lifted(18, 5, 9)] },
      { slug: "dumbbell-romanian-deadlift", sets: [lifted(18, 5, 7), lifted(22, 5, 8), lifted(24, 5, 9)] },
      { slug: "plank", sets: [{ kind: "timed", seconds: 120, loggedAt: hoursAgo(29.5) }] },
    ],
    { assessment: "A" },
  );
  const b = workout(
    6,
    [
      { slug: "dumbbell-floor-press", sets: [lifted(14, 5, 8), lifted(16, 5, 9)] },
      { slug: "one-arm-dumbbell-row", sets: [lifted(18, 5, 8), lifted(20, 5, 9)] },
    ],
    { assessment: "B" },
  );
  return [a, b];
}

// A Workout started this many hours ago, its Sets logged in its hour
function at(startedHoursAgo: number, exercises: { slug: string; sets: Set[] }[]): Workout {
  const finished = workout(startedHoursAgo, exercises);
  return {
    ...finished,
    workoutExercises: finished.workoutExercises.map((exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set) => ({ ...set, loggedAt: hoursAgo(startedHoursAgo - 0.5) })),
    })),
  };
}

async function upload(user: TestUser, finished: Workout) {
  const response = await user.post("/workouts", finished);
  expect(response.statusCode, JSON.stringify(response.body)).toBe(201);
}

async function workingLevels(user: TestUser) {
  const latest = (await user.get("/assessments/latest")).body as LatestAssessment;
  return new Map<string, WorkingLevel>(latest!.workingLevels.map((level) => [level.slug, level]));
}

async function plannedExercise(user: TestUser, slug: string) {
  const plan = (await user.post("/planned-workouts/current")).body as PlannedWorkout;
  return plan.plannedExercises.find((exercise) => exercise.slug === slug);
}

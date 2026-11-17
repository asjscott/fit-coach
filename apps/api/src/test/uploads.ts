// Uploading Workouts and reading what they did to the plan, for route tests of progression at upload
import type { LatestAssessment, PlannedWorkout, Set, WorkingLevel, Workout } from "@fit/shared";
import { expect } from "vitest";
import type { RouteTestApi, TestUser } from "./route-test-api";
import { assessmentPair, hoursAgo, workout } from "./workouts";

// A user assessed two weeks ago, so that Workouts uploaded after it can be in an earlier week and rested by now
export async function assessedUser(api: RouteTestApi, options?: Parameters<RouteTestApi["signIn"]>[0]) {
  const user = await api.signIn(options);
  const [a, b] = assessmentPair();
  await upload(user, retimed(a, 340));
  await upload(user, retimed(b, 320));
  return user;
}

// A Workout started this many hours ago, its Sets logged in its hour
export function at(
  startedHoursAgo: number,
  exercises: { slug: string; sets: Set[] }[],
  extra: Partial<Pick<Workout, "assessment" | "plannedWorkoutId">> = {},
) {
  return retimed(workout(startedHoursAgo, exercises, extra), startedHoursAgo);
}

function retimed(finished: Workout, startedHoursAgo: number): Workout {
  return {
    ...finished,
    startedAt: hoursAgo(startedHoursAgo),
    endedAt: hoursAgo(startedHoursAgo - 1),
    workoutExercises: finished.workoutExercises.map((exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set) => ({ ...set, loggedAt: hoursAgo(startedHoursAgo - 0.5) })),
    })),
  };
}

export async function upload(user: TestUser, finished: Workout) {
  expect((await user.post("/workouts", finished)).statusCode).toBe(201);
}

export async function workingLevels(user: TestUser) {
  const latest = (await user.get("/assessments/latest")).body as LatestAssessment;
  return new Map<string, WorkingLevel>(latest!.workingLevels.map((level) => [level.slug, level]));
}

export async function currentPlan(user: TestUser) {
  return (await user.post("/planned-workouts/current")).body as PlannedWorkout;
}

export async function plannedExercise(user: TestUser, slug: string) {
  return (await currentPlan(user)).plannedExercises.find((exercise) => exercise.slug === slug);
}

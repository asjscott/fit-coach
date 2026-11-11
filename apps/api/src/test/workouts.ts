// Workouts for route tests to upload, timed back from now so they fall in the Coach's current plan
import { randomUUID } from "node:crypto";
import type { Set, Workout } from "@fit/shared";

const HOUR_MS = 60 * 60 * 1000;

export const hoursAgo = (hours: number) => new Date(Date.now() - hours * HOUR_MS).toISOString();

export const lifted = (kg: number, reps: number, rpe?: number): Set => ({
  kind: "external",
  kg,
  reps,
  ...(rpe && { rpe }),
  loggedAt: hoursAgo(1),
});
export const repsDone = (reps: number): Set => ({ kind: "bodyweight", reps, loggedAt: hoursAgo(1) });
export const held = (seconds: number): Set => ({ kind: "timed", seconds, loggedAt: hoursAgo(1) });

// A finished Workout that started this many hours ago and took an hour, with a new phone-generated id
export function workout(
  startedHoursAgo: number,
  workoutExercises: { slug: string; sets: Set[] }[],
  extra: Partial<Pick<Workout, "assessment" | "plannedWorkoutId">> = {},
): Workout {
  return {
    id: randomUUID(),
    startedAt: hoursAgo(startedHoursAgo),
    endedAt: hoursAgo(startedHoursAgo - 1),
    ...extra,
    workoutExercises: workoutExercises.map(({ slug, sets }) => ({ slug, loadType: sets[0]!.kind, sets })),
  };
}

// A dumbbells-at-home user's pair of Assessment Workouts, A then B: each weighted test works up to RPE 9
export function assessmentPair(): [Workout, Workout] {
  const a = workout(
    50,
    [
      { slug: "goblet-squat", sets: [lifted(10, 5, 7), lifted(12, 5, 8), lifted(14, 5, 9)] },
      { slug: "dumbbell-romanian-deadlift", sets: [lifted(14, 5, 7), lifted(16, 5, 8), lifted(20, 5, 9)] },
      { slug: "plank", sets: [held(90)] },
    ],
    { assessment: "A" },
  );
  const b = workout(
    26,
    [
      { slug: "dumbbell-floor-press", sets: [lifted(10, 5, 8), lifted(12, 5, 9)] },
      { slug: "one-arm-dumbbell-row", sets: [lifted(14, 5, 8), lifted(16, 5, 9)] },
    ],
    { assessment: "B" },
  );
  return [a, b];
}

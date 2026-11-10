import type { Set as LoggedSet, PreviousSets } from "@fit/shared";
import { EXERCISES } from "./data/exercises";
import { isRecoveryWorkout, trainingWorkouts } from "./recovery-workout";

// Training summaries: pure functions that sum up Workouts for Today, History, the In-progress Workout and Finish.
// - One Workout: workoutVolume, setCount, summarizeWorkout
// - Previous Sets: previousSets
// - Weeks (Monday to Sunday, the phone's local time): weekStart, historyByWeek, weeklyVolume, weeklyVolumeStart,
//   thisWeek
// - Pending Workouts and History together: withPending, lastWorkout

// What Volume and Sets need from a Workout, so a finished, Pending or In-progress Workout all fit
export type WorkoutSets = { workoutExercises: readonly { slug: string; sets: readonly LoggedSet[] }[] };

// A finished (or Pending) Workout's Sets and times
export type FinishedWorkoutSets = WorkoutSets & { startedAt: string; endedAt: string };

// One-sided lives on the library Exercise, not the stored Workout; an unknown slug counts as two-sided
const oneSided = new Set(EXERCISES.filter((exercise) => exercise.unilateral).map((exercise) => exercise.slug));

// Volume (GLOSSARY.md) in kg
export function workoutVolume(workout: WorkoutSets): number {
  let volume = 0;
  for (const { slug, sets } of workout.workoutExercises) {
    const sides = oneSided.has(slug) ? 2 : 1;
    for (const set of sets) if (set.kind === "external") volume += set.kg * set.reps * sides;
  }
  return volume;
}

export const setCount = (workout: WorkoutSets) =>
  workout.workoutExercises.reduce((count, { sets }) => count + sets.length, 0);

// Exercises counts only Workout Exercises with Sets: finishing drops the others, so an In-progress Workout's
// summary matches what will be saved
export type WorkoutSummary = { exercises: number; volumeKg: number; sets: number; durationMs: number };

export function summarizeWorkout(workout: FinishedWorkoutSets): WorkoutSummary {
  return {
    exercises: workout.workoutExercises.filter(({ sets }) => sets.length > 0).length,
    volumeKg: workoutVolume(workout),
    sets: setCount(workout),
    durationMs: Date.parse(workout.endedAt) - Date.parse(workout.startedAt),
  };
}

// Midnight at the start of the Monday-to-Sunday week holding this moment, in the phone's local time.
// Built from the calendar date, so a daylight-saving change inside the week doesn't shift it
export function weekStart(date: Date): Date {
  const daysSinceMonday = (date.getDay() + 6) % 7;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - daysSinceMonday);
}

// The week start `weeks` weeks later (earlier when negative), by the calendar for the same reason
const addWeeks = (start: Date, weeks: number) =>
  new Date(start.getFullYear(), start.getMonth(), start.getDate() + weeks * 7);

// A week of History. Generic, so a caller's extra fields on each Workout (such as being Pending) come back
export type HistoryWeek<W extends FinishedWorkoutSets = FinishedWorkoutSets> = {
  // Monday at midnight, local time
  start: Date;
  // Newest first
  workouts: W[];
  // A Recovery Workout is listed but isn't training, so it's left out of the count
  workoutCount: number;
  volumeKg: number;
};

const newestFirst = <W extends { startedAt: string }>(workouts: readonly W[]) =>
  [...workouts].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));

// The weeks that have Workouts, newest first; weeks with none are left out
export function historyByWeek<W extends FinishedWorkoutSets>(workouts: readonly W[]): HistoryWeek<W>[] {
  const weeks: HistoryWeek<W>[] = [];
  for (const workout of newestFirst(workouts)) {
    const start = weekStart(new Date(workout.startedAt));
    let week = weeks[weeks.length - 1];
    if (week?.start.getTime() !== start.getTime()) {
      week = { start, workouts: [], workoutCount: 0, volumeKg: 0 };
      weeks.push(week);
    }
    week.workouts.push(workout);
    if (!isRecoveryWorkout(workout)) week.workoutCount += 1;
    week.volumeKg += workoutVolume(workout);
  }
  return weeks;
}

export const WEEKLY_VOLUME_WEEKS = 8;

// The start of the weekly Volume series' first week: History loaded back to here covers it
export const weeklyVolumeStart = (now: Date, weeks = WEEKLY_VOLUME_WEEKS) => addWeeks(weekStart(now), 1 - weeks);

export type WeekVolume = { start: Date; volumeKg: number };

// Volume for each of the last `weeks` weeks, oldest first and ending with this week; a week with no Workouts is 0
export function weeklyVolume(
  workouts: readonly FinishedWorkoutSets[],
  now: Date,
  weeks = WEEKLY_VOLUME_WEEKS,
): WeekVolume[] {
  const first = weeklyVolumeStart(now, weeks);
  const series = Array.from({ length: weeks }, (_, i) => ({ start: addWeeks(first, i), volumeKg: 0 }));
  const byStart = new Map(series.map((week) => [week.start.getTime(), week]));
  for (const workout of workouts) {
    const week = byStart.get(weekStart(new Date(workout.startedAt)).getTime());
    if (week) week.volumeKg += workoutVolume(workout);
  }
  return series;
}

// Previous Sets (GLOSSARY.md): the Sets of the later occurrence of exactly this Exercise in the most recent
// Workout that included it, or null when none did. A variant has its own slug, so it never matches
export function previousSets(workouts: readonly FinishedWorkoutSets[], slug: string): PreviousSets | null {
  let found: PreviousSets | null = null;
  for (const { startedAt, endedAt, workoutExercises } of workouts) {
    const latest = workoutExercises.filter((we) => we.slug === slug && we.sets.length > 0).at(-1);
    if (!latest || (found && Date.parse(found.startedAt) >= Date.parse(startedAt))) continue;
    found = { startedAt, endedAt, sets: [...latest.sets] };
  }
  return found;
}

export type TrainingDay = { date: Date; trained: boolean; isToday: boolean };

// This week (Monday to Sunday, local time) so far, against the user's days per week when they've set it. A Recovery
// Workout isn't training, so it's left out
export type ThisWeek = {
  // Monday at midnight, local time
  start: Date;
  workoutCount: number;
  target: number | undefined;
  // Monday to Sunday at local midnight: whether the user trained that day, and which day is today
  days: TrainingDay[];
  volumeKg: number;
  sets: number;
  durationMs: number;
};

export function thisWeek(workouts: readonly FinishedWorkoutSets[], now: Date, daysPerWeek?: number): ThisWeek {
  const start = weekStart(now);
  // By the calendar, so a daylight-saving change inside the week doesn't shift a day
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return { date, trained: false, isToday: date.getDate() === now.getDate() && date.getMonth() === now.getMonth() };
  });
  const week: ThisWeek = { start, workoutCount: 0, target: daysPerWeek, days, volumeKg: 0, sets: 0, durationMs: 0 };
  for (const workout of trainingWorkouts(workouts)) {
    const startedAt = new Date(workout.startedAt);
    if (weekStart(startedAt).getTime() !== start.getTime()) continue;
    const summary = summarizeWorkout(workout);
    days[(startedAt.getDay() + 6) % 7]!.trained = true;
    week.workoutCount += 1;
    week.volumeKg += summary.volumeKg;
    week.sets += summary.sets;
    week.durationMs += summary.durationMs;
  }
  return week;
}

// The Pending Workouts, marked, then the History loaded from the server (null while it isn't, such as offline).
// A Workout that uploaded while History was loading shows once, as Pending
export function withPending<W extends { id: string }>(
  pending: readonly W[],
  history: readonly W[] | null,
): (W & { isPending: boolean })[] {
  const pendingIds = new Set(pending.map((workout) => workout.id));
  return [
    ...pending.map((workout) => ({ ...workout, isPending: true })),
    ...(history ?? [])
      .filter((workout) => !pendingIds.has(workout.id))
      .map((workout) => ({ ...workout, isPending: false })),
  ];
}

// The Workout that started most recently, for Today's Last workout
export const lastWorkout = <W extends { startedAt: string }>(workouts: readonly W[]): W | undefined =>
  newestFirst(workouts)[0];

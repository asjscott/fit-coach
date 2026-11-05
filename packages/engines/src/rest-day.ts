import { thisWeek, type FinishedWorkoutSets } from "./training-summaries";

// Why the Coach recommends a Rest Day
export type RestDayReason = "days-per-week-reached" | "trained-today" | "trained-yesterday";

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// Whether today is a Rest Day, on the phone's local days like This Week, or null. Advice only. Pass the Workouts with
// the Pending ones; offline the rest are unknown, which can only miss a recommendation, never make a wrong one
export function restDay(
  workouts: readonly FinishedWorkoutSets[],
  now: Date,
  daysPerWeek?: number,
): RestDayReason | null {
  const { workoutCount } = thisWeek(workouts, now);
  if (daysPerWeek !== undefined && workoutCount >= daysPerWeek) return "days-per-week-reached";

  const finishedOn = (day: Date) => workouts.some(({ endedAt }) => sameDay(new Date(endedAt), day));
  if (finishedOn(now)) return "trained-today";

  if (daysPerWeek === undefined) return null;
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const daysAfterToday = 6 - ((now.getDay() + 6) % 7);
  // Today is the gap day, so the Workouts left must fit, one a day, into the days after it
  return finishedOn(yesterday) && daysPerWeek - workoutCount <= daysAfterToday ? "trained-yesterday" : null;
}

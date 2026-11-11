import { PAST_WORKOUT_DAYS } from "@fit/shared";
import { weekdayLabel } from "./format";

export type PastWorkoutDay = { label: string; start: Date };

// The earlier days a Manual Workout can be logged for (#129): the 6 before today, newest first, each starting at this
// time of day, so every start stays within the 7 days. Finish's Edit times sets the real times
export function pastWorkoutDays(now: Date): PastWorkoutDay[] {
  return Array.from({ length: PAST_WORKOUT_DAYS - 1 }, (_, i) => {
    const start = new Date(now);
    start.setDate(now.getDate() - (i + 1));
    return { label: i === 0 ? "Yesterday" : weekdayLabel(start), start };
  });
}

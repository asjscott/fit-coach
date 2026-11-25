import { localDateOf, loggableDates, mondayOfDate, weekdayOf } from "@fit/engines";
import { DEFAULT_WEIGH_IN_DAY, type WeighIn, type Weekday } from "@fit/shared";
import { weekdayLabel } from "../workouts/format";

// Whether Today asks for this week's Weigh-in (spec #158 stories 12 and 13): on the Weigh-in Day, until the week has
// one. Worked out from the latest Weigh-in's date rather than the user's weighedInThisWeek, since the phone's copy of
// the user can be from last week
export function showsWeighInReminder({
  weighInDay = DEFAULT_WEIGH_IN_DAY,
  latestWeighIn,
  now,
  timeZone,
}: {
  weighInDay: Weekday | undefined;
  latestWeighIn: WeighIn | null;
  now: Date;
  timeZone: string;
}) {
  const today = localDateOf(now, timeZone);
  if (weekdayOf(today) !== weighInDay) return false;
  return !latestWeighIn || mondayOfDate(latestWeighIn.date) !== mondayOfDate(today);
}

// A local date at noon on the phone, so formatting it shows its own calendar day wherever the phone is
export const onPhone = (date: string) => new Date(`${date}T12:00:00`);

// When a Weigh-in was taken, in the phone's language: "Mon 16 Nov"
export const weighInDateLabel = (date: string) =>
  onPhone(date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

export type WeighInDay = { date: string; label: string };

// The days a Weigh-in can be logged for, newest first: "Today", "Yesterday", then the weekday
export const weighInDays = (now: Date, timeZone: string): WeighInDay[] =>
  loggableDates(now, timeZone).map((date, i) => ({
    date,
    label: i === 0 ? "Today" : i === 1 ? "Yesterday" : weekdayLabel(onPhone(date)),
  }));

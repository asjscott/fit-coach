import { Weekday } from "@fit/shared";
import { localDateOf } from "./week-ledger";

// How many days a Weigh-in, a Food Entry or water can be logged for: today and the 6 days before it (spec #158)
export const LOGGABLE_DAYS = 7;

// A calendar date as noon UTC, so stepping by days on it is never shifted by daylight saving
const calendarDay = (date: string) => new Date(`${date}T12:00:00Z`);
const isoDate = (day: Date) => day.toISOString().slice(0, 10);

// The local dates the user can log for, today in their timezone first
export function loggableDates(now: Date, timeZone: string): string[] {
  const today = calendarDay(localDateOf(now, timeZone));
  return Array.from({ length: LOGGABLE_DAYS }, (_, i) => {
    const day = new Date(today);
    day.setUTCDate(today.getUTCDate() - i);
    return isoDate(day);
  });
}

// The calendar date before this one, as Copy from yesterday reads it
export function dayBefore(date: string): string {
  const day = calendarDay(date);
  day.setUTCDate(day.getUTCDate() - 1);
  return isoDate(day);
}

export const isLoggableDate = (date: string, now: Date, timeZone: string) =>
  loggableDates(now, timeZone).includes(date);

// The day of the week of a calendar date
export const weekdayOf = (date: string): Weekday => Weekday.options[(calendarDay(date).getUTCDay() + 6) % 7];

// The Monday of a calendar date's week, which runs Monday to Sunday as the Week Ledger's does
export function mondayOfDate(date: string): string {
  const day = calendarDay(date);
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return isoDate(day);
}

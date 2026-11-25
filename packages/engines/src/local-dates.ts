import { Weekday } from "@fit/shared";
import { localDateOf } from "./week-ledger";

// How many days a Weigh-in, a Food Entry or water can be logged for: today and the 6 days before it (spec #158)
export const LOGGABLE_DAYS = 7;

// A calendar date as noon UTC, so stepping by days on it is never shifted by daylight saving
const calendarDay = (date: string) => new Date(`${date}T12:00:00Z`);

function daysFrom(date: string, days: number): string {
  const day = calendarDay(date);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}

// The local dates the user can log for, today in their timezone first
export function loggableDates(now: Date, timeZone: string): string[] {
  const today = localDateOf(now, timeZone);
  return Array.from({ length: LOGGABLE_DAYS }, (_, i) => daysFrom(today, -i));
}

// The calendar date before this one, as Copy from yesterday reads it
export const dayBefore = (date: string) => daysFrom(date, -1);

export const dayAfter = (date: string) => daysFrom(date, 1);

export const isLoggableDate = (date: string, now: Date, timeZone: string) =>
  loggableDates(now, timeZone).includes(date);

// The day of the week of a calendar date
export const weekdayOf = (date: string): Weekday => Weekday.options[(calendarDay(date).getUTCDay() + 6) % 7];

// The seven dates of a calendar date's week, Monday first
export function weekDates(date: string): string[] {
  const monday = mondayOfDate(date);
  return Array.from({ length: 7 }, (_, i) => daysFrom(monday, i));
}

// The Monday of a calendar date's week, which runs Monday to Sunday as the Week Ledger's does
export function mondayOfDate(date: string): string {
  return daysFrom(date, -((calendarDay(date).getUTCDay() + 6) % 7));
}

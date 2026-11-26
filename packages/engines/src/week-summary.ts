import { mondayBefore, mondayOf } from "./week-ledger";

// The hour the Week Summary of the week ending is due, on its Sunday, in the user's timezone (spec #206)
export const WEEK_SUMMARY_HOUR = 18;

// The Monday of the week just ended, in the user's timezone: this week from 6 pm on Sunday, and the week before until
// then. The server answers GET /week-summaries/latest with it, and the phone uses it to know when to ask
export function latestWeekSummaryMonday(now: Date, timeZone: string): string {
  const thisWeek = mondayOf(now, timeZone);
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short", hour: "2-digit", hourCycle: "h23" })
    .formatToParts(now)
    .reduce<Record<string, string>>((all, { type, value }) => ({ ...all, [type]: value }), {});
  const due = parts.weekday === "Sun" && Number(parts.hour) >= WEEK_SUMMARY_HOUR;
  return due ? thisWeek : mondayBefore(thisWeek);
}

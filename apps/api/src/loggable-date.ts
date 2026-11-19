import { LOGGABLE_DAYS, loggableDates } from "@fit/engines";
import { badRequest } from "./bad-request";

// The local date a write is for, "today" being today in the user's timezone. Throws a 400 naming what's written
// ("Water must be from the last 7 days") unless it's today or one of the 6 days before it there (spec #158, "Every
// write")
export function requireLoggableDate(date: string, timeZone: string | undefined, what: string): string {
  const dates = loggableDates(new Date(), timeZone ?? "UTC");
  if (date === "today") return dates[0];
  if (!dates.includes(date)) throw badRequest(`${what} must be from the last ${LOGGABLE_DAYS} days`);
  return date;
}

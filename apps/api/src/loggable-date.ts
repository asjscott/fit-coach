import { localDateOf } from "@fit/engines";
import { findUser } from "./users";

const DAY_MS = 24 * 60 * 60 * 1000;
// Today and the 6 days before it: the days the user can still log into (spec #158, "Every write")
const LOGGABLE_DAYS = 7;

export const NOT_LOGGABLE = "the date must be today or one of the 6 days before it";

// The local date a write is for, "today" being today in the user's timezone. Null when it's in the future or more
// than 6 days before today there
export async function loggableDate(clerkUserId: string, date: string): Promise<string | null> {
  const timeZone = (await findUser(clerkUserId))?.timeZone ?? "UTC";
  const today = localDateOf(new Date(), timeZone);
  if (date === "today") return today;
  const daysBefore = (Date.parse(today) - Date.parse(date)) / DAY_MS;
  return daysBefore >= 0 && daysBefore < LOGGABLE_DAYS ? date : null;
}

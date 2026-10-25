import type { Set, Workout } from "@fit/shared";

// How Workouts and Sets read on screen

export const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const minutesLabel = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return rest ? `${Math.floor(minutes / 60)} h ${rest} min` : `${minutes / 60} h`;
};

export const durationLabel = ({ startedAt, endedAt }: Pick<Workout, "startedAt" | "endedAt">) =>
  minutesLabel(Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 60_000));

// How long a Workout still in progress has run: whole minutes, like a clock, and never below 0 if the phone's
// clock has moved back
export const elapsedLabel = (startedAt: string, now: Date) =>
  minutesLabel(Math.max(0, Math.floor((now.getTime() - Date.parse(startedAt)) / 60_000)));

const DAY_MS = 86_400_000;
const midnight = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
// Whole calendar days between two moments' dates; rounded, so a daylight-saving day still counts as one
const daysBetween = (from: Date, to: Date) => Math.round((midnight(to).getTime() - midnight(from).getTime()) / DAY_MS);

// When a Workout was, by how long ago: "Today, 1:33 PM", "Yesterday, 6:10 PM", "Tuesday, 7:02 AM" this past week,
// then "Sat 17 Oct, 9:40 AM"
export function relativeDateLabel(iso: string, now = new Date()) {
  const date = new Date(iso);
  const days = daysBetween(date, now);
  const time = timeLabel(iso);
  if (days === 0) return `Today, ${time}`;
  if (days === 1) return `Yesterday, ${time}`;
  if (days > 1 && days < 7) return `${date.toLocaleDateString([], { weekday: "long" })}, ${time}`;
  const sameYear = date.getFullYear() === now.getFullYear();
  const day = date.toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
  });
  return `${day.replace(",", "")}, ${time}`;
}

// A week of History by its Monday: "This week", "Last week", then "12–18 Oct" or "28 Sep – 4 Oct"
export function weekLabel(start: Date, now = new Date()) {
  const weeksAgo = Math.floor(daysBetween(start, now) / 7);
  if (weeksAgo <= 0) return "This week";
  if (weeksAgo === 1) return "Last week";
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  const month = (date: Date) => date.toLocaleDateString([], { month: "short" });
  const year = end.getFullYear() === now.getFullYear() ? "" : ` ${end.getFullYear()}`;
  return start.getMonth() === end.getMonth()
    ? `${start.getDate()}–${end.getDate()} ${month(end)}${year}`
    : `${start.getDate()} ${month(start)} – ${end.getDate()} ${month(end)}${year}`;
}

// A Volume in whole kg with thousands separators, e.g. "6,420"; the unit is drawn separately
export const kgLabel = (kg: number) => Math.round(kg).toLocaleString();

export const setsLabel = (sets: number) => `${sets} ${sets === 1 ? "set" : "sets"}`;

// A Set as its Load Type records it; add " per side" for a one-sided Exercise
export function describeSet(set: Set) {
  switch (set.kind) {
    case "external":
      return `${set.kg} kg × ${set.reps}`;
    case "bodyweight":
      return `${set.reps} reps`;
    case "timed":
      return `${set.seconds} s`;
  }
}

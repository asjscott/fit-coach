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
  return weekDatesLabel(start, now);
}

// A week by its dates, Monday to Sunday: "12–18 Oct" or "28 Sep – 4 Oct", with the year when it isn't this one
export function weekDatesLabel(start: Date, now = new Date()) {
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

// A Workout Exercise's Sets on one line: "18 kg × 10, 10, 8", "20 kg × 10 · 22.5 kg × 8, 6", "15, 12 reps", "45, 40 s"
export function setsSummary(sets: readonly Set[]) {
  const weighted: { kg: number; reps: number[] }[] = [];
  const values: number[] = [];
  let unit = "";
  for (const set of sets) {
    if (set.kind === "external") {
      const run = weighted.at(-1);
      if (run?.kg === set.kg) run.reps.push(set.reps);
      else weighted.push({ kg: set.kg, reps: [set.reps] });
    } else {
      values.push(set.kind === "bodyweight" ? set.reps : set.seconds);
      unit = set.kind === "bodyweight" ? "reps" : "s";
    }
  }
  const parts = weighted.map((run) => `${run.kg} kg × ${run.reps.join(", ")}`);
  if (values.length) parts.push(`${values.join(", ")} ${unit}`);
  return parts.join(" · ");
}

// A length of time as a Stat's value and unit: "49" min under an hour, then "2:05" h
export function timeStat(ms: number) {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return { value: String(minutes), unit: "min" };
  return { value: `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`, unit: "h" };
}

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

export const durationLabel = ({ startedAt, endedAt }: Pick<Workout, "startedAt" | "endedAt">) => {
  const minutes = Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return rest ? `${Math.floor(minutes / 60)} h ${rest} min` : `${minutes / 60} h`;
};

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

// How long an In-progress Workout has run, as a clock: "0:45", "48:12", "1:05:09"
export function elapsedLabel(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total / 60) % 60;
  const seconds = String(total % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}

// A Workout Exercise's Sets on one line, with each unit said once where it can be: "18 kg × 10, 10, 8",
// "16 kg × 10, 18 kg × 8", "12, 10 reps", "45, 40 s". Empty with no Sets
export function setsSummary(sets: readonly Set[]) {
  const values = (pick: (set: Set) => number | undefined) => sets.map((set) => pick(set) ?? "").join(", ");
  const first = sets[0];
  switch (first?.kind) {
    case undefined:
      return "";
    case "external": {
      const sameWeight = sets.every((set) => set.kind === "external" && set.kg === first.kg);
      return sameWeight
        ? `${first.kg} kg × ${values((set) => (set.kind === "external" ? set.reps : undefined))}`
        : sets.map(describeSet).join(", ");
    }
    case "bodyweight":
      return `${values((set) => (set.kind === "bodyweight" ? set.reps : undefined))} reps`;
    case "timed":
      return `${values((set) => (set.kind === "timed" ? set.seconds : undefined))} s`;
  }
}

// A collapsed Workout Exercise's line: "3 sets · 18 kg × 10, 10, 8", or "Not started"
export const workoutExerciseSummary = (sets: readonly Set[]) =>
  sets.length ? `${setsLabel(sets.length)} · ${setsSummary(sets)}` : "Not started";

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

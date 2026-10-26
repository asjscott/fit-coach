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

// Two digits, for clocks: "05"
export const twoDigits = (n: number) => String(n).padStart(2, "0");

// Whole minutes as a value and unit: "49" min under an hour, then "2:05" h
const minutesStat = (minutes: number) =>
  minutes < 60
    ? { value: String(minutes), unit: "min" }
    : { value: `${Math.floor(minutes / 60)}:${twoDigits(minutes % 60)}`, unit: "h" };

const statLabel = ({ value, unit }: { value: string; unit: string }) => `${value} ${unit}`;

// A length of time as a Stat's value and unit, to the nearest minute
export const timeStat = (ms: number) => minutesStat(Math.round(ms / 60_000));

export const durationLabel = ({ startedAt, endedAt }: Pick<Workout, "startedAt" | "endedAt">) =>
  statLabel(timeStat(Date.parse(endedAt) - Date.parse(startedAt)));

// How long an In-progress Workout has run, in whole minutes; 0 if the phone's clock has moved back
export const elapsedLabel = (ms: number) => statLabel(minutesStat(Math.max(0, Math.floor(ms / 60_000))));

const DAY_MS = 86_400_000;
const midnight = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
// Whole calendar days between two moments' dates; rounded, so a daylight-saving day still counts as one
const daysBetween = (from: Date, to: Date) => Math.round((midnight(to).getTime() - midnight(from).getTime()) / DAY_MS);

// When a Workout was: "Today, 1:33 PM", "Yesterday, 6:10 PM", "Tuesday, 7:02 AM", then "Sat 17 Oct, 9:40 AM"
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

// A week of History by its Monday: "This week", "Last week", then its dates
export function weekLabel(start: Date, now = new Date()) {
  const weeksAgo = Math.floor(daysBetween(start, now) / 7);
  if (weeksAgo <= 0) return "This week";
  if (weeksAgo === 1) return "Last week";
  return weekDatesLabel(start, now);
}

// A week's dates, Monday to Sunday, in the locale's order: "12 – 18 Oct" or "Oct 12 – 18", with the year when it
// isn't this one. Engines without formatRange (some Hermes builds) get "12 Oct – 18 Oct"
export function weekDatesLabel(start: Date, now = new Date(), locale?: string) {
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  const sameYear = end.getFullYear() === now.getFullYear();
  const format = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
  });
  const label =
    typeof format.formatRange === "function"
      ? format.formatRange(start, end)
      : `${format.format(start)} – ${format.format(end)}`;
  // Intl data versions space the dash differently ("12–18 Oct", "12 – 18 Oct"), so set it one way
  return label.replace(/\s*–\s*/, "\u2009–\u2009");
}

// A Volume in whole kg with thousands separators, e.g. "6,420"; the unit is drawn separately
export const kgLabel = (kg: number) => Math.round(kg).toLocaleString();

export const setsLabel = (sets: number) => `${sets} ${sets === 1 ? "set" : "sets"}`;

// How long an In-progress Workout has run, as a ticking clock for its own screen: "0:45", "48:12", "1:05:09"
export function elapsedClockLabel(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total / 60) % 60;
  const seconds = twoDigits(total % 60);
  return hours ? `${hours}:${twoDigits(minutes)}:${seconds}` : `${minutes}:${seconds}`;
}

// A Workout Exercise's Sets on one line, each unit said once where it can be: "18 kg × 10, 10, 8",
// "16 kg × 10, 18 kg × 8", "12, 10 reps", "45, 40 s". Empty with no Sets
export function setsSummary(sets: readonly Set[]) {
  const parts = sets.map(setParts);
  const first = parts[0];
  if (!first) return "";
  // Everything about a Set but its last number, e.g. 18 "kg ×" for weighted Sets, or "reps"
  const frame = (set: [number, string][]) => JSON.stringify([...set.slice(0, -1), set.at(-1)?.[1]]);
  if (!parts.every((set) => frame(set) === frame(first))) return sets.map(describeSet).join(", ");
  const lead = first.slice(0, -1).map(([value, unit]) => `${value} ${unit} `);
  const unit = first.at(-1)?.[1];
  return `${lead.join("")}${parts.map((set) => set.at(-1)?.[0]).join(", ")}${unit ? ` ${unit}` : ""}`;
}

// Previous Sets as a reference while logging: "Last: 18 kg × 10, 10, 8"
export const previousSetsLabel = (sets: readonly Set[]) => `Last: ${setsSummary(sets)}`;

// A collapsed Workout Exercise's line: "3 sets · 18 kg × 10, 10, 8", else its Previous Sets, else "Not started"
export function workoutExerciseSummary(sets: readonly Set[], previous?: readonly Set[]) {
  if (sets.length) return `${setsLabel(sets.length)} · ${setsSummary(sets)}`;
  return previous?.length ? previousSetsLabel(previous) : "Not started";
}

// A Set's numbers and the units after them, as it reads: 16 "kg ×" 10, 12 "reps", 45 "s"
export function setParts(set: Set): [number, string][] {
  switch (set.kind) {
    case "external":
      return [
        [set.kg, "kg ×"],
        [set.reps, ""],
      ];
    case "bodyweight":
      return [[set.reps, "reps"]];
    case "timed":
      return [[set.seconds, "s"]];
  }
}

// A Set as its Load Type records it: "16 kg × 10"; add " per side" for a one-sided Exercise
export const describeSet = (set: Set) =>
  setParts(set)
    .map(([value, unit]) => (unit ? `${value} ${unit}` : String(value)))
    .join(" ");

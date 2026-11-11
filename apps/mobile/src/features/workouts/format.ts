import type { BuiltInEquipment, InProgressWorkoutExercise, Pr, Set, SetTarget, SetValues, Workout } from "@fit/shared";
import { pairRestPlan } from "@fit/engines";
import { getCalendars } from "expo-localization";
import { bandLevelLabels } from "../equipment/loads";
import { exerciseName } from "./library";

// How Workouts and Sets read on screen

type WorkoutTimes = Pick<Workout, "startedAt" | "endedAt">;

export const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

// The phone's own 12- or 24-hour setting, which the locale alone can disagree with. Unknown in some browsers. Read each
// time, as Android can change it while the app runs
export const uses24HourClock = () => getCalendars()[0].uses24hourClock ?? undefined;

const HOUR_CYCLES = { true: "h23", false: "h12" } as const;

export const timeLabel = (iso: string) => {
  const uses24Hour = uses24HourClock();
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hourCycle: uses24Hour === undefined ? undefined : HOUR_CYCLES[`${uses24Hour}`],
  });
};

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

// How long a Workout should take, in minutes like its Workout Length: "About 44 min"
export const estimatedTimeLabel = (seconds: number) => `About ${Math.round(seconds / 60)} min`;

export const durationLabel = ({ startedAt, endedAt }: WorkoutTimes) =>
  statLabel(timeStat(Date.parse(endedAt) - Date.parse(startedAt)));

// How long an In-progress Workout has run, in whole minutes; 0 if the phone's clock has moved back
export const elapsedLabel = (ms: number) => statLabel(minutesStat(Math.max(0, Math.floor(ms / 60_000))));

const DAY_MS = 86_400_000;
const midnight = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
// Whole calendar days between two moments' dates; rounded, so a daylight-saving day still counts as one
const daysBetween = (from: Date, to: Date) => Math.round((midnight(to).getTime() - midnight(from).getTime()) / DAY_MS);

// The day of the week in the phone's language: "Tuesday"
export const weekdayLabel = (date: Date) => date.toLocaleDateString([], { weekday: "long" });

// When a Workout was: "Today, 1:33 PM", "Yesterday, 6:10 PM", "Tuesday, 7:02 AM", then "Sat 17 Oct, 9:40 AM"
export function relativeDateLabel(iso: string, now = new Date()) {
  const date = new Date(iso);
  const days = daysBetween(date, now);
  const time = timeLabel(iso);
  if (days === 0) return `Today, ${time}`;
  if (days === 1) return `Yesterday, ${time}`;
  if (days > 1 && days < 7) return `${weekdayLabel(date)}, ${time}`;
  const sameYear = date.getFullYear() === now.getFullYear();
  const day = date.toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
  });
  return `${day.replace(",", "")}, ${time}`;
}

const onSameDate = ({ startedAt, endedAt }: WorkoutTimes) => daysBetween(new Date(startedAt), new Date(endedAt)) === 0;

// When a Workout ran, the end's date only if it isn't the start's: "Today, 7:01 AM – 7:07 AM",
// "Yesterday, 11:30 PM – Today, 12:15 AM"
export const workoutWhenLabel = (workout: WorkoutTimes, now = new Date()) =>
  `${relativeDateLabel(workout.startedAt, now)} – ${
    onSameDate(workout) ? timeLabel(workout.endedAt) : relativeDateLabel(workout.endedAt, now)
  }`;

// The same below a heading that has the start's date: "7:01 AM – 7:07 AM", or both dates when they differ
export const workoutTimesLabel = (workout: WorkoutTimes, now = new Date()) =>
  onSameDate(workout)
    ? `${timeLabel(workout.startedAt)} – ${timeLabel(workout.endedAt)}`
    : workoutWhenLabel(workout, now);

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

// A weight to the tenth of a kg, with its unit: "16.8 kg"
export const weightLabel = (kg: number) => `${kg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`;

export const setsLabel = (sets: number) => `${sets} ${sets === 1 ? "set" : "sets"}`;

// A PR's new best against the one it beat (#130): "Estimated max 21.3 kg, up from 18.7 kg", "14 reps, up from 12"
export function prLabel({ measure, best, previous }: Pr) {
  if (measure === "e1rm") return `Estimated max ${weightLabel(best)}, up from ${weightLabel(previous)}`;
  if (measure === "load") return `${weightLabel(best)} for 8 reps, up from ${weightLabel(previous)}`;
  if (measure === "reps") return `${best} reps, up from ${previous}`;
  return `${best} s, up from ${previous} s`;
}

// The line that celebrates a Workout's PRs: "New PR: Goblet squat", "2 new PRs: Goblet squat, Plank"
export function prsHeadline(prs: readonly Pr[]) {
  const names = prs.map((pr) => exerciseName(pr.slug)).join(", ");
  return prs.length === 1 ? `New PR: ${names}` : `${prs.length} new PRs: ${names}`;
}

// How long an In-progress Workout has run, as a ticking clock for its own screen: "0:45", "48:12", "1:05:09"
export function elapsedClockLabel(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total / 60) % 60;
  const seconds = twoDigits(total % 60);
  return hours ? `${hours}:${twoDigits(minutes)}:${seconds}` : `${minutes}:${seconds}`;
}

// A Workout Exercise's Sets on one line, each unit said once where it can be: "18 kg × 10, 10, 8",
// "16 kg × 10, 18 kg × 8", "12, 10 reps", "45, 40 s", "1 min 30 s, 1 min 15 s". Empty with no Sets
export function setsSummary(sets: readonly Set[]) {
  const parts = sets.map(setParts);
  const first = parts[0];
  if (!first) return "";
  // Everything about a Set but its last number, e.g. 18 "kg ×" for weighted Sets, or "reps". Only a weight is said
  // once before the numbers: "1 min 30, 15 s" would misread
  const frame = (set: [number, string][]) => JSON.stringify([...set.slice(0, -1), set.at(-1)?.[1]]);
  const sharesFrame = parts.every((set) => frame(set) === frame(first));
  if (!sharesFrame || (first.length > 1 && sets[0]?.kind !== "external")) return sets.map(describeSet).join(", ");
  const lead = first.slice(0, -1).map(([value, unit]) => `${value} ${unit} `);
  const unit = first.at(-1)?.[1];
  return `${lead.join("")}${parts.map((set) => set.at(-1)?.[0]).join(", ")}${unit ? ` ${unit}` : ""}`;
}

// Previous Sets as a reference while logging: "Last: 18 kg × 10, 10, 8"
export const previousSetsLabel = (sets: readonly Set[]) => `Last: ${setsSummary(sets)}`;

// A Set's target as a Set reads: "20 kg × 8", "12 reps", "40 s", "Medium band × 12". A timed target of a minute or more
// reads in minutes, as the walk's "20 min" (#109). A profile's loads are summed, so a kg can carry floating-point noise,
// unlike a logged Set's
export function setTargetLabel(target: SetTarget) {
  switch (target.unit) {
    case "kg":
      return describeSet({ kind: "external", kg: Math.round(target.kg * 100) / 100, reps: target.reps });
    case "reps":
      return describeSet({ kind: "bodyweight", reps: target.reps });
    case "seconds":
      return describeSet({ kind: "timed", seconds: target.seconds });
    case "band":
      return `${bandLevelLabels[target.level]} band × ${target.reps}`;
  }
}

type PlannedSets = NonNullable<InProgressWorkoutExercise["planned"]>;

// What the plan sets for an Exercise: "3 sets · 20 kg × 8", with " per side" for a one-sided Exercise
export const plannedSetsLabel = ({ sets, target }: PlannedSets, unilateral = false) =>
  `${setsLabel(sets)} · ${setTargetLabel(target)}${unilateral ? " per side" : ""}`;

export const builtInEquipmentLabels: Record<BuiltInEquipment, string> = {
  full_gym: "Full gym",
  bodyweight_only: "Bodyweight only",
};

// Why the Workout is shorter on a built-in choice: "No Bodyweight only option for lat pulldown"
export const noAlternativeLabel = (equipment: BuiltInEquipment, name: string) =>
  `No ${builtInEquipmentLabels[equipment]} option for ${name.toLowerCase()}`;

// A collapsed Workout Exercise's line: "3 sets · 18 kg × 10, 10, 8", else its target Sets, else its Previous Sets,
// else "Not started"
export function workoutExerciseSummary(
  sets: readonly Set[],
  previous?: readonly Set[],
  planned?: PlannedSets,
  unilateral?: boolean,
) {
  if (sets.length) return `${setsLabel(sets.length)} · ${setsSummary(sets)}`;
  if (planned) return plannedSetsLabel(planned, unilateral);
  return previous?.length ? previousSetsLabel(previous) : "Not started";
}

// A Set's numbers and the units after them, as it reads: 16 "kg ×" 10, 12 "reps", 45 "s"
export function setParts(set: Set | SetValues): [number, string][] {
  switch (set.kind) {
    case "external":
      return [
        [set.kg, "kg ×"],
        [set.reps, ""],
      ];
    case "bodyweight":
      return [[set.reps, "reps"]];
    case "timed":
      return durationParts(set.seconds);
  }
}

// A minute or more reads in minutes, as the walk's "20 min" (#109): "45 s", "1 min 30 s"
function durationParts(seconds: number): [number, string][] {
  if (seconds < 60) return [[seconds, "s"]];
  const over = seconds % 60;
  return [[Math.floor(seconds / 60), "min"], ...(over ? [[over, "s"] as [number, string]] : [])];
}

// A Set as its Load Type records it: "16 kg × 10"; add " per side" for a one-sided Exercise
export const describeSet = (set: Set | SetValues) =>
  setParts(set)
    .map(([value, unit]) => (unit ? `${value} ${unit}` : String(value)))
    .join(" ");

// A superset's letter by its place among the Workout's supersets, from 0: A makes A1 and A2, as gym programmes write them
export const supersetLetter = (index: number) => String.fromCharCode(65 + index);

// The superset box's banner mid-round (#96). The name is the library's, as it is (#111)
export const straightToLabel = (name: string) => `No rest: straight to ${name}`;

// The superset box's note on its rests, as pairRestPlan gives them (#111)
export function supersetNote(pair: Parameters<typeof pairRestPlan>[0]) {
  const { pairSeconds, fewer, done } = pairRestPlan(pair);
  const pairNote = `No rest between them, then ${pairSeconds} s rest`;
  if (!fewer) return pairNote;
  const name = exerciseName(fewer.slug);
  if (done === fewer.slug) return `${name} is done: ${fewer.otherSeconds} s rest between Sets`;
  return fewer.otherSeconds === pairSeconds ? pairNote : `${pairNote}. Once ${name} is done, ${fewer.otherSeconds} s`;
}

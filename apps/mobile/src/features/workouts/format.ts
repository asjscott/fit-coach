import {
  fromKg,
  inUnitToStep,
  loadInUnit,
  type BuiltInEquipment,
  type InProgressWorkoutExercise,
  type Pr,
  type Set,
  type SetTarget,
  type SetValues,
  type WeightUnit,
  type Workout,
} from "@fit/shared";
import { pairRestPlan, recoveryWorkoutKind, type RestChoice } from "@fit/engines";
import { getCalendars } from "expo-localization";
import { bandLevelLabels } from "../equipment/loads";
import { exerciseName, type SetReading, type TargetReading } from "./library";

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

// Whole minutes as a value and unit: "49" min under an hour, then "2 h 5" min, or "49" h on the hour. Never a clock,
// which reads oddly past a day: "49:00 h" (#144)
function minutesStat(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return { value: String(minutes), unit: "min" };
  return rest ? { value: `${hours} h ${rest}`, unit: "min" } : { value: String(hours), unit: "h" };
}

const statLabel = ({ value, unit }: { value: string; unit: string }) => `${value} ${unit}`;

// A length of time as a Stat's value and unit, to the nearest minute
export const timeStat = (ms: number) => minutesStat(Math.round(ms / 60_000));

// How long a Workout should take, in minutes like its Workout Length: "About 44 min"
export const estimatedTimeLabel = (seconds: number) => `About ${Math.round(seconds / 60)} min`;

export const durationLabel = ({ startedAt, endedAt }: WorkoutTimes) =>
  statLabel(timeStat(Date.parse(endedAt) - Date.parse(startedAt)));

// The two Recovery Workouts (#198), on Today, the Rest Day card, the plan's sheet and in History
export const MOBILITY = "Mobility";
export const WALK_AND_MOBILITY = "Walk and mobility";

// Which Recovery Workout one in History was, "Mobility · 20 min" by the time it took, or null for any other Workout
export function recoveryWorkoutLabel(workout: WorkoutTimes & Pick<Workout, "workoutExercises">) {
  const kind = recoveryWorkoutKind(workout);
  if (kind === "mobility") return `${MOBILITY} · ${durationLabel(workout)}`;
  return kind && WALK_AND_MOBILITY;
}

// How long an In-progress Workout has run, in whole minutes; 0 if the phone's clock has moved back
export const elapsedLabel = (ms: number) => statLabel(minutesStat(Math.max(0, Math.floor(ms / 60_000))));

const DAY_MS = 86_400_000;
const midnight = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
// Whole calendar days between two moments' dates; rounded, so a daylight-saving day still counts as one
const daysBetween = (from: Date, to: Date) => Math.round((midnight(to).getTime() - midnight(from).getTime()) / DAY_MS);

// A date's calendar day at noon UTC, to format in UTC rather than as an instant: iOS's Hermes formats a local date with
// the offset in force now, so local midnight before the clocks go back read as the day before (#156)
const calendarDay = (date: Date) => new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12));

// The day of the week of a date's calendar day, in the phone's language: "Tuesday"
export const weekdayLabel = (date: Date) =>
  new Intl.DateTimeFormat([], { weekday: "long", timeZone: "UTC" }).format(calendarDay(date));

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
  // Formats each date's calendarDay, not its instant (#156)
  const format = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
    timeZone: "UTC",
  });
  const [from, to] = [calendarDay(start), calendarDay(end)];
  const label =
    typeof format.formatRange === "function"
      ? format.formatRange(from, to)
      : `${format.format(from)} – ${format.format(to)}`;
  // Intl data versions space the dash differently ("12–18 Oct", "12 – 18 Oct"), so set it one way
  return label.replace(/\s*–\s*/, "\u2009–\u2009");
}

// Every load is stored in kg and shown in the user's unit (#126)

// A Volume in whole units of the user's with thousands separators, e.g. "6,420"; the unit is drawn separately
export const volumeLabel = (kg: number, unit: WeightUnit) => Math.round(fromKg(kg, unit)).toLocaleString();

// A load in the user's unit (loadInUnit), with the unit: "25 lb", "16.5 kg"
export const loadLabel = (kg: number, unit: WeightUnit) => `${loadInUnit(kg, unit)} ${unit}`;

// A weight to the tenth of the user's unit, such as an Estimated maximum or body weight: "16.8 kg", "37 lb"
export const weightLabel = (kg: number, unit: WeightUnit) => `${inUnitToStep(kg, unit, 0.1).toLocaleString()} ${unit}`;

export const setsLabel = (sets: number) => `${sets} ${sets === 1 ? "set" : "sets"}`;

// A PR's new best against the one it beat (#130), weights in the user's unit (#126) and both rounded the same way
// (#146): "Estimated max 162 lb, up from 154 lb", "20 kg for 8 reps, up from 16 kg", "14 reps, up from 12"
export function prLabel({ measure, best, previous }: Pr, unit: WeightUnit) {
  if (measure === "e1rm") {
    const [to, from] = estimatesLabels(best, previous, unit);
    return `Estimated max ${to}, up from ${from}`;
  }
  if (measure === "load") return `${loadLabel(best, unit)} for 8 reps, up from ${loadLabel(previous, unit)}`;
  if (measure === "reps") return `${best} reps, up from ${previous}`;
  return `${best} s, up from ${previous} s`;
}

// Two estimates in whole units of the user's, or both to the tenth when whole units would read the same
function estimatesLabels(a: number, b: number, unit: WeightUnit) {
  const digits = Math.round(fromKg(a, unit)) === Math.round(fromKg(b, unit)) ? 1 : 0;
  const label = (kg: number) =>
    `${fromKg(kg, unit).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })} ${unit}`;
  return [label(a), label(b)];
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
// "16 kg × 10, 18 kg × 8", "12, 10 reps", a Jump's "6, 6 contacts", "90, 75 s", the walk's "20 min". Empty with no Sets
export function setsSummary(sets: readonly Set[], unit: WeightUnit, reading?: SetReading) {
  const parts = sets.map((set) => setParts(set, unit, reading));
  const first = parts[0];
  if (!first) return "";
  // Everything about a Set but its last number, e.g. 18 "kg ×" for weighted Sets, or "reps". Only a weight is said
  // once before the numbers: "1 min 30, 15 s" would misread
  const frame = (set: [number, string][]) => JSON.stringify([...set.slice(0, -1), set.at(-1)?.[1]]);
  const sharesFrame = parts.every((set) => frame(set) === frame(first));
  if (!sharesFrame || (first.length > 1 && sets[0]?.kind !== "external")) {
    return sets.map((set) => describeSet(set, unit, reading)).join(", ");
  }
  const last = first.at(-1)?.[1];
  return `${leadParts(first)}${parts.map((set) => set.at(-1)?.[0]).join(", ")}${last ? ` ${last}` : ""}`;
}

// Previous Sets as a reference while logging: "Last: 18 kg × 10, 10, 8"
export const previousSetsLabel = (sets: readonly Set[], unit: WeightUnit, reading?: SetReading) =>
  `Last: ${setsSummary(sets, unit, reading)}`;

// A Set's target as a Set reads: "20 kg × 8", "12 reps", "40 s", "Medium band × 12". Only the walk's reads in
// minutes, "20 min" (#109, #177). loadInUnit hides the floating-point noise of a
// profile's summed loads. With its Exercise's reading, " per side" for a one-sided Exercise,
// a Jump's reps as contacts (#105), and its range (#183): "20 kg × 8–12 · aim for 9", "10–15 reps", "60+ s"
export function setTargetLabel(target: SetTarget, unit: WeightUnit, reading?: TargetReading) {
  const perSide = reading?.unilateral ? " per side" : "";
  const range = reading?.rangeOf?.(target);
  if (!range) return `${oneNumberLabel(target, unit, reading)}${perSide}`;
  const { min, max } = range;
  const span = max === undefined ? `${min}+` : `${min}–${max}`;
  switch (target.unit) {
    case "kg":
      return `${loadLabel(target.kg, unit)} × ${span}${perSide} · aim for ${target.reps}`;
    case "band":
      return `${bandLevelLabels[target.level]} band × ${span}${perSide} · aim for ${target.reps}`;
    case "reps":
      return `${span} reps${perSide}`;
    case "seconds":
      return `${span} s${perSide}`;
  }
}

function oneNumberLabel(target: SetTarget, unit: WeightUnit, reading?: SetReading) {
  switch (target.unit) {
    case "kg":
      return describeSet({ kind: "external", kg: target.kg, reps: target.reps }, unit);
    case "reps":
      return describeSet({ kind: "bodyweight", reps: target.reps }, unit, reading);
    case "seconds":
      return describeSet({ kind: "timed", seconds: target.seconds }, unit, reading);
    case "band":
      return `${bandLevelLabels[target.level]} band × ${target.reps}`;
  }
}

type PlannedSets = NonNullable<InProgressWorkoutExercise["planned"]>;

// What the plan sets for an Exercise: "3 sets · 20 kg × 8–12 · aim for 9"
export const plannedSetsLabel = ({ sets, target }: PlannedSets, unit: WeightUnit, reading?: TargetReading) =>
  `${setsLabel(sets)} · ${setTargetLabel(target, unit, reading)}`;

// The Set coming next, on the rest screen (#179): "Set 2 of 3 · 20 kg × 8–12 · aim for 9", or "Set 3" with no plan
export const upNextLabel = (
  { setNumber, plannedSets }: { setNumber: number; plannedSets?: number },
  target: SetTarget | undefined,
  unit: WeightUnit,
  reading?: TargetReading,
) =>
  [
    plannedSets ? `Set ${setNumber} of ${plannedSets}` : `Set ${setNumber}`,
    ...(target ? [setTargetLabel(target, unit, reading)] : []),
  ].join(" · ");

export const builtInEquipmentLabels: Record<BuiltInEquipment, string> = {
  full_gym: "Full gym",
  bodyweight_only: "Bodyweight only",
};

// Why the Workout is shorter on a built-in choice: "No Bodyweight only option for lat pulldown"
export const noAlternativeLabel = (equipment: BuiltInEquipment, name: string) =>
  `No ${builtInEquipmentLabels[equipment]} option for ${name.toLowerCase()}`;

// A collapsed Workout Exercise's line: "3 sets · 18 kg × 10, 10, 8", else its target Sets, else its Previous Sets,
// else "Not started". A Jump's reps read as contacts (#141)
export function workoutExerciseSummary(
  sets: readonly Set[],
  unit: WeightUnit,
  previous?: readonly Set[],
  planned?: PlannedSets,
  reading?: TargetReading,
) {
  if (sets.length) return `${setsLabel(sets.length)} · ${setsSummary(sets, unit, reading)}`;
  if (planned) return plannedSetsLabel(planned, unit, reading);
  return previous?.length ? previousSetsLabel(previous, unit, reading) : "Not started";
}

// A Set's numbers and the units after them, as it reads: 16 "kg ×" 10, 12 "reps", 90 "s", a Jump's 10 "contacts"
// (#141), and the walk's 20 "min". A load is in the user's unit
export function setParts(set: Set | SetValues, unit: WeightUnit, reading?: SetReading): [number, string][] {
  switch (set.kind) {
    case "external":
      return [
        [loadInUnit(set.kg, unit), `${unit} ×`],
        [set.reps, ""],
      ];
    case "bodyweight":
      return [[set.reps, reading?.jump ? "contacts" : "reps"]];
    case "timed":
      return reading?.inMinutes ? minutesParts(set.seconds) : [[set.seconds, "s"]];
  }
}

// The walk's time, or a rest choice, in minutes from a minute (#109): "20 min", "1 min 30 s", "45 s"
export function minutesParts(seconds: number): [number, string][] {
  if (seconds < 60) return [[seconds, "s"]];
  const over = seconds % 60;
  return [[Math.floor(seconds / 60), "min"], ...(over ? [[over, "s"] as [number, string]] : [])];
}

// Every part but the last, each with its unit, to say before the last number: "18 kg × " of 18 kg × 10, "1 min " of
// 1 min 30 s; empty for one part
export const leadParts = (parts: readonly [number, string][]) =>
  parts
    .slice(0, -1)
    .map(([value, label]) => `${value} ${label} `)
    .join("");

// A Set as its Load Type records it: "16 kg × 10", a Jump's "10 contacts"; add " per side" for a one-sided Exercise
export const describeSet = (set: Set | SetValues, unit: WeightUnit, reading?: SetReading) =>
  partsLabel(setParts(set, unit, reading));

const partsLabel = (parts: readonly [number, string][]) =>
  parts.map(([value, label]) => (label ? `${value} ${label}` : String(value))).join(" ");

// A length of time to the second: "1 min 50 s", "55 s", "2 min"
export const secondsLabel = (seconds: number) => partsLabel(minutesParts(seconds));

// A superset's letter by its place among the Workout's supersets, from 0: A makes A1 and A2, as gym programmes write them
export const supersetLetter = (index: number) => String.fromCharCode(65 + index);

// The superset box's banner mid-round (#96). The name is the library's, as it is (#111)
export const straightToLabel = (name: string) => `No rest: straight to ${name}`;

// A rest choice on Today: "Auto", "45 s", "1 min 15 s"
export function restChoiceLabel(choice: RestChoice) {
  return choice === "auto" ? "Auto" : secondsLabel(choice);
}

// The superset box's note on its rests, as pairRestPlan gives them (#111)
export function supersetNote(pair: Parameters<typeof pairRestPlan>[0], choice?: RestChoice) {
  const { pairSeconds, fewer, done } = pairRestPlan(pair, choice);
  const pairNote = `No rest between them, then ${pairSeconds} s rest`;
  if (!fewer) return pairNote;
  const name = exerciseName(fewer.slug);
  if (done === fewer.slug) return `${name} is done: ${fewer.otherSeconds} s rest between Sets`;
  return fewer.otherSeconds === pairSeconds ? pairNote : `${pairNote}. Once ${name} is done, ${fewer.otherSeconds} s`;
}

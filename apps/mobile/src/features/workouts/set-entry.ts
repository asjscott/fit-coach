import {
  SAME_LOAD_TOLERANCE,
  stepperLoad,
  UNKNOWN_LOADS_STEP_KG,
  type LoadsByEquipment,
  type StepDirection,
} from "@fit/engines";
import { inUnitToStep, loadInUnit, toKg, type LoadType, type SetValues, type WeightUnit } from "@fit/shared";
import { leadParts, minutesParts } from "./format";
import type { SetReading } from "./library";

// Entering a Set's values with −/+ steppers: what each step adds, and turning typed text into the values the
// Logbook checks. A load is typed in the user's unit, and becomes its exact kg only once logged (#126)

export type SetField = "load" | "reps" | "seconds";

// The fields each Load Type asks for, in order
export const SET_FIELDS: Record<LoadType, SetField[]> = {
  external: ["load", "reps"],
  bodyweight: ["reps"],
  timed: ["seconds"],
};

// What's typed in each field; a load in the user's unit, with its exact kg while it's as filled or stepped to, as its
// text may be rounded
export type SetDraft = Partial<Record<SetField, string>> & { kg?: number };

// A field's name as the user reads it: a load is named by its unit
export const fieldLabel = (field: SetField, unit: WeightUnit) => (field === "load" ? unit : field);

// The fields filled from `from` (the previous Set, or the Set being edited), or empty. A load reads as its stepper
// names it
export function setDraft(loadType: LoadType, from: SetValues | null, { name }: Pick<LoadSteps, "name">): SetDraft {
  const kg = from && "kg" in from ? from.kg : undefined;
  const values: Partial<Record<SetField, string | number>> = { ...from, load: kg === undefined ? undefined : name(kg) };
  const fields = Object.fromEntries(SET_FIELDS[loadType].map((field) => [field, String(values[field] ?? "")]));
  return kg === undefined ? fields : { ...fields, kg };
}

// The draft as a Set's values, or what's missing. Typed numbers pass as they are, a load as its exact kg: the Logbook
// checks the rest
export function draftValues(
  loadType: LoadType,
  draft: SetDraft,
  unit: WeightUnit,
): { values: SetValues } | { error: string } {
  const fields = SET_FIELDS[loadType];
  const numbers = fields.map((field) => [field, parseField(draft[field] ?? "")] as const);
  if (numbers.some(([, value]) => !Number.isFinite(value))) {
    return { error: `Enter ${fields.map((field) => fieldLabel(field, unit)).join(" and ")}` };
  }
  const values = numbers.map(([field, value]) =>
    field === "load" ? ["kg", draft.kg ?? toKg(value, unit)] : [field, value],
  );
  return { values: { kind: loadType, ...Object.fromEntries(values) } as SetValues };
}

// A rated test Set (an Assessment's weighted test) can't be logged without an RPE, so Log set waits for a chip
export function rpeMissing(asksRpe: boolean, rpe: number | undefined): boolean {
  return asksRpe && rpe === undefined;
}

// The walk's seconds as the stepper shows them, read as its target and logged Set read (#145): 1200 shows as
// "20" "min", 90 as "1 min 30" "s". Only whole seconds are shown so: anything else shows as typed
function minutesField(text: string): { value: string; unit: string } {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return { value: text, unit: "s" };
  const parts = minutesParts(Number(trimmed));
  const [value, unit] = parts.at(-1)!;
  return { value: `${leadParts(parts)}${value}`, unit };
}

// For screen readers, what one step of the walk adds or takes away: "Plus 1 minute", "Minus 5 seconds"
function minutesStepLabel(text: string, direction: StepDirection): string {
  const typed = parseField(text);
  const from = Number.isFinite(typed) ? Math.round(typed) : 0;
  const byMinute = direction === 1 ? from >= MINUTE : from > MINUTE;
  return `${direction === 1 ? "Plus" : "Minus"} ${byMinute ? "1 minute" : `${STEPS.seconds} seconds`}`;
}

// A load has no fixed step: it goes to the next load the equipment has (createLoadSteps). Seconds step by 5 at every
// length (#177), except the walk's (minutesStep)
const STEPS: Record<Exclude<SetField, "load">, number> = { reps: 1, seconds: 5 };

const MINUTE = 60;

// The walk goes to the next or previous whole minute, and by 5 s under one (#145): 55 s → 1 min → 2 min → 1 min → 55 s
function minutesStep(seconds: number, direction: StepDirection): number {
  if (direction === 1 && seconds >= MINUTE) return (Math.floor(seconds / MINUTE) + 1) * MINUTE;
  if (direction === -1 && seconds > MINUTE) return (Math.ceil(seconds / MINUTE) - 1) * MINUTE;
  return seconds + STEPS.seconds * direction;
}

// The step when the equipment's loads aren't known (#58), a round number in each unit
const UNKNOWN_LOADS_STEP: Record<WeightUnit, number> = { kg: UNKNOWN_LOADS_STEP_KG, lb: 5 };

// A load field's text, in the user's unit, and its exact kg unless it was typed
export type LoadEntry = { text: string; kg?: number };

// How an Exercise's loads are named and stepped through
export type LoadSteps = {
  // A load in the user's unit
  name: (kg: number) => string;
  // To the next lighter or heavier load
  step: (from: LoadEntry, direction: StepDirection) => LoadEntry;
  // Else a load steps by 5 lb or 2 kg, and screen readers say so
  loadsKnown: boolean;
  unit: WeightUnit;
};

// The names of one kind of equipment's loads: as the user sees a load everywhere else, but to the hundredth where that
// would give two the same name
function namesOf(loadsKg: readonly number[], unit: WeightUnit): (readonly [kg: number, name: string])[] {
  const shown = loadsKg.map((kg) => loadInUnit(kg, unit));
  const counts = new Map<number, number>();
  for (const load of shown) counts.set(load, (counts.get(load) ?? 0) + 1);
  return loadsKg.map((kg, i) => {
    const load = shown[i]!;
    return [kg, String(counts.get(load) === 1 ? load : inUnitToStep(kg, unit, 0.01))] as const;
  });
}

const sameLoad = (a: number, b: number) => Math.abs(a - b) <= SAME_LOAD_TOLERANCE;

// Steps through the exact loads of each kind of equipment (as loadsByEquipmentKg gives them). A typed load that reads as
// one of them steps from it, so a load whose kg is a hair off the one shown never sticks. A step stays on the kind the
// load is on (#149), so a lb gym's dumbbells step 25 to 30 lb past a 26.5 lb kettlebell. By 5 lb or 2 kg when the loads
// aren't known
export function createLoadSteps(loadsByEquipmentKg: LoadsByEquipment, unit: WeightUnit): LoadSteps {
  const names = loadsByEquipmentKg.flatMap((loadsKg) => namesOf(loadsKg, unit));
  const loadsKnown = names.length > 0;
  const name = (kg: number) => names.find(([load]) => sameLoad(load, kg))?.[1] ?? String(loadInUnit(kg, unit));
  const kgOf = (typed: number) => names.find(([, text]) => Number(text) === typed)?.[0] ?? toKg(typed, unit);

  const step = ({ text, kg }: LoadEntry, direction: StepDirection): LoadEntry => {
    const typed = parseField(text);
    const load = Number.isFinite(typed) ? typed : 0;
    if (!loadsKnown) {
      return { text: String(stepperLoad(roundTo(load, 0.5), direction, [], UNKNOWN_LOADS_STEP[unit])) };
    }
    const from = kg ?? kgOf(load);
    const next = stepperLoad(from, direction, loadsByEquipmentKg, 0);
    // Past the lightest or heaviest, what's typed stays
    return next === from ? { text: String(load), kg } : { text: name(next), kg: next };
  };
  return { name, step, loadsKnown, unit };
}

// For screen readers: with the equipment's loads known, a tap's size changes from load to load, so it isn't named
export function loadStepLabel(direction: StepDirection, loadsKnown: boolean, unit: WeightUnit): string {
  if (loadsKnown) return direction === 1 ? "Next heavier weight" : "Next lighter weight";
  return `${direction === 1 ? "Plus" : "Minus"} ${UNKNOWN_LOADS_STEP[unit]} ${unit}`;
}

// How a field reads in its stepper, one entry per field so the stepper doesn't branch on it. A load's depends on the
// equipment and the user's unit (loadReading); a Jump's reps are its contacts (#105)
export type FieldReading = {
  // The value drawn, the unit beside it, and the value's name for screen readers; as typed while typing
  shown: (text: string, typing: boolean) => { value: string; unit: string; name: string };
  // For screen readers, what one step adds or takes away
  stepLabel: (text: string, direction: StepDirection) => string;
  keyboardType: "decimal-pad" | "number-pad";
};

// And how a field that isn't a load steps
export type FieldStepper = FieldReading & {
  // The smallest amount it steps from, as it's shown
  resolution: number;
  next: (from: number, direction: StepDirection) => number;
};

const asTyped = (unit: string) => (text: string) => ({ value: text, unit, name: unit });

// For screen readers: "Plus 1 rep", "Minus 5 seconds"
const fixedStepLabel = (step: string) => (_: string, direction: StepDirection) =>
  `${direction === 1 ? "Plus" : "Minus"} ${step}`;

// Reps, or a Jump's contacts, by 1
const countStepper = (one: string, many: string): FieldStepper => ({
  shown: asTyped(many),
  stepLabel: fixedStepLabel(`${STEPS.reps} ${one}`),
  resolution: 1,
  next: (from, direction) => from + STEPS.reps * direction,
  keyboardType: "number-pad",
});

export const FIELD_STEPPERS = {
  reps: countStepper("rep", "reps"),
  contacts: countStepper("contact", "contacts"),
  seconds: {
    shown: (text) => ({ value: text, unit: "s", name: "seconds" }),
    stepLabel: fixedStepLabel(`${STEPS.seconds} seconds`),
    resolution: 1,
    next: (from, direction) => from + STEPS.seconds * direction,
    keyboardType: "number-pad",
  },
  // The walk's seconds: in minutes from a minute (#145), as seconds while being typed
  minutes: {
    shown: (text, typing) => {
      const { value, unit } = typing ? { value: text, unit: "s" } : minutesField(text);
      return { value, unit, name: unit === "min" ? "minutes" : "seconds" };
    },
    stepLabel: minutesStepLabel,
    resolution: 1,
    next: minutesStep,
    keyboardType: "number-pad",
  },
} satisfies Record<string, FieldStepper>;

// The stepper for an Exercise's reps or seconds, as its Sets read
export function fieldStepper(field: Exclude<SetField, "load">, reading: SetReading): FieldStepper {
  if (field === "reps") return reading.jump ? FIELD_STEPPERS.contacts : FIELD_STEPPERS.reps;
  return reading.inMinutes ? FIELD_STEPPERS.minutes : FIELD_STEPPERS.seconds;
}

export const loadReading = ({ loadsKnown, unit }: Pick<LoadSteps, "loadsKnown" | "unit">): FieldReading => ({
  shown: asTyped(unit),
  stepLabel: (_, direction) => loadStepLabel(direction, loadsKnown, unit),
  keyboardType: "decimal-pad",
});

// A field's typed text as a number, reading a decimal comma as a point; NaN when empty or not a number
export function parseField(text: string): number {
  const trimmed = text.trim().replace(",", ".");
  return trimmed ? Number(trimmed) : NaN;
}

const roundTo = (value: number, resolution: number) => Math.round(value / resolution) * resolution;

// Steps from the typed value, first rounded to what the field steps from; from nothing when the field is empty or not
// a number; never below zero
export function stepValue({ resolution, next }: FieldStepper, text: string, direction: StepDirection): string {
  const typed = parseField(text);
  const from = Number.isFinite(typed) ? roundTo(typed, resolution) : 0;
  return String(Math.max(0, next(from, direction)));
}

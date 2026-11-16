import { stepLoadKg, UNKNOWN_LOADS_STEP_KG, type StepDirection } from "@fit/engines";
import { loadInUnit, toKg, type LoadType, type SetValues, type WeightUnit } from "@fit/shared";
import { durationParts, leadParts } from "./format";

// Entering a Set's values with −/+ steppers: what each step adds, and turning typed text into the values the
// Logbook checks. A load is typed and stepped in the user's unit, and becomes its exact kg only once logged (#126)

export type SetField = "load" | "reps" | "seconds";

// The fields each Load Type asks for, in order
export const SET_FIELDS: Record<LoadType, SetField[]> = {
  external: ["load", "reps"],
  bodyweight: ["reps"],
  timed: ["seconds"],
};

// What's typed in each field; a load in the user's unit
export type SetDraft = Partial<Record<SetField, string>>;

// A field's name as the user reads it: a load is named by its unit
export const fieldLabel = (field: SetField, unit: WeightUnit) => (field === "load" ? unit : field);

// The fields filled from `from` (the previous Set, or the Set being edited), or empty. A load shows as the user sees
// it everywhere else: in their unit, to the nearest 0.5
export function setDraft(loadType: LoadType, from: SetValues | null, unit: WeightUnit): SetDraft {
  const values: Partial<Record<SetField, number>> = from
    ? { load: "kg" in from ? loadInUnit(from.kg, unit) : undefined, ...from }
    : {};
  return Object.fromEntries(SET_FIELDS[loadType].map((field) => [field, String(values[field] ?? "")]));
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
  const values = numbers.map(([field, value]) => (field === "load" ? ["kg", toKg(value, unit)] : [field, value]));
  return { values: { kind: loadType, ...Object.fromEntries(values) } as SetValues };
}

// A rated test Set (an Assessment's weighted test) can't be logged without an RPE, so Log set waits for a chip
export function rpeMissing(asksRpe: boolean, rpe: number | undefined): boolean {
  return asksRpe && rpe === undefined;
}

// A timed Set's seconds as the stepper shows them, read as the target and the logged Set read (#145): 1200 shows as
// "20" "min", 90 as "1 min 30" "s". Only whole seconds are shown so: anything else shows as typed
export function secondsField(text: string): { value: string; unit: string } {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return { value: text, unit: "s" };
  const parts = durationParts(Number(trimmed));
  const [value, unit] = parts.at(-1)!;
  return { value: `${leadParts(parts)}${value}`, unit };
}

// For screen readers, what one step of a timed Set adds or takes away: "Plus 1 minute", "Minus 5 seconds"
export function secondsStepLabel(text: string, direction: StepDirection): string {
  const typed = parseField(text);
  const from = Number.isFinite(typed) ? Math.round(typed) : 0;
  const byMinute = direction === 1 ? from >= MINUTE : from > MINUTE;
  return `${direction === 1 ? "Plus" : "Minus"} ${byMinute ? "1 minute" : `${STEPS.seconds} seconds`}`;
}

// A load has no fixed step: it goes to the next load the equipment has (loadStep). Seconds step by 5 under a minute;
// a minute or more goes to the next or previous whole minute (secondsStep)
const STEPS: Record<Exclude<SetField, "load">, number> = { reps: 1, seconds: 5 };

const MINUTE = 60;

// A 20-minute walk steps by the minute and a short hold by 5 s (#145): 55 s → 1 min → 2 min, and 1 min → 55 s
function secondsStep(seconds: number, direction: StepDirection): number {
  if (direction === 1 && seconds >= MINUTE) return (Math.floor(seconds / MINUTE) + 1) * MINUTE;
  if (direction === -1 && seconds > MINUTE) return (Math.ceil(seconds / MINUTE) - 1) * MINUTE;
  return seconds + STEPS.seconds * direction;
}

// The step when the equipment's loads aren't known (#58), a round number in each unit
const UNKNOWN_LOADS_STEP: Record<WeightUnit, number> = { kg: UNKNOWN_LOADS_STEP_KG, lb: 5 };

// From a load in the user's unit to the next lighter or heavier one, in the same unit
export type LoadStep = (load: number, direction: StepDirection) => number;

// Steps through the equipment's loads (kg, lightest first) as the user sees them, so a load whose kg is a hair off the
// one shown never sticks; by 5 lb or 2 kg when the loads aren't known
export function loadStep(loadsKg: number[], unit: WeightUnit): LoadStep {
  if (!loadsKg.length) return (load, direction) => Math.max(0, load + UNKNOWN_LOADS_STEP[unit] * direction);
  const loads = [...new Set(loadsKg.map((kg) => loadInUnit(kg, unit)))].sort((a, b) => a - b);
  return (load, direction) => stepLoadKg(load, direction, loads);
}

// For screen readers: with the equipment's loads known, a tap's size changes from load to load, so it isn't named
export function loadStepLabel(direction: StepDirection, loadsKnown: boolean, unit: WeightUnit): string {
  if (loadsKnown) return direction === 1 ? "Next heavier weight" : "Next lighter weight";
  return `${direction === 1 ? "Plus" : "Minus"} ${UNKNOWN_LOADS_STEP[unit]} ${unit}`;
}

// How a field's stepper reads and steps, one entry per field so the stepper doesn't branch on it. A load's depends on
// the equipment and the user's unit (loadStepper); a Jump's reps are its contacts (#105)
export type FieldStepper = {
  // The value drawn, the unit beside it, and the value's name for screen readers; as typed while typing
  shown: (text: string, typing: boolean) => { value: string; unit: string; name: string };
  // For screen readers, what one step adds or takes away
  stepLabel: (text: string, direction: StepDirection) => string;
  // The smallest amount it steps from, as it's shown
  resolution: number;
  next: (from: number, direction: StepDirection) => number;
  keyboardType: "decimal-pad" | "number-pad";
};

const asTyped = (unit: string) => (text: string) => ({ value: text, unit, name: unit });

// Reps, or a Jump's contacts, by 1
const countStepper = (one: string, many: string): FieldStepper => ({
  shown: asTyped(many),
  stepLabel: (_, direction) => `${direction === 1 ? "Plus" : "Minus"} ${STEPS.reps} ${one}`,
  resolution: 1,
  next: (from, direction) => from + STEPS.reps * direction,
  keyboardType: "number-pad",
});

export const FIELD_STEPPERS = {
  reps: countStepper("rep", "reps"),
  contacts: countStepper("contact", "contacts"),
  // In minutes from a minute (#145), as seconds while being typed
  seconds: {
    shown: (text, typing) => {
      const { value, unit } = typing ? { value: text, unit: "s" } : secondsField(text);
      return { value, unit, name: unit === "min" ? "minutes" : "seconds" };
    },
    stepLabel: secondsStepLabel,
    resolution: 1,
    next: secondsStep,
    keyboardType: "number-pad",
  },
} satisfies Record<string, FieldStepper>;

// A load to 0.5 of the user's unit, as it's shown, to the next load `step` gives
export const loadStepper = (step: LoadStep, loadsKnown: boolean, unit: WeightUnit): FieldStepper => ({
  shown: asTyped(unit),
  stepLabel: (_, direction) => loadStepLabel(direction, loadsKnown, unit),
  resolution: 0.5,
  next: step,
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

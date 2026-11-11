import { stepLoadKg, UNKNOWN_LOADS_STEP_KG, type StepDirection } from "@fit/engines";
import { loadInUnit, toKg, type LoadType, type SetValues, type WeightUnit } from "@fit/shared";

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

// A load has no fixed step: it goes to the next load the equipment has (loadStep)
export const STEPS: Record<Exclude<SetField, "load">, number> = { reps: 1, seconds: 5 };

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

// The smallest amount each field steps from: a load to 0.5 of the user's unit, as it's shown; reps and seconds whole
const RESOLUTION: Record<SetField, number> = { load: 0.5, reps: 1, seconds: 1 };

// A field's typed text as a number, reading a decimal comma as a point; NaN when empty or not a number
export function parseField(text: string): number {
  const trimmed = text.trim().replace(",", ".");
  return trimmed ? Number(trimmed) : NaN;
}

const roundTo = (value: number, resolution: number) => Math.round(value / resolution) * resolution;

// Steps from the typed value, first rounded to what the field steps from; from nothing when the field is empty or not
// a number; never below zero
export function stepValue(field: "load", text: string, direction: StepDirection, step: LoadStep): string;
export function stepValue(field: Exclude<SetField, "load">, text: string, direction: StepDirection): string;
export function stepValue(field: SetField, text: string, direction: StepDirection, step?: LoadStep): string {
  const typed = parseField(text);
  const from = Number.isFinite(typed) ? roundTo(typed, RESOLUTION[field]) : 0;
  const to = field === "load" ? step!(from, direction) : from + STEPS[field] * direction;
  return String(Math.max(0, to));
}

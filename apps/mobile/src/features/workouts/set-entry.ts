import type { LoadType, SetValues } from "@fit/shared";

// Entering a Set's values with −/+ steppers: what each step adds, and turning typed text into the values the
// Logbook checks (it owns the rules, such as 0.25 kg steps)

export type SetField = "kg" | "reps" | "seconds";

// The fields each Load Type asks for, in order
export const SET_FIELDS: Record<LoadType, SetField[]> = {
  external: ["kg", "reps"],
  bodyweight: ["reps"],
  timed: ["seconds"],
};

// What's typed in each field
export type SetDraft = Partial<Record<SetField, string>>;

// The fields filled from `from` (the previous Set, or the Set being edited), or empty
export function setDraft(loadType: LoadType, from: SetValues | null): SetDraft {
  const values: Partial<Record<SetField, number>> = from ?? {};
  return Object.fromEntries(SET_FIELDS[loadType].map((field) => [field, String(values[field] ?? "")]));
}

// The draft as a Set's values, or what's missing. Typed numbers pass as they are: the Logbook checks the rest
export function draftValues(loadType: LoadType, draft: SetDraft): { values: SetValues } | { error: string } {
  const fields = SET_FIELDS[loadType];
  const numbers = fields.map((field) => [field, parseField(draft[field] ?? "")] as const);
  if (numbers.some(([, value]) => !Number.isFinite(value))) return { error: `Enter ${fields.join(" and ")}` };
  return { values: { kind: loadType, ...Object.fromEntries(numbers) } as SetValues };
}

// One tap of − or + for reps and seconds. kg goes to the next load the Logbook gives (Logbook.nextLoadKg)
export const STEPS: Record<Exclude<SetField, "kg">, number> = { reps: 1, seconds: 5 };

// The kg after one tap of − (-1) or + (1) from `kg`
export type KgStep = (kg: number, direction: 1 | -1) => number;

// The smallest amount each field records: weights in 0.25 kg steps, reps and seconds whole
const RESOLUTION: Record<SetField, number> = { kg: 0.25, reps: 1, seconds: 1 };

// A field's typed text as a number, reading a decimal comma as a point; NaN when empty or not a number
export function parseField(text: string): number {
  const trimmed = text.trim().replace(",", ".");
  return trimmed ? Number(trimmed) : NaN;
}

const roundTo = (value: number, resolution: number) => Math.round(value / resolution) * resolution;

// The field's text after one tap of − (-1) or + (1): kg by `stepKg`, reps and seconds by STEPS. Steps from the typed
// value, first rounded to what the field records; from nothing when the field is empty or not a number; never below
// zero
export function stepValue(field: SetField, text: string, direction: 1 | -1, stepKg: KgStep): string {
  const typed = parseField(text);
  const from = Number.isFinite(typed) ? roundTo(typed, RESOLUTION[field]) : 0;
  const to = field === "kg" ? stepKg(from, direction) : from + STEPS[field] * direction;
  return String(Math.max(0, to));
}

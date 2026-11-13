import {
  BAND_TAGS,
  BandLevel,
  DEFAULT_CABLE_STEP,
  fromKg,
  toKg,
  type EquipmentProfile,
  type EquipmentTag,
  type WeightUnit,
} from "@fit/shared";
import { z } from "zod";

// The equipment the weights stage asks about
export const loadTags = ["dumbbells", "kettlebells", "barbell", ...BAND_TAGS, "cable_machine"] as const;
export type LoadTag = (typeof loadTags)[number];

export const bandLevelLabels: Record<BandLevel, string> = {
  light: "Light",
  medium: "Medium",
  heavy: "Heavy",
  extra_heavy: "Extra heavy",
};

// A weights stage holds this many rows of questions and still fits on the smallest phone (#71)
const MAX_LOAD_ROWS = 3;

// Dumbbells ask their kind then their weights; a barbell asks its weight then the plates
const loadRows = (tag: LoadTag, tags: EquipmentTag[]) =>
  tag === "dumbbells" || (tag === "barbell" && tags.includes("plates")) ? 2 : 1;

// The equipment each weights stage asks about, in order, moving to another stage only when the next piece won't fit.
// Plates go with their barbell. Empty when there's nothing to ask
export function loadScreens(tags: EquipmentTag[]): EquipmentTag[][] {
  const screens: { rows: number; tags: EquipmentTag[] }[] = [];
  for (const tag of loadTags.filter((tag) => tags.includes(tag))) {
    const rows = loadRows(tag, tags);
    const screenTags: EquipmentTag[] = tag === "barbell" && tags.includes("plates") ? [tag, "plates"] : [tag];
    const last = screens.at(-1);
    if (last && last.rows + rows <= MAX_LOAD_ROWS) {
      last.rows += rows;
      last.tags.push(...screenTags);
    } else {
      screens.push({ rows, tags: screenTags });
    }
  }
  return screens.map((screen) => screen.tags);
}

type LoadOptions = { dumbbells: number[]; kettlebells: number[]; bar: number[]; plates: number[] };

// Common sizes offered in the dropdowns, in each unit's own sizes
const LOAD_OPTIONS: Record<WeightUnit, LoadOptions> = {
  kg: {
    dumbbells: [
      1, 2, 2.5, 3, 4, 5, 6, 7, 7.5, 8, 9, 10, 12, 12.5, 14, 15, 16, 17.5, 18, 20, 22, 22.5, 24, 25, 26, 27.5, 28, 30,
      32, 32.5, 34, 35, 36, 37.5, 40, 45, 50,
    ],
    kettlebells: [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 44, 48],
    bar: [7, 10, 15, 20],
    plates: [0.5, 1.25, 2.5, 5, 10, 15, 20, 25],
  },
  lb: {
    dumbbells: [
      2, 3, 5, 8, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 120,
    ],
    kettlebells: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 100],
    bar: [15, 25, 35, 45],
    plates: [2.5, 5, 10, 25, 35, 45],
  },
};

export const loadOptions = (unit: WeightUnit) => LOAD_OPTIONS[unit];

// The form's weights are in the user's unit; the profile stores kg (#126)
const optionalWeight = z
  .number({ error: "Enter a weight" })
  .positive("Must be more than 0")
  .max(200, "Must be 200 or less")
  .optional();

// Dropdown and chip values are strings; they become numbers when saved
const weightChoices = z.array(z.string()).optional();
const bandChoices = z.object({ levels: z.array(BandLevel).optional() }).optional();

// Everything is optional: anything left blank is just not saved
export const LoadsForm = z.object({
  dumbbells: z
    .object({
      kind: z.enum(["adjustable", "fixed"]).optional(),
      min: optionalWeight,
      max: optionalWeight,
      step: optionalWeight,
      weights: weightChoices,
    })
    .superRefine((d, ctx) => {
      if (d.kind !== "adjustable") return;
      for (const key of ["min", "max", "step"] as const) {
        if (d[key] == null) ctx.addIssue({ code: "custom", path: [key], message: "Required" });
      }
      if (d.min != null && d.max != null && d.min >= d.max) {
        ctx.addIssue({ code: "custom", path: ["max"], message: "Must be more than the lightest" });
      }
    })
    .optional(),
  kettlebells: z.object({ weights: weightChoices }).optional(),
  barbell: z.object({ bar: z.string().optional(), plates: weightChoices }).optional(),
  loop_bands: bandChoices,
  mini_bands: bandChoices,
  tube_bands: bandChoices,
  // The Load Step of a cable or machine, which lists no loads
  cable_machine: z.object({ step: optionalWeight }).optional(),
});
export type LoadsForm = z.infer<typeof LoadsForm>;

// A weight in the form as kg, exactly (toKg), and back. Back is to the nearest 0.25, which shows a load entered in
// pounds as entered and keeps a 1.25 kg plate
const formWeight = (kg: number, unit: WeightUnit) => Math.round(fromKg(kg, unit) * 4) / 4;
const toKgs = (values: string[] | undefined, unit: WeightUnit) =>
  (values ?? []).map((value) => toKg(Number(value), unit)).sort((a, b) => a - b);
const toStrings = (values: number[] | undefined, unit: WeightUnit) => values?.map((kg) => String(formWeight(kg, unit)));

// Keeps only the answers for equipment still selected, so a half-filled entry for
// something since deselected can't block the form
export function pruneLoads(loads: LoadsForm, tags: EquipmentTag[]): LoadsForm {
  return Object.fromEntries(Object.entries(loads).filter(([tag]) => tags.includes(tag as EquipmentTag)));
}

// Form answers in the user's unit -> the profile's loads in kg, for the selected equipment only
export function toLoads(form: LoadsForm, tags: EquipmentTag[], unit: WeightUnit): EquipmentProfile["loads"] {
  const has = (tag: EquipmentTag) => tags.includes(tag);
  const loads: EquipmentProfile["loads"] = {};

  const { dumbbells, kettlebells, barbell } = form;
  if (has("dumbbells") && dumbbells?.kind === "adjustable") {
    const { min, max, step } = dumbbells;
    if (min != null && max != null && step != null)
      loads.dumbbells = {
        kind: "adjustable",
        minKg: toKg(min, unit),
        maxKg: toKg(max, unit),
        stepKg: toKg(step, unit),
      };
  }
  if (has("dumbbells") && dumbbells?.kind === "fixed" && dumbbells.weights?.length) {
    loads.dumbbells = { kind: "fixed", weightsKg: toKgs(dumbbells.weights, unit) };
  }
  if (has("kettlebells") && kettlebells?.weights?.length) {
    loads.kettlebells = { weightsKg: toKgs(kettlebells.weights, unit) };
  }
  if (has("barbell") && barbell?.bar) {
    loads.barbell = {
      barKg: toKg(Number(barbell.bar), unit),
      platesKg: has("plates") ? toKgs(barbell.plates, unit) : [],
    };
  }
  for (const tag of BAND_TAGS) {
    const levels = form[tag]?.levels;
    if (has(tag) && levels?.length) loads[tag] = { levels };
  }
  const cableStep = form.cable_machine?.step;
  if (has("cable_machine") && cableStep != null) loads.cable_machine = { stepKg: toKg(cableStep, unit) };
  return loads;
}

// The profile's loads in kg -> form answers in the user's unit, for prefilling when editing
export function toLoadsForm(loads: EquipmentProfile["loads"] = {}, unit: WeightUnit): LoadsForm {
  const { dumbbells, kettlebells, barbell } = loads;
  return {
    dumbbells:
      dumbbells?.kind === "adjustable"
        ? {
            kind: "adjustable",
            min: formWeight(dumbbells.minKg, unit),
            max: formWeight(dumbbells.maxKg, unit),
            step: formWeight(dumbbells.stepKg, unit),
          }
        : dumbbells && { kind: "fixed", weights: toStrings(dumbbells.weightsKg, unit) },
    kettlebells: kettlebells && { weights: toStrings(kettlebells.weightsKg, unit) },
    barbell: barbell && { bar: String(formWeight(barbell.barKg, unit)), plates: toStrings(barbell.platesKg, unit) },
    loop_bands: loads.loop_bands,
    mini_bands: loads.mini_bands,
    tube_bands: loads.tube_bands,
    // A profile with no step yet starts at the default in the user's unit
    cable_machine: {
      step: loads.cable_machine ? formWeight(loads.cable_machine.stepKg, unit) : DEFAULT_CABLE_STEP[unit],
    },
  };
}

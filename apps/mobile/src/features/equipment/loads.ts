import { BAND_TAGS, BandLevel, type EquipmentProfile, type EquipmentTag } from "@fit/shared";
import { z } from "zod";

// The equipment the weights stage asks about
export const loadTags = ["dumbbells", "kettlebells", "barbell", ...BAND_TAGS] as const;
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

// Common sizes offered in the dropdowns
export const dumbbellWeightsKg = [
  1, 2, 2.5, 3, 4, 5, 6, 7, 7.5, 8, 9, 10, 12, 12.5, 14, 15, 16, 17.5, 18, 20, 22, 22.5, 24, 25, 26, 27.5, 28, 30, 32,
  32.5, 34, 35, 36, 37.5, 40, 45, 50,
];
export const kettlebellWeightsKg = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 44, 48];
export const barWeightsKg = [7, 10, 15, 20];
export const plateWeightsKg = [0.5, 1.25, 2.5, 5, 10, 15, 20, 25];

const optionalKg = z
  .number({ error: "Enter a weight in kg" })
  .positive("Must be more than 0")
  .max(200, "Must be 200 kg or less")
  .optional();

// Dropdown and chip values are strings; they become numbers when saved
const weightChoices = z.array(z.string()).optional();
const bandChoices = z.object({ levels: z.array(BandLevel).optional() }).optional();

// Everything is optional: anything left blank is just not saved
export const LoadsForm = z.object({
  dumbbells: z
    .object({
      kind: z.enum(["adjustable", "fixed"]).optional(),
      minKg: optionalKg,
      maxKg: optionalKg,
      stepKg: optionalKg,
      weightsKg: weightChoices,
    })
    .superRefine((d, ctx) => {
      if (d.kind !== "adjustable") return;
      for (const key of ["minKg", "maxKg", "stepKg"] as const) {
        if (d[key] == null) ctx.addIssue({ code: "custom", path: [key], message: "Required" });
      }
      if (d.minKg != null && d.maxKg != null && d.minKg >= d.maxKg) {
        ctx.addIssue({ code: "custom", path: ["maxKg"], message: "Must be more than the lightest" });
      }
    })
    .optional(),
  kettlebells: z.object({ weightsKg: weightChoices }).optional(),
  barbell: z.object({ barKg: z.string().optional(), platesKg: weightChoices }).optional(),
  loop_bands: bandChoices,
  mini_bands: bandChoices,
  tube_bands: bandChoices,
});
export type LoadsForm = z.infer<typeof LoadsForm>;

const toNumbers = (values?: string[]) => (values ?? []).map(Number).sort((a, b) => a - b);
const toStrings = (values?: number[]) => values?.map(String);

// Keeps only the answers for equipment still selected, so a half-filled entry for
// something since deselected can't block the form
export function pruneLoads(loads: LoadsForm, tags: EquipmentTag[]): LoadsForm {
  return Object.fromEntries(Object.entries(loads).filter(([tag]) => tags.includes(tag as EquipmentTag)));
}

// Form answers -> the profile's loads, for the selected equipment only
export function toLoads(form: LoadsForm, tags: EquipmentTag[]): EquipmentProfile["loads"] {
  const has = (tag: EquipmentTag) => tags.includes(tag);
  const loads: EquipmentProfile["loads"] = {};

  const { dumbbells, kettlebells, barbell } = form;
  if (has("dumbbells") && dumbbells?.kind === "adjustable") {
    const { minKg, maxKg, stepKg } = dumbbells;
    if (minKg != null && maxKg != null && stepKg != null)
      loads.dumbbells = { kind: "adjustable", minKg, maxKg, stepKg };
  }
  if (has("dumbbells") && dumbbells?.kind === "fixed" && dumbbells.weightsKg?.length) {
    loads.dumbbells = { kind: "fixed", weightsKg: toNumbers(dumbbells.weightsKg) };
  }
  if (has("kettlebells") && kettlebells?.weightsKg?.length) {
    loads.kettlebells = { weightsKg: toNumbers(kettlebells.weightsKg) };
  }
  if (has("barbell") && barbell?.barKg) {
    loads.barbell = { barKg: Number(barbell.barKg), platesKg: has("plates") ? toNumbers(barbell.platesKg) : [] };
  }
  for (const tag of BAND_TAGS) {
    const levels = form[tag]?.levels;
    if (has(tag) && levels?.length) loads[tag] = { levels };
  }
  return loads;
}

// The profile's loads -> form answers, for prefilling when editing
export function toLoadsForm(loads: EquipmentProfile["loads"] = {}): LoadsForm {
  const { dumbbells, kettlebells, barbell } = loads;
  return {
    dumbbells:
      dumbbells?.kind === "adjustable"
        ? { ...dumbbells }
        : dumbbells && { kind: "fixed", weightsKg: toStrings(dumbbells.weightsKg) },
    kettlebells: kettlebells && { weightsKg: toStrings(kettlebells.weightsKg) },
    barbell: barbell && { barKg: String(barbell.barKg), platesKg: toStrings(barbell.platesKg) },
    loop_bands: loads.loop_bands,
    mini_bands: loads.mini_bands,
    tube_bands: loads.tube_bands,
  };
}

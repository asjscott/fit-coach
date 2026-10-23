import { z } from "zod";

export const PRESETS: { name: string; tags: EquipmentTag[] }[] = [
  { name: "Bodyweight only", tags: [] },
  { name: "Minimal: bar + bands", tags: ["pull_up_bar", "loop_bands"] },
  { name: "Dumbbells + bench", tags: ["dumbbells", "adjustable_bench"] },
  { name: "Kettlebells", tags: ["kettlebells"] },
  { name: "Full home gym", tags: ["barbell", "plates", "power_rack", "adjustable_bench", "dumbbells", "pull_up_bar"] },
];

export const EQUIPMENT_LABELS: Record<EquipmentTag, string> = {
  // Free weights (8)
  dumbbells: "Dumbbells",
  kettlebells: "Kettlebells",
  barbell: "Barbell",
  plates: "Weight plates",
  ez_bar: "EZ curl bar",
  weight_vest: "Weight vest",
  medicine_ball: "Medicine ball",
  slam_ball: "Slam ball",

  // Benches and racks (5)
  flat_bench: "Flat bench",
  adjustable_bench: "Adjustable bench",
  squat_rack: "Squat rack",
  power_rack: "Power rack",
  landmine: "Landmine",

  // Bodyweight stations (8)
  pull_up_bar: "Pull-up bar",
  rings: "Gymnastic rings",
  dip_station: "Dip station",
  parallettes: "Parallettes",
  suspension_trainer: "Suspension trainer (TRX)",
  plyo_box: "Plyo box",
  ab_wheel: "Ab wheel",
  sliders: "Sliders",

  // Bands and cables (4)
  loop_bands: "Loop bands",
  mini_bands: "Mini bands",
  tube_bands: "Tube bands with handles",
  cable_machine: "Cable machine",

  // Cardio and recovery (6)
  jump_rope: "Jump rope",
  stationary_bike: "Stationary bike",
  rower: "Rowing machine",
  treadmill: "Treadmill",
  air_bike: "Air bike",
  foam_roller: "Foam roller",
};

export const EQUIPMENT_GROUPS = [
  { key: "free_weights", name: "Free weights", tags: ["dumbbells", "kettlebells", "barbell", "plates", "ez_bar", "weight_vest", "medicine_ball", "slam_ball"] },
  { key: "benches_racks", name: "Benches and racks", tags: ["flat_bench", "adjustable_bench", "squat_rack", "power_rack", "landmine"] },
  { key: "bodyweight", name: "Bodyweight stations", tags: ["pull_up_bar", "rings", "dip_station", "parallettes", "suspension_trainer", "plyo_box", "ab_wheel", "sliders"] },
  { key: "bands_cables", name: "Bands and cables", tags: ["loop_bands", "mini_bands", "tube_bands", "cable_machine"] },
  { key: "cardio_recovery", name: "Cardio and recovery", tags: ["jump_rope", "stationary_bike", "rower", "treadmill", "air_bike", "foam_roller"] },
] as const satisfies readonly { key: string; name: string; tags: readonly EquipmentTag[] }[];
export type EquipmentGroupKey = (typeof EQUIPMENT_GROUPS)[number]["key"];

export const EquipmentTag = z.enum([
  // Free weights
  "dumbbells", "kettlebells", "barbell", "plates", "ez_bar", "weight_vest", "medicine_ball", "slam_ball",
  // Benches and racks
  "flat_bench", "adjustable_bench", "squat_rack", "power_rack", "landmine",
  // Bodyweight stations
  "pull_up_bar", "rings", "dip_station", "parallettes", "suspension_trainer", "plyo_box", "ab_wheel", "sliders",
  // Bands and cables
  "loop_bands", "mini_bands", "tube_bands", "cable_machine",
  // Cardio and recovery
  "jump_rope", "stationary_bike", "rower", "treadmill", "air_bike", "foam_roller",
]);
export type EquipmentTag = z.infer<typeof EquipmentTag>;

const kg = z.number().positive().max(200);

export const DumbbellLoads = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("adjustable"), minKg: kg, maxKg: kg, stepKg: kg }),
  z.object({ kind: z.literal("fixed"), weightsKg: z.array(kg).min(1) }),
]);

export const BandLevel = z.enum(["light", "medium", "heavy", "extra_heavy"]);

export const EquipmentProfile = z.object({
  id: z.string(),
  name: z.string().min(1).max(40),
  location: z.enum(["gym", "home", "outdoors"]),
  isPrimary: z.boolean(),
  tags: z.array(EquipmentTag),
  loads: z
    .object({
      dumbbells: DumbbellLoads.optional(),
      kettlebells: z.object({ weightsKg: z.array(kg).min(1) }).optional(),
      loop_bands: z.object({ levels: z.array(BandLevel).min(1) }).optional(),
    })
    .default({}),
});
export type EquipmentProfile = z.infer<typeof EquipmentProfile>;

// Body for creating or updating an equipment profile; the server owns the id
export const EquipmentProfileInput = EquipmentProfile.omit({ id: true });
export type EquipmentProfileInput = z.infer<typeof EquipmentProfileInput>;

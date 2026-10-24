import { z } from "zod";
import { InjuryTag } from "./user";
import { EquipmentTag } from "./equipment";

export const Pattern = z.enum(["squat", "hinge", "push", "pull", "carry", "core"]);
export type Pattern = z.infer<typeof Pattern>;
export const Muscle = z.enum([
  "quads", "hamstrings", "glutes", "adductors", "calves", "chest", "front_delts", "side_delts",
  "rear_delts", "lats", "upper_back", "traps", "biceps", "triceps", "forearms", "abs", "obliques", "lower_back",
]);
export type Muscle = z.infer<typeof Muscle>;
export const LoadType = z.enum(["external", "bodyweight", "timed"]);
export type LoadType = z.infer<typeof LoadType>;

export const Exercise = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),            // stable ID, e.g. "goblet-squat"
  name: z.string(),
  patterns: z.array(z.object({ pattern: Pattern, credit: z.number().min(0).max(1) })).min(1),
  muscles: z.object({ primary: z.array(Muscle).min(1), secondary: z.array(Muscle) }),
  equipmentOptions: z.array(z.array(EquipmentTag)).min(1), // any one option works; [[]] = no equipment
  loadType: LoadType,
  unilateral: z.boolean(),
  secondsPerSet: z.number().int().positive(),           // including rest
  regression: z.string().nullable(),                   // slug of the easier variant
  progression: z.string().nullable(),                  // slug of the harder variant
  avoidWith: z.array(InjuryTag),
  cues: z.array(z.string()).max(3),
  videoUrl: z.url().nullable(),
});
export type Exercise = z.infer<typeof Exercise>;
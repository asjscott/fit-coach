import {
  EQUIPMENT_GROUPS,
  EquipmentTag,
  type EquipmentGroupKey,
  type EquipmentProfile,
  type EquipmentProfileInput,
} from "@fit/shared";
import { z } from "zod";

// How the user answered "Where do you train?"; each maps onto one equipment profile
export const TrainingSetup = z.enum(["gym", "home", "bodyweight"], { error: "Choose where you train" });
export type TrainingSetup = z.infer<typeof TrainingSetup>;

// Selected tags keyed by equipment group, one dropdown per group
export const EquipmentByGroup = z.partialRecord(z.string(), z.array(EquipmentTag));
export type EquipmentByGroup = Partial<Record<EquipmentGroupKey, EquipmentTag[]>>;

// The groups a user picks from for each setup; gym has everything, so there is nothing to pick
export const selectableGroups: Record<TrainingSetup, EquipmentGroupKey[]> = {
  gym: [],
  home: EQUIPMENT_GROUPS.map((g) => g.key),
  bodyweight: ["bodyweight"],
};

const setupProfiles: Record<TrainingSetup, Pick<EquipmentProfile, "name" | "location">> = {
  gym: { name: "Gym", location: "gym" },
  home: { name: "Home", location: "home" },
  bodyweight: { name: "Bodyweight only", location: "home" },
};

const bodyweightTags: readonly EquipmentTag[] = EQUIPMENT_GROUPS.find((g) => g.key === "bodyweight")!.tags;

// Body for saving the user's primary equipment profile; the server owns the id
export function toEquipmentInput(
  setup: TrainingSetup,
  equipment: EquipmentByGroup,
  existing?: EquipmentProfile,
): EquipmentProfileInput {
  // Groups picked under another setup before switching are dropped
  const tags =
    setup === "gym" ? EquipmentTag.options : selectableGroups[setup].flatMap((key) => equipment[key] ?? []);
  return { ...setupProfiles[setup], isPrimary: true, tags, loads: existing?.loads ?? {} };
}

// Reverse of toEquipmentInput, for prefilling the form when editing
export function toTrainingSetup(profile: EquipmentProfile): TrainingSetup {
  if (profile.location === "gym") return "gym";
  return profile.tags.every((tag) => bodyweightTags.includes(tag)) ? "bodyweight" : "home";
}

export function groupTags(tags: EquipmentTag[]): EquipmentByGroup {
  return Object.fromEntries(
    EQUIPMENT_GROUPS.map((group) => [group.key, tags.filter((tag) => (group.tags as readonly EquipmentTag[]).includes(tag))]),
  );
}

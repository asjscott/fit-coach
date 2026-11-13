import {
  EQUIPMENT_GROUPS,
  EquipmentTag,
  type EquipmentGroupKey,
  type EquipmentProfile,
  type EquipmentProfileInput,
  type WeightUnit,
} from "@fit/shared";
import { z } from "zod";
import { toLoads, type LoadsForm } from "./loads";

// How the user answered "Where do you train?"; each maps onto one equipment profile
export const TrainingSetup = z.enum(["gym", "home", "bodyweight", "none"], { error: "Choose where you train" });
export type TrainingSetup = z.infer<typeof TrainingSetup>;

// Selected tags keyed by equipment group, one dropdown per group
export const EquipmentByGroup = z.partialRecord(z.string(), z.array(EquipmentTag));
export type EquipmentByGroup = Partial<Record<EquipmentGroupKey, EquipmentTag[]>>;

// The groups a user picks from for each setup; gym has everything, so there is nothing to pick
export const selectableGroups: Record<TrainingSetup, EquipmentGroupKey[]> = {
  gym: [],
  home: EQUIPMENT_GROUPS.map((g) => g.key),
  bodyweight: ["bodyweight"],
  none: [],
};

const setupProfiles: Record<TrainingSetup, Pick<EquipmentProfile, "name" | "location">> = {
  gym: { name: "Gym", location: "gym" },
  home: { name: "Home", location: "home" },
  bodyweight: { name: "Bodyweight only", location: "home" },
  none: { name: "No equipment", location: "home" },
};

const bodyweightTags: readonly EquipmentTag[] = EQUIPMENT_GROUPS.find((g) => g.key === "bodyweight")!.tags;

// The tags a setup ends up with; groups picked under another setup before switching are dropped
export function selectedTags(setup: TrainingSetup | undefined, equipment: EquipmentByGroup = {}): EquipmentTag[] {
  if (!setup) return [];
  if (setup === "gym") return EquipmentTag.options;
  return selectableGroups[setup].flatMap((key) => equipment[key] ?? []);
}

// The equipment whose weights a setup asks for. Home users are asked about everything selected. A gym is asked only
// for its cable and machine step, as it has Full gym's standard weights; the other setups have none
export function loadTagsAsked(setup: TrainingSetup | undefined, tags: EquipmentTag[]): EquipmentTag[] {
  if (setup === "home") return tags;
  if (setup === "gym") return tags.filter((tag) => tag === "cable_machine");
  return [];
}

// Body for saving the user's primary equipment profile; the server owns the id
export function toEquipmentInput(
  setup: TrainingSetup,
  equipment: EquipmentByGroup,
  loads: LoadsForm,
  unit: WeightUnit,
): EquipmentProfileInput {
  const tags = selectedTags(setup, equipment);
  return {
    ...setupProfiles[setup],
    isPrimary: true,
    tags,
    loads: toLoads(loads, loadTagsAsked(setup, tags), unit),
  };
}

// Reverse of toEquipmentInput, for prefilling the form when editing
export function toTrainingSetup(profile: EquipmentProfile): TrainingSetup {
  if (profile.location === "gym") return "gym";
  if (profile.tags.length === 0) return "none";
  return profile.tags.every((tag) => bodyweightTags.includes(tag)) ? "bodyweight" : "home";
}

export function groupTags(tags: EquipmentTag[]): EquipmentByGroup {
  return Object.fromEntries(
    EQUIPMENT_GROUPS.map((group) => [
      group.key,
      tags.filter((tag) => (group.tags as readonly EquipmentTag[]).includes(tag)),
    ]),
  );
}

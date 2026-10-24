import type { EquipmentTag, Exercise, InjuryTag } from "@fit/shared";
import { isAvailable, isSafeFor } from "./equipment";

export type PickerRow = {
  exercise: Exercise;
  // The primary equipment profile supports it
  available: boolean;
  // Flagged against the user's injuries; still selectable, just marked
  flagged: boolean;
};

export type PickerOptions = {
  // Tags of the primary equipment profile; none counts as no equipment
  tags: EquipmentTag[];
  injuries: InjuryTag[];
  // Matches anywhere in the name, ignoring case; blank lists everything
  search?: string;
};

// The exercise picker's list: Exercises the equipment supports first, then the rest
export function pickerRows(exercises: Exercise[], { tags, injuries, search = "" }: PickerOptions): PickerRow[] {
  // Case-insensitive, so "barbell" and "Barbell" sort together
  const term = search.trim().toLowerCase();
  const matches = term ? exercises.filter((e) => e.name.toLowerCase().includes(term)) : exercises;
  const byName = [...matches].sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
  const rows = byName.map((exercise) => ({
    exercise,
    available: isAvailable(exercise, { tags }),
    flagged: !isSafeFor(exercise, injuries),
  }));
  return [...rows.filter((row) => row.available), ...rows.filter((row) => !row.available)];
}

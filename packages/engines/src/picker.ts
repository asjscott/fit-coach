import type { Exercise, InjuryTag } from "@fit/shared";
import { isAvailable, isSafeFor, type ProfileWithLoads } from "./equipment";

export type PickerRow = {
  exercise: Exercise;
  // The primary equipment profile supports it
  available: boolean;
  // Flagged against the user's injuries; still selectable, just marked
  flagged: boolean;
};

export type PickerOptions = {
  // The primary equipment profile; a user without one has NO_EQUIPMENT
  equipmentProfile: ProfileWithLoads;
  injuries: InjuryTag[];
  // Matches anywhere in the name, ignoring case; blank lists everything
  search?: string;
};

// The exercise picker's list: Exercises the equipment supports first, then the rest
export function pickerRows(
  exercises: Exercise[],
  { equipmentProfile, injuries, search = "" }: PickerOptions,
): PickerRow[] {
  // Case-insensitive, so "barbell" and "Barbell" sort together
  const term = search.trim().toLowerCase();
  const matches = term ? exercises.filter((e) => e.name.toLowerCase().includes(term)) : exercises;
  const byName = [...matches].sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
  const rows = byName.map((exercise) => ({
    exercise,
    available: isAvailable(exercise, equipmentProfile),
    flagged: !isSafeFor(exercise, injuries),
  }));
  return [...rows.filter((row) => row.available), ...rows.filter((row) => !row.available)];
}

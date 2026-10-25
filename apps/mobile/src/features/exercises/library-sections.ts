import { isAvailable } from "@fit/engines";
import { Pattern, type EquipmentTag, type Exercise } from "@fit/shared";
import { patternLabels } from "./labels";

export type LibraryRow = {
  exercise: Exercise;
  // The primary equipment profile supports it
  available: boolean;
};

export type LibrarySection = { title: string; data: LibraryRow[] };

// The Exercises tab's list: one group per movement pattern, in Pattern order, each Exercise under
// its first pattern. Unless showing all, only what the equipment supports is listed
export function librarySections(
  exercises: Exercise[],
  { tags, showAll }: { tags: EquipmentTag[]; showAll: boolean },
): { sections: LibrarySection[]; availableCount: number; total: number } {
  const rows = exercises.map((exercise) => ({ exercise, available: isAvailable(exercise, { tags }) }));
  const shown = showAll ? rows : rows.filter((row) => row.available);
  const sections = Pattern.options
    .map((pattern) => ({
      title: patternLabels[pattern],
      data: shown.filter((row) => row.exercise.patterns[0].pattern === pattern),
    }))
    .filter((section) => section.data.length > 0);
  return { sections, availableCount: rows.filter((row) => row.available).length, total: rows.length };
}

import { availableLoadsKg, isAvailable, roundToLoadKg } from "@fit/engines";
import { Pattern, type EquipmentProfile, type WorkingLevel } from "@fit/shared";
import { bandLevelLabels } from "@/features/equipment/loads";
import { patternLabels } from "@/features/exercises/labels";
import { exerciseName, libraryExercise } from "@/features/workouts/library";

export type WorkingLevelRow = { slug: string; name: string; label: string };
export type WorkingLevelSection = { title: string; rows: WorkingLevelRow[] };

const kgLabel = (kg: number) => `${kg.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg`;

// "12.5 kg × 8", "14 reps", "45 s" or "Medium band × 12", with kg rounded to a load the profile has
function workingLevelLabel(level: WorkingLevel, loadsKg: number[]): string {
  switch (level.unit) {
    case "kg":
      return `${kgLabel(roundToLoadKg(level.kg, loadsKg))} × 8`;
    case "reps":
      return `${level.reps} reps`;
    case "seconds":
      return `${Math.round(level.seconds)} s`;
    case "band":
      return `${bandLevelLabels[level.level]} band × ${level.reps}`;
  }
}

// The starting Working Levels for what the primary Equipment Profile supports, one section per Pattern in Pattern
// order, each Exercise under its first Pattern
export function workingLevelSections(
  workingLevels: WorkingLevel[],
  primary: Pick<EquipmentProfile, "tags" | "loads">,
): WorkingLevelSection[] {
  const rows = workingLevels.flatMap((level) => {
    const exercise = libraryExercise(level.slug);
    if (!exercise || !isAvailable(exercise, primary)) return [];
    const row = {
      slug: level.slug,
      name: exerciseName(level.slug),
      label: workingLevelLabel(level, availableLoadsKg(exercise, primary)),
    };
    return [{ pattern: exercise.patterns[0].pattern, row }];
  });
  return Pattern.options
    .map((pattern) => ({
      title: patternLabels[pattern],
      rows: rows.filter((r) => r.pattern === pattern).map((r) => r.row),
    }))
    .filter((section) => section.rows.length > 0);
}

import { Pattern, type Assessment, type Exercise, type InjuryTag, type WorkingLevel } from "@fit/shared";
import { referencePatternOf } from "./assessment-tests";
import { exerciseBySlug } from "./data/exercises";
import { isAvailable, isSafeFor, roundToLoadKg, type ProfileWithLoads } from "./equipment";

// One Pattern's starting Working Levels on the Results. Estimated: the Pattern they follow from wasn't tested
export type WorkingLevelSection = { pattern: Pattern; estimated: boolean; workingLevels: WorkingLevel[] };

// As the user would do it: kg rounded to a load the profile has, seconds to whole ones
function asDone(level: WorkingLevel, exercise: Exercise, equipmentProfile: ProfileWithLoads): WorkingLevel {
  if (level.unit === "kg") return { ...level, kg: roundToLoadKg(level.kg, exercise, equipmentProfile) };
  if (level.unit === "seconds") return { ...level, seconds: Math.round(level.seconds) };
  return level;
}

// The Working Levels for what the Equipment Profile supports and the injuries allow, one section per Pattern in
// Pattern order, each Exercise under its first Pattern
export function workingLevelSections(
  workingLevels: WorkingLevel[],
  equipmentProfile: ProfileWithLoads,
  patterns: Assessment["patterns"],
  injuries: InjuryTag[],
): WorkingLevelSection[] {
  const placed = workingLevels.flatMap((level) => {
    const exercise = exerciseBySlug(level.slug);
    if (!exercise || !isAvailable(exercise, equipmentProfile) || !isSafeFor(exercise, injuries)) return [];
    return [{ pattern: exercise.patterns[0].pattern, workingLevel: asDone(level, exercise, equipmentProfile) }];
  });
  return Pattern.options
    .map((pattern) => ({
      pattern,
      estimated: patterns[referencePatternOf(pattern)]?.estimated ?? false,
      workingLevels: placed.filter((p) => p.pattern === pattern).map((p) => p.workingLevel),
    }))
    .filter((section) => section.workingLevels.length > 0);
}

import { Pattern, type Assessment, type Exercise, type InjuryTag, type WorkingLevel } from "@fit/shared";
import { referencePatternOf } from "./assessment-tests";
import { exerciseBySlug } from "./data/exercises";
import {
  availableLoadsKg,
  isAvailable,
  isSafeFor,
  isUnderEmptyBar,
  roundToLoadKg,
  type ProfileWithLoads,
} from "./equipment";

// One Pattern's starting Working Levels on the Results. Estimated: the Pattern they follow from wasn't tested
export type WorkingLevelSection = { pattern: Pattern; estimated: boolean; workingLevels: WorkingLevel[] };

// As the user would do it: kg rounded to a load the profile has, seconds to whole ones. null for a barbell Exercise
// whose Working Level is lighter than the bar (#70)
export function asDone(
  level: WorkingLevel,
  exercise: Pick<Exercise, "equipmentOptions">,
  equipmentProfile: ProfileWithLoads,
): WorkingLevel | null {
  if (level.unit === "seconds") return { ...level, seconds: Math.round(level.seconds) };
  if (level.unit !== "kg") return level;
  if (isUnderEmptyBar(level.kg, exercise, equipmentProfile)) return null;
  return { ...level, kg: roundToLoadKg(level.kg, availableLoadsKg(exercise, equipmentProfile)) };
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
    const workingLevel = asDone(level, exercise, equipmentProfile);
    return workingLevel ? [{ pattern: exercise.patterns[0].pattern, workingLevel }] : [];
  });
  return Pattern.options
    .map((pattern) => ({
      pattern,
      estimated: patterns[referencePatternOf(pattern)]?.estimated ?? false,
      workingLevels: placed.filter((p) => p.pattern === pattern).map((p) => p.workingLevel),
    }))
    .filter((section) => section.workingLevels.length > 0);
}

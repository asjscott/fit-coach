import type { WeightUnit, WorkingLevel } from "@fit/shared";
import { setTargetLabel } from "@/features/workouts/format";

// "12.5 kg × 8", "14 reps", "45 s" or "Medium band × 10", once workingLevelSections has rounded it to the equipment
// The load is in the user's unit
export const workingLevelLabel = (level: WorkingLevel, unit: WeightUnit) => setTargetLabel(level, unit);

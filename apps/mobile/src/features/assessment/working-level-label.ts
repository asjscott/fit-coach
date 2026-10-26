import { WORKING_LEVEL_REPS } from "@fit/engines";
import type { WorkingLevel } from "@fit/shared";
import { bandLevelLabels } from "@/features/equipment/loads";
import { describeSet } from "@/features/workouts/format";

// "12.5 kg × 8", "14 reps", "45 s" or "Medium band × 12", once workingLevelSections has rounded it to the equipment
export function workingLevelLabel(level: WorkingLevel): string {
  switch (level.unit) {
    case "kg":
      return describeSet({ kind: "external", kg: level.kg, reps: WORKING_LEVEL_REPS });
    case "reps":
      return describeSet({ kind: "bodyweight", reps: level.reps });
    case "seconds":
      return describeSet({ kind: "timed", seconds: level.seconds });
    case "band":
      return `${bandLevelLabels[level.level]} band × ${level.reps}`;
  }
}

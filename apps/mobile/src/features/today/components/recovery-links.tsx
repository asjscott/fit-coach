import { MOBILITY, WALK_AND_MOBILITY } from "@/features/workouts/format";
import type { ColorToken } from "@/theme";
import { TodayCardLink } from "./today-card";

// The two Recovery Workouts in place of the Day's Workout, Mobility first (#198)
export function RecoveryLinks({
  color,
  size,
  onMobility,
  onWalkAndMobility,
}: {
  color: ColorToken;
  size?: "sm" | "md";
  onMobility: () => void;
  onWalkAndMobility: () => void;
}) {
  return (
    <>
      <TodayCardLink label={MOBILITY} color={color} size={size} onPress={onMobility} />
      <TodayCardLink label={WALK_AND_MOBILITY} color={color} size={size} onPress={onWalkAndMobility} />
    </>
  );
}

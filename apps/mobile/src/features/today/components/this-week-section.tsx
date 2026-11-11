import type { ThisWeek } from "@fit/engines";
import { StyleSheet, View } from "react-native";
import { Ring } from "@/components/ring";
import { Text } from "@/components/text";
import { timeStat, volumeLabel, weekDatesLabel } from "@/features/workouts/format";
import { radii, spacing, useTheme } from "@/theme";
import type { TodayState } from "../today-status";
import { DayCircles } from "./day-circles";
import { useWeightUnit } from "@/features/user/current-user-provider";

const workoutsLabel = (n: number) => `${n} ${n === 1 ? "Workout" : "Workouts"}`;

// This week so far: Workouts done against days per week, the week's Sets, Volume and Time, and the days trained.
// Offline only the Pending Workouts are known, so the stats would be wrong and give way to a note
export function ThisWeekSection({
  week,
  state,
  now,
}: {
  week: ThisWeek;
  state: Exclude<TodayState, "loading">;
  now: Date;
}) {
  const unit = useWeightUnit();
  const { colors } = useTheme();
  const { workoutCount: done, target } = week;
  const dates = weekDatesLabel(week.start, now);
  const tile = [styles.tile, { backgroundColor: colors.raised }];
  const time = timeStat(week.durationMs);

  return (
    <View style={{ gap: spacing[4] }}>
      <View style={styles.tiles}>
        <View style={tile}>
          {target ? <Ring done={done} target={target} size={52} /> : null}
          <Text size="sm" weight="semiBold">
            {target ? `${done} of ${target} Workouts` : workoutsLabel(done)}
          </Text>
          <Text size="xs" color="muted" accessibilityRole="header">
            {`This week · ${dates}`}
          </Text>
        </View>
        <View style={tile}>
          {state === "loaded" ? (
            <>
              <Text size="2xl" weight="bold">
                {week.sets}
              </Text>
              <Text size="sm" weight="semiBold">
                {week.sets === 1 ? "Set" : "Sets"}
              </Text>
              <Text size="xs" color="muted">
                {`${volumeLabel(week.volumeKg, unit)} ${unit} · ${time.value} ${time.unit}`}
              </Text>
            </>
          ) : (
            <Text size="sm" color="muted">
              {state === "first-run"
                ? "Your Volume, Sets and Time show here once you finish a Workout."
                : "The rest of this week needs a connection."}
            </Text>
          )}
        </View>
      </View>
      <DayCircles days={week.days} />
    </View>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: "row", gap: spacing[3] },
  tile: { flex: 1, minHeight: 112, gap: 2, padding: spacing[3], borderRadius: radii.md },
});

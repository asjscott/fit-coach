import type { ThisWeek } from "@fit/engines";
import { StyleSheet, View } from "react-native";
import { Ring } from "@/components/ring";
import { Stat } from "@/components/stat";
import { Text } from "@/components/text";
import { kgLabel, timeStat, weekDatesLabel } from "@/features/workouts/format";
import { spacing, useTheme } from "@/theme";
import type { TodayState } from "../today-status";
import { DayCircles } from "./day-circles";

const workoutsLabel = (n: number) => `${n} ${n === 1 ? "Workout" : "Workouts"}`;

// This week so far: a ring for Workouts done against days per week, the days trained, and Volume, Sets and Time.
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
  const { colors } = useTheme();
  const { workoutCount: done, target } = week;
  const dates = weekDatesLabel(week.start, now);

  const summary =
    state === "first-run"
      ? target
        ? `Aiming for ${workoutsLabel(target)} · ${dates}`
        : dates
      : state === "offline"
        ? `${workoutsLabel(done)} on this phone · ${dates}`
        : `${target ? `${done} of ${target} Workouts` : workoutsLabel(done)} · ${dates}`;

  const time = timeStat(week.durationMs);

  return (
    <View style={{ gap: spacing[4] }}>
      <View style={styles.header}>
        {target && state !== "first-run" ? <Ring done={done} target={target} size={52} /> : null}
        <View style={{ flex: 1 }}>
          <Text size="lg" weight="bold" accessibilityRole="header">
            This week
          </Text>
          <Text size="sm" color="muted">
            {summary}
          </Text>
        </View>
      </View>
      <DayCircles days={week.days} />
      {state === "loaded" ? (
        <View style={[styles.stats, { borderTopColor: colors.line }]}>
          <Stat value={kgLabel(week.volumeKg)} unit="kg" label="Volume" />
          <Stat value={String(week.sets)} label="Sets" />
          <Stat value={time.value} unit={time.unit} label="Time" />
        </View>
      ) : (
        <Text size="sm" color="muted">
          {state === "first-run"
            ? "Your Volume, Sets and Time for the week show here once you finish a Workout."
            : "The rest of this week needs a connection. Workouts saved on this phone are counted."}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  stats: { flexDirection: "row", paddingTop: spacing[3], borderTopWidth: StyleSheet.hairlineWidth },
});

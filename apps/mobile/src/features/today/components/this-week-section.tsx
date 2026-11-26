import type { ThisWeek } from "@fit/engines";
import { StyleSheet, View } from "react-native";
import { Pressable } from "@/components/pressable";
import { Ring } from "@/components/ring";
import { Text } from "@/components/text";
import { timeStat, volumeLabel, weekDatesLabel } from "@/features/workouts/format";
import { radii, spacing, useTheme } from "@/theme";
import type { TodayState } from "../today-status";
import { DayCircles } from "./day-circles";
import { useWeightUnit } from "@/features/user/current-user-provider";

const workoutsLabel = (n: number) => `${n} ${n === 1 ? "Workout" : "Workouts"}`;

// This week so far: Workouts done against days per week, the week's Sets, Volume and Time, the days trained, and the
// Weekly Streak. Offline only the Pending Workouts are known, so the stats would be wrong and give way to a note
export function ThisWeekSection({
  week,
  state,
  now,
  streak,
  onLastWeek,
}: {
  week: ThisWeek;
  state: Exclude<TodayState, "loading">;
  now: Date;
  // In weeks; left out at zero, and when it can't be worked out
  streak: number | null;
  // Opens the week before's Week Summary; null once the next one is due (lastWeekLink)
  onLastWeek: (() => void) | null;
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
      {streak || onLastWeek ? (
        <View style={[styles.streak, { backgroundColor: colors.raised }]}>
          <Text weight="semiBold">{streak ? `🔥 ${streak}-week streak` : ""}</Text>
          {onLastWeek ? (
            <Pressable onPress={onLastWeek} accessibilityRole="link" hitSlop={8}>
              <Text size="sm" weight="semiBold" color="accent">
                Last week ›
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: "row", gap: spacing[3] },
  tile: { flex: 1, minHeight: 112, gap: 2, padding: spacing[3], borderRadius: radii.md },
  streak: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing[3],
    borderRadius: radii.md,
  },
});

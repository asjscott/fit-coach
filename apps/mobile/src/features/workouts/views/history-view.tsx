import { historyByWeek, summarizeWorkout, weeklyVolume, withPending, type HistoryWeek } from "@fit/engines";
import type { Workout } from "@fit/shared";
import { router } from "expo-router";
import { Pressable, SectionList, StyleSheet, View } from "react-native";
import { Alert, AlertText } from "@/components/alert";
import { Loading } from "@/components/loading";
import { Ring } from "@/components/ring";
import { Screen } from "@/components/screen";
import { Spinner } from "@/components/spinner";
import { Text } from "@/components/text";
import { useCurrentUser } from "@/features/user/current-user-provider";
import { spacing, useTheme } from "@/theme";
import { durationLabel, kgLabel, relativeDateLabel, setsLabel, weekLabel } from "../format";
import { useHistory } from "../history-provider";
import { useRefreshHistory } from "../hooks/use-refresh-history";
import { exerciseName } from "../library";
import { useLogbook } from "../logbook-provider";
import { WeeklyVolumeBars } from "../components/weekly-volume-bars";

type Row = Workout & { isPending: boolean };

const exerciseNames = (workout: Workout) => workout.workoutExercises.map(({ slug }) => exerciseName(slug)).join(", ");

export default function HistoryView() {
  const { workouts, error, isLoading, isLoadingMore, loadMore } = useHistory();
  const { pending } = useLogbook();
  const daysPerWeek = useCurrentUser().user?.profile.daysPerWeek;
  useRefreshHistory();

  if (isLoading && !pending.length) return <Loading message="Loading History..." />;

  const isOffline = !workouts && !!error;
  const rows: Row[] = withPending(pending, workouts);
  const now = new Date();
  const weeks = historyByWeek(rows).map((week) => ({ ...week, data: week.workouts }));

  return (
    <Screen padded={false} scroll="content" edges={["bottom"]}>
      <SectionList
        sections={weeks}
        keyExtractor={(workout) => workout.id}
        contentContainerStyle={{ padding: spacing[5], paddingBottom: spacing[8] }}
        stickySectionHeadersEnabled={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          isOffline ? (
            <Alert action="muted">
              <AlertText>Showing only Workouts on this phone. The rest of your History needs a connection.</AlertText>
            </Alert>
          ) : workouts && rows.length ? (
            // Only once History has loaded, so the weeks' totals are whole
            <>
              {error ? <Text color="danger">{error}</Text> : null}
              <WeeklyVolumeBars weeks={weeklyVolume(rows, now)} />
            </>
          ) : error ? (
            <Text color="danger">{error}</Text>
          ) : undefined
        }
        renderSectionHeader={({ section }) => <WeekHeader week={section} daysPerWeek={daysPerWeek} now={now} />}
        renderItem={({ item }) => <WorkoutRow workout={item} now={now} />}
        ListFooterComponent={isLoadingMore || isLoading ? <Spinner /> : undefined}
        ListEmptyComponent={
          error || isLoading ? undefined : (
            <Text color="muted" style={{ marginTop: spacing[2] }}>
              No Workouts yet. Finished Workouts show up here.
            </Text>
          )
        }
      />
    </Screen>
  );
}

// "This week" with a ring, and "2 of 4 Workouts · 6,420 kg" against the user's days per week
function WeekHeader({ week, daysPerWeek, now }: { week: HistoryWeek<Row>; daysPerWeek?: number; now: Date }) {
  const n = week.workoutCount;
  const count = daysPerWeek ? `${n} of ${daysPerWeek} Workouts` : `${n} ${n === 1 ? "Workout" : "Workouts"}`;
  return (
    <View style={styles.weekHeader}>
      {daysPerWeek ? <Ring done={week.workoutCount} target={daysPerWeek} /> : null}
      <View style={{ flex: 1 }}>
        <Text size="lg" weight="bold" accessibilityRole="header">
          {weekLabel(week.start, now)}
        </Text>
        <Text size="sm" color="muted">
          {count} · {kgLabel(week.volumeKg)} kg
        </Text>
      </View>
    </View>
  );
}

// When, which Exercises, and the Workout's Volume, Sets and duration; a Pending Workout says it's waiting to sync
function WorkoutRow({ workout, now }: { workout: Row; now: Date }) {
  const { colors } = useTheme();
  const summary = summarizeWorkout(workout);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: "/history/[id]", params: { id: workout.id } })}
      style={({ pressed }) => [
        styles.row,
        { borderTopColor: colors.line },
        pressed && { backgroundColor: colors.raised },
      ]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text weight="semiBold">{relativeDateLabel(workout.startedAt, now)}</Text>
        <Text size="sm" color="muted" numberOfLines={1}>
          {exerciseNames(workout)}
        </Text>
        {workout.isPending ? (
          <Text size="xs" weight="semiBold" color="muted">
            Waiting to sync
          </Text>
        ) : null}
        {workout.prs?.length ? (
          <Text size="xs" weight="semiBold" color="success">
            {workout.prs.length === 1 ? "New PR" : `${workout.prs.length} new PRs`}
          </Text>
        ) : null}
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text size="xl" weight="bold">
          {kgLabel(summary.volumeKg)}
          <Text size="sm" color="muted">
            {" kg"}
          </Text>
        </Text>
        <Text size="sm" color="muted">
          {setsLabel(summary.sets)} · {durationLabel(workout)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  weekHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    marginTop: spacing[7],
    marginBottom: spacing[3],
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
    minHeight: 64,
    paddingVertical: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

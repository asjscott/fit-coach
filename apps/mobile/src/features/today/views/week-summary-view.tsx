import type { WeekSummary } from "@fit/shared";
import { useLocalSearchParams } from "expo-router";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useServerNotAnswering } from "@/api";
import { Alert, AlertText } from "@/components/alert";
import { LoadingButton } from "@/components/loading-button";
import { Screen } from "@/components/screen";
import { Spinner } from "@/components/spinner";
import { Text } from "@/components/text";
import { useWeightUnit } from "@/features/user/current-user-provider";
import { mondayWeekDatesLabel } from "@/features/workouts/format";
import { radii, spacing, useTheme } from "@/theme";
import { useWeekSummary } from "../hooks/use-week-summary";
import { budgetPart, dayBars, progressRows, weekSummaryTiles, type WeekSummaryTile } from "../week-summary-screen";

// The Week Summary screen (spec #206 stories 47 to 56, prototype variant B "Scorecard"), opened from the Week Summary
// card and from "Last week" in This week: the Coach's sentence, the tiles, the Muscles short of their Weekly Budget,
// the progress, then the kcal of each day. A part with no data is left out
export default function WeekSummaryView() {
  const { monday = "" } = useLocalSearchParams<{ monday?: string }>();
  const { summary, error, isOffline, refresh } = useWeekSummary(monday);
  const serverNotAnswering = useServerNotAnswering();

  return (
    <Screen scroll="screen" edges={["bottom"]}>
      <View style={{ gap: spacing[4] }}>
        {error ? (
          <>
            <Alert action="muted">
              <AlertText>
                {!isOffline
                  ? error
                  : serverNotAnswering
                    ? "Fit Coach isn't answering, so the Week Summary can't load just now. Try again in a minute."
                    : "The Week Summary needs a connection."}
              </AlertText>
            </Alert>
            <LoadingButton label="Try again" size="sm" action="secondary" variant="link" onPress={refresh} />
          </>
        ) : null}
        {summary ? <Scorecard summary={summary} /> : error ? null : <Spinner />}
      </View>
    </Screen>
  );
}

function Scorecard({ summary }: { summary: WeekSummary }) {
  const { colors } = useTheme();
  const unit = useWeightUnit();
  const dates = mondayWeekDatesLabel(summary.monday);
  const full = summary.workouts.done >= summary.workouts.planned;
  const budget = budgetPart(summary);
  const progress = progressRows(summary, unit);
  const days = dayBars(summary);

  return (
    <>
      <View
        testID="week-summary-hero"
        style={[styles.hero, { backgroundColor: full || summary.deload ? colors.successSoft : colors.raised }]}
      >
        <Text size="xs" weight="semiBold" color="muted">
          {`${summary.deload ? "DELOAD WEEK · " : ""}${dates.toUpperCase()}`}
        </Text>
        <Text size="3xl" weight="extraBold" accessibilityRole="header">
          {summary.coach.sentence}
        </Text>
        <Text>{summary.coach.line}</Text>
      </View>
      <View style={styles.grid}>
        {weekSummaryTiles(summary, unit).map((tile) => (
          <Tile key={tile.label} {...tile} />
        ))}
      </View>
      {budget ? (
        <Card>
          <Text weight="bold">{budget.title}</Text>
          {budget.short.length ? (
            <>
              <Text size="sm" color="muted">
                Short:
              </Text>
              <View style={styles.chips}>
                {budget.short.map((chip) => (
                  <View key={chip} style={[styles.chip, { backgroundColor: colors.accentSoft }]}>
                    <Text size="sm">{chip}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </Card>
      ) : null}
      {progress.length ? (
        <Card>
          <Text weight="bold">Progress</Text>
          {progress.map(({ kind, left, right, tone }) =>
            kind === "pr" ? (
              <View key={left}>
                <Text>{left}</Text>
                <Text size="sm" color="muted">
                  {right}
                </Text>
              </View>
            ) : (
              <View key={left} style={styles.between}>
                <Text style={{ flex: 1 }}>{left}</Text>
                <Text color={tone === "text" ? "muted" : tone} weight="semiBold" style={styles.moved}>
                  {right}
                </Text>
              </View>
            ),
          )}
        </Card>
      ) : null}
      {days.length ? (
        <Card>
          <Text weight="bold">Calories each day</Text>
          <View style={styles.days}>
            {days.map(({ day, date, kcal, tone, fill }) => (
              <View
                key={date}
                style={styles.day}
                accessible
                accessibilityLabel={kcal === null ? `${day}: no food logged` : `${day}: ${kcal} kcal`}
              >
                {tone ? (
                  <View style={[styles.bar, { height: Math.max(4, fill * 80), backgroundColor: colors[tone] }]} />
                ) : null}
                <Text size="xs" color="muted">
                  {day}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      ) : null}
    </>
  );
}

function Tile({ big, label, tone }: WeekSummaryTile) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: colors.raised }]} accessible accessibilityLabel={`${big} ${label}`}>
      <Text size="2xl" weight="bold" color={tone}>
        {big}
      </Text>
      <Text size="xs" color="muted">
        {label}
      </Text>
    </View>
  );
}

function Card({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>{children}</View>;
}

const styles = StyleSheet.create({
  hero: { gap: spacing[2], padding: spacing[5], borderRadius: radii.lg },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  tile: { width: "48.5%", padding: spacing[3], borderRadius: radii.md, gap: 2 },
  card: { padding: spacing[4], gap: spacing[2], borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  chip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  between: { flexDirection: "row", justifyContent: "space-between", gap: spacing[2] },
  moved: { maxWidth: "60%", textAlign: "right" },
  days: { flexDirection: "row", alignItems: "flex-end", height: 110, paddingTop: spacing[2] },
  day: { alignItems: "center", justifyContent: "flex-end", gap: 4, flex: 1, height: "100%" },
  bar: { width: 18, borderRadius: 4 },
});

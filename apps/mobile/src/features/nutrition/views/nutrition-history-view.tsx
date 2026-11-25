import { type NutritionMeasure, weeksAround } from "@fit/engines";
import type { NutritionWeek } from "@fit/shared";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useServerNotAnswering } from "@/api";
import { Alert, AlertText } from "@/components/alert";
import { Icon } from "@/components/icons";
import { LoadingButton } from "@/components/loading-button";
import { Pressable } from "@/components/pressable";
import { Screen } from "@/components/screen";
import { Segmented } from "@/components/segmented";
import { Spinner } from "@/components/spinner";
import { Text } from "@/components/text";
import { radii, spacing, useTheme } from "@/theme";
import { NutritionHistoryChart } from "../components/nutrition-history-chart";
import { useNutritionWeek } from "../hooks/use-nutrition-week";
import { nutritionHistoryChart, nutritionHistoryWeekLabel } from "../nutrition-history";

const MEASURES: { value: NutritionMeasure; label: string }[] = [
  { value: "kcal", label: "kcal" },
  { value: "protein", label: "Protein" },
];

// Nutrition History (spec #188): a week of kcal or protein against each day's range, opened from the Food tab's rings
export default function NutritionHistoryView() {
  const params = useLocalSearchParams<{ measure?: string }>();
  const [measure, setMeasure] = useState<NutritionMeasure>(params.measure === "protein" ? "protein" : "kcal");
  const [date, setDate] = useState("today");
  const { week, error, isOffline, refresh } = useNutritionWeek(date);
  const serverNotAnswering = useServerNotAnswering();

  return (
    <Screen scroll="screen" edges={["bottom"]}>
      <View style={styles.page}>
        <Segmented options={MEASURES} value={measure} onChange={setMeasure} />
        {error ? (
          <>
            <Alert action="muted">
              <AlertText>
                {!isOffline
                  ? error
                  : serverNotAnswering
                    ? "Fit Coach isn't answering, so Nutrition History can't load just now. Try again in a minute."
                    : "Nutrition History needs a connection."}
              </AlertText>
            </Alert>
            <LoadingButton label="Try again" size="sm" action="secondary" variant="link" onPress={refresh} />
          </>
        ) : null}
        {week ? <Week week={week} measure={measure} onWeek={setDate} /> : error ? null : <Spinner />}
      </View>
    </Screen>
  );
}

function Week({
  week,
  measure,
  onWeek,
}: {
  week: NutritionWeek;
  measure: NutritionMeasure;
  onWeek: (monday: string) => void;
}) {
  const { colors } = useTheme();
  const [selected, setSelected] = useState<string | null>(null);
  const chart = nutritionHistoryChart(week, measure);
  const bar = chart.bars.find(({ date }) => date === selected);
  const { earlier, later } = weeksAround(week);

  return (
    <>
      <View style={styles.stepper}>
        <Arrow to={earlier} icon="chevronLeft" label="The week before" onWeek={onWeek} />
        <Text weight="semiBold" accessibilityLiveRegion="polite">
          {nutritionHistoryWeekLabel(week)}
        </Text>
        <Arrow to={later} icon="chevronRight" label="The week after" onWeek={onWeek} />
      </View>
      <Text size="lg" weight="bold">
        {chart.average?.label ?? chart.nothingToAverage}
      </Text>
      <NutritionHistoryChart chart={chart} selected={selected} onSelect={setSelected} />
      <View style={styles.key} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden aria-hidden>
        <View style={[styles.swatch, { backgroundColor: colors.line }]} />
        <Text size="xs" color="muted">
          Target range
        </Text>
        {chart.average ? (
          <>
            <View style={styles.dots}>
              {[0, 1, 2, 3].map((dot) => (
                <View key={dot} style={[styles.dot, { backgroundColor: colors.text }]} />
              ))}
            </View>
            <Text size="xs" color="muted">
              Daily average
            </Text>
          </>
        ) : null}
      </View>
      <View accessibilityLiveRegion="polite" style={[styles.detail, { backgroundColor: colors.surface }]}>
        {bar ? (
          <>
            <Text size="sm" color="muted">
              {bar.title}
            </Text>
            <Text weight="bold">{bar.amount}</Text>
            <Text size="sm">{bar.detail[0].toUpperCase() + bar.detail.slice(1)}</Text>
          </>
        ) : (
          <Text size="sm" color="muted">
            Tap a day for its amount and range.
          </Text>
        )}
      </View>
    </>
  );
}

// An arrow to another week, off when there's none that way
function Arrow({
  to,
  icon,
  label,
  onWeek,
}: {
  to: string | null;
  icon: "chevronLeft" | "chevronRight";
  label: string;
  onWeek: (monday: string) => void;
}) {
  return (
    <Pressable
      disabled={!to}
      onPress={() => to && onWeek(to)}
      style={styles.arrow}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
    >
      <Icon name={icon} color={to ? "accent" : "subtle"} size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { gap: spacing[4] },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  arrow: { padding: spacing[1] },
  key: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  swatch: { width: 16, height: 10, borderRadius: 2 },
  dots: { flexDirection: "row", gap: 3, marginLeft: spacing[2] },
  dot: { width: 2, height: 2 },
  detail: { padding: spacing[4], borderRadius: radii.md, gap: 2 },
});

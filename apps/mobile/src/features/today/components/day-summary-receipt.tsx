import { StyleSheet, View } from "react-native";
import { Text } from "@/components/text";
import { radii, spacing, useTheme, type ColorToken } from "@/theme";
import { foodRows, tomorrowLine, workoutRow, type DaySummary, type RangeRow, type ReceiptRow } from "../day-summary";

const STATE_COLORS: Record<RangeRow["state"], ColorToken> = { under: "muted", in: "success", over: "danger" };

function Row({ row, detailColor }: { row: ReceiptRow; detailColor: ColorToken }) {
  return (
    <View style={styles.row}>
      <Text weight="semiBold" style={styles.label}>
        {row.label}
      </Text>
      {row.detail ? (
        <Text size="sm" color={detailColor} style={styles.detail}>
          {row.detail}
        </Text>
      ) : null}
    </View>
  );
}

// The Day Summary as a ticked receipt of the day (prototype variant C): the Workout, then kcal and protein against
// their ranges, with tomorrow in one line at its foot until the day is finished
export function DaySummaryReceipt({ summary }: { summary: DaySummary }) {
  const { colors } = useTheme();
  const { food } = summary;
  // As the rings colour them: still to reach, in range, and over in danger like their second lap
  const foodColors: ColorToken[] = food ? [food.kcal, food.protein].map(({ state }) => STATE_COLORS[state]) : [];
  // A finished day's Tomorrow card says it instead
  const tomorrow = summary.finished ? null : tomorrowLine(summary.tomorrow);
  return (
    <View style={[styles.receipt, { borderColor: colors.line }]}>
      <Text size="xs" weight="semiBold" color="muted" accessibilityRole="header">
        TODAY
      </Text>
      <Row row={workoutRow(summary.workout)} detailColor="muted" />
      {foodRows(food).map((row, i) => (
        <Row key={row.label} row={row} detailColor={foodColors[i] ?? "muted"} />
      ))}
      {tomorrow ? (
        <Text size="sm" color="muted" style={[styles.tomorrow, { borderTopColor: colors.line }]}>
          {tomorrow}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  receipt: { gap: spacing[2], padding: spacing[4], borderRadius: radii.lg, borderWidth: 1 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing[2] },
  label: { flexShrink: 1 },
  // The numbers stay on one line, and a long Workout name wraps instead
  detail: { flexShrink: 0 },
  tomorrow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing[2], marginTop: spacing[1] },
});

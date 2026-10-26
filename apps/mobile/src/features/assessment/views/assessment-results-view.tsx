import { ASSESSMENT_PATTERNS } from "@fit/engines";
import type { AssessmentTest } from "@fit/shared";
import { StyleSheet, View } from "react-native";
import { LoadingButton } from "@/components/loading-button";
import { Loading } from "@/components/loading";
import { Screen } from "@/components/screen";
import { SectionLabel } from "@/components/section-label";
import { Text } from "@/components/text";
import { spacing, useTheme } from "@/theme";
import { describeSet } from "@/features/workouts/format";
import { exerciseName } from "@/features/workouts/library";
import { useLatestAssessment } from "../hooks/use-latest-assessment";

// In the order the tests were done: A's, then B's
const PATTERN_ORDER = [...ASSESSMENT_PATTERNS.A, ...ASSESSMENT_PATTERNS.B];

const maximumLabel = (kg: number) => `${kg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`;

// The latest Assessment: each test's Exercise, top Set and estimated maximum.
// Still to come: starting Working Levels by Pattern (#36), load-limited and estimated Patterns (#38), and
// "Results once synced" while B is Pending (#39)
export default function AssessmentResultsView() {
  const { latest, error, refresh } = useLatestAssessment();

  if (latest === undefined && !error) return <Loading message="Loading results..." />;
  if (latest === undefined) {
    return (
      <Screen edges={["bottom"]}>
        <Text color="danger">{error}</Text>
        <LoadingButton label="Try again" action="secondary" onPress={refresh} style={styles.retry} />
      </Screen>
    );
  }
  if (latest === null) {
    return (
      <Screen edges={["bottom"]}>
        <Text color="muted">Results show once both Assessment Workouts have reached the server.</Text>
      </Screen>
    );
  }

  const { patterns } = latest.assessment;
  const tests = PATTERN_ORDER.flatMap((pattern) => patterns[pattern] ?? []);
  return (
    <Screen scroll edges={["bottom"]}>
      <SectionLabel style={styles.sectionLabel}>Tests</SectionLabel>
      {tests.map((test) => (
        <TestRow key={test.slug} test={test} />
      ))}
    </Screen>
  );
}

// "Goblet squat", its top Set "14 kg × 5 at RPE 9", and "Estimated max 16.8 kg"
function TestRow({ test }: { test: AssessmentTest }) {
  const { colors } = useTheme();
  const rpe = test.topSet.rpe === undefined ? "" : ` at RPE ${test.topSet.rpe}`;
  return (
    <View style={[styles.row, { borderTopColor: colors.line }]}>
      <View style={{ flex: 1 }}>
        <Text weight="semiBold">{exerciseName(test.slug)}</Text>
        <Text size="sm" color="muted">
          {`Top Set ${describeSet(test.topSet)}${rpe}`}
        </Text>
      </View>
      <View style={styles.maximum}>
        <Text weight="semiBold">{maximumLabel(test.maximumKg)}</Text>
        <Text size="xs" color="muted">
          Estimated max
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { marginBottom: spacing[2] },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    minHeight: 64,
    paddingVertical: spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  maximum: { alignItems: "flex-end" },
  retry: { marginTop: spacing[4] },
});

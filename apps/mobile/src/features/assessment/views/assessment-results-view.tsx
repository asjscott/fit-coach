import { ASSESSMENT_PATTERNS, pendingB, withPending, workingLevelSections } from "@fit/engines";
import type { AssessmentTest, TestedPattern, WorkingLevel } from "@fit/shared";
import { StyleSheet, View } from "react-native";
import { LoadingButton } from "@/components/loading-button";
import { Loading } from "@/components/loading";
import { Screen } from "@/components/screen";
import { SectionLabel } from "@/components/section-label";
import { Text } from "@/components/text";
import { spacing, useTheme } from "@/theme";
import { patternLabels } from "@/features/exercises/labels";
import { useCurrentUser, usePrimaryEquipmentProfile } from "@/features/user/current-user-provider";
import { describeSet, weightLabel } from "@/features/workouts/format";
import { exerciseName } from "@/features/workouts/library";
import { useLogbook } from "@/features/workouts/logbook-provider";
import { SyncingNote } from "../components/syncing-note";
import { useLatestAssessment } from "../hooks/use-latest-assessment";
import { workingLevelLabel } from "../working-level-label";

// In the order the tests were done: A's, then B's
const PATTERN_ORDER = [...ASSESSMENT_PATTERNS.A, ...ASSESSMENT_PATTERNS.B];

const ESTIMATED = "Estimated from your other results";

// What a bodyweight or timed test's one Set measured
const ONE_SET_CAPTIONS = { bodyweight: "Rep maximum", timed: "Held" } as const;

// "16.8 kg" Estimated maximum. A bodyweight or timed test shows its one Set: a bodyweight maximum's kg, of body
// weight × a share, means little to the user
function maximumLabel({ topSet, maximum, loadLimited }: AssessmentTest) {
  if (topSet.kind !== "external") return { value: describeSet(topSet), caption: ONE_SET_CAPTIONS[topSet.kind] };
  const kg = weightLabel(maximum);
  return loadLimited
    ? { value: `at least ${kg}`, caption: "Limited by your equipment" }
    : { value: kg, caption: "Estimated maximum" };
}

// "Results once synced" while a B is Pending, since the server works out the Assessment once it has both
export default function AssessmentResultsView() {
  const { latest, error, refresh } = useLatestAssessment();
  const { pending } = useLogbook();
  const primary = usePrimaryEquipmentProfile();
  const injuries = useCurrentUser().user?.profile.injuries;

  if (pendingB(withPending(pending, null))) {
    return (
      <Screen edges={["bottom"]}>
        <SyncingNote />
      </Screen>
    );
  }

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
  const sections = primary ? workingLevelSections(latest.workingLevels, primary, patterns, injuries ?? []) : [];
  return (
    <Screen scroll="screen" edges={["bottom"]}>
      <SectionLabel style={styles.sectionLabel}>Tests</SectionLabel>
      {PATTERN_ORDER.map((pattern) => {
        const result = patterns[pattern];
        if (!result) return null;
        return result.estimated ? (
          <EstimatedRow key={pattern} pattern={pattern} />
        ) : (
          <TestRow key={pattern} test={result} />
        );
      })}
      {sections.length > 0 ? (
        <>
          <Text weight="semiBold" style={styles.heading}>
            Starting Working Levels
          </Text>
          {sections.map((section) => (
            <View key={section.pattern} style={styles.section}>
              <SectionLabel style={section.estimated ? undefined : styles.sectionLabel}>
                {patternLabels[section.pattern]}
              </SectionLabel>
              {section.estimated ? (
                <Text size="sm" color="muted" style={styles.sectionLabel}>
                  {ESTIMATED}
                </Text>
              ) : null}
              {section.workingLevels.map((level) => (
                <WorkingLevelRow key={level.slug} level={level} />
              ))}
            </View>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

// "Goblet squat" and "12 kg × 8"
function WorkingLevelRow({ level }: { level: WorkingLevel }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.levelRow, { borderTopColor: colors.line }]}>
      <Text style={{ flex: 1 }}>{exerciseName(level.slug)}</Text>
      <Text weight="semiBold">{workingLevelLabel(level)}</Text>
    </View>
  );
}

// "Push", "Not tested" and "Estimated from your other results"
function EstimatedRow({ pattern }: { pattern: TestedPattern }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { borderTopColor: colors.line }]}>
      <View style={{ flex: 1 }}>
        <Text weight="semiBold">{patternLabels[pattern]}</Text>
        <Text size="sm" color="muted">
          Not tested
        </Text>
      </View>
      <View style={styles.maximum}>
        <Text size="xs" color="muted">
          {ESTIMATED}
        </Text>
      </View>
    </View>
  );
}

// "Goblet squat", its top Set "14 kg × 5 at RPE 9", and "16.8 kg" Estimated maximum
function TestRow({ test }: { test: AssessmentTest }) {
  const { colors } = useTheme();
  const rpe = test.topSet.rpe === undefined ? "" : ` at RPE ${test.topSet.rpe}`;
  const maximum = maximumLabel(test);
  return (
    <View style={[styles.row, { borderTopColor: colors.line }]}>
      <View style={{ flex: 1 }}>
        <Text weight="semiBold">{exerciseName(test.slug)}</Text>
        <Text size="sm" color="muted">
          {`Top Set ${describeSet(test.topSet)}${rpe}`}
        </Text>
      </View>
      <View style={styles.maximum}>
        <Text weight="semiBold">{maximum.value}</Text>
        <Text size="xs" color="muted">
          {maximum.caption}
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
  heading: { marginTop: spacing[6] },
  section: { marginTop: spacing[4] },
  levelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    minHeight: 48,
    paddingVertical: spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  retry: { marginTop: spacing[4] },
});

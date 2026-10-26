import { ASSESSMENT_PATTERNS } from "@fit/engines";
import type { AssessmentTest } from "@fit/shared";
import { StyleSheet, View } from "react-native";
import { LoadingButton } from "@/components/loading-button";
import { Loading } from "@/components/loading";
import { Screen } from "@/components/screen";
import { SectionLabel } from "@/components/section-label";
import { Text } from "@/components/text";
import { spacing, useTheme } from "@/theme";
import { useCurrentUser } from "@/features/user/current-user-provider";
import { describeSet } from "@/features/workouts/format";
import { exerciseName } from "@/features/workouts/library";
import { useLogbook } from "@/features/workouts/logbook-provider";
import { useLatestAssessment } from "../hooks/use-latest-assessment";
import { useStartAssessment } from "../hooks/use-start-assessment";
import { workingLevelSections, type WorkingLevelRow } from "../working-level-sections";

// In the order the tests were done: A's, then B's
const PATTERN_ORDER = [...ASSESSMENT_PATTERNS.A, ...ASSESSMENT_PATTERNS.B];

// The test's maximum and what it is: "16.8 kg" Estimated max; for a bodyweight test the reps it was worth, "11 reps"
// Rep max (its kg is of body weight × a share, which means little to the user); for a timed test "90 s" Held
function maximumOf({ topSet, maximum }: AssessmentTest) {
  switch (topSet.kind) {
    case "external":
      return {
        value: `${maximum.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`,
        caption: "Estimated max",
      };
    case "bodyweight":
      return { value: `${topSet.reps + (10 - (topSet.rpe ?? 9))} reps`, caption: "Rep max" };
    case "timed":
      return { value: `${topSet.seconds} s`, caption: "Held" };
  }
}

// The latest Assessment: each test's Exercise, top Set and estimated maximum, the starting Working Levels by Pattern
// for what the primary Equipment Profile supports (rounded to its loads), and Retake. "Results once synced" while a
// B is Pending, since the server works out the Assessment once it has both.
// Still to come: load-limited and estimated Patterns (#38)
export default function AssessmentResultsView() {
  const { latest, error, refresh } = useLatestAssessment();
  const { pending, workout } = useLogbook();
  const { start, starting } = useStartAssessment();
  const primary = useCurrentUser().user?.equipmentProfiles.find((profile) => profile.isPrimary);

  if (pending.some((pendingWorkout) => pendingWorkout.assessment === "B")) {
    return (
      <Screen edges={["bottom"]}>
        <Text weight="semiBold">Results once synced</Text>
        <Text color="muted">Assessment B is saved on your phone and uploads when you have signal.</Text>
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
  const tests = PATTERN_ORDER.flatMap((pattern) => patterns[pattern] ?? []);
  const sections = primary ? workingLevelSections(latest.workingLevels, primary) : [];
  return (
    <Screen scroll edges={["bottom"]}>
      <SectionLabel style={styles.sectionLabel}>Tests</SectionLabel>
      {tests.map((test) => (
        <TestRow key={test.slug} test={test} />
      ))}
      {sections.length > 0 ? (
        <>
          <Text weight="semiBold" style={styles.heading}>
            Starting Working Levels
          </Text>
          {sections.map((section) => (
            <View key={section.title} style={styles.section}>
              <SectionLabel style={styles.sectionLabel}>{section.title}</SectionLabel>
              {section.rows.map((row) => (
                <WorkingLevelRowView key={row.slug} row={row} />
              ))}
            </View>
          ))}
        </>
      ) : null}
      {workout ? null : (
        <View style={styles.retake}>
          <Text size="sm" color="muted">
            Retake after a break or a big change. A new Assessment replaces these Working Levels.
          </Text>
          <LoadingButton
            label="Retake: start Assessment A"
            action="secondary"
            variant="outline"
            fullWidth
            loading={starting === "A"}
            onPress={() => start("A")}
          />
        </View>
      )}
    </Screen>
  );
}

// "Goblet squat" and "12 kg × 8"
function WorkingLevelRowView({ row }: { row: WorkingLevelRow }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.levelRow, { borderTopColor: colors.line }]}>
      <Text style={{ flex: 1 }}>{row.name}</Text>
      <Text weight="semiBold">{row.label}</Text>
    </View>
  );
}

// "Goblet squat", its top Set "14 kg × 5 at RPE 9", and "Estimated max 16.8 kg"
function TestRow({ test }: { test: AssessmentTest }) {
  const { colors } = useTheme();
  const rpe = test.topSet.rpe === undefined ? "" : ` at RPE ${test.topSet.rpe}`;
  const maximum = maximumOf(test);
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
  retake: { marginTop: spacing[6], gap: spacing[2] },
});

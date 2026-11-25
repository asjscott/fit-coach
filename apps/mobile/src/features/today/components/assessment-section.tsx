import { ASSESSMENT_PATTERNS, type AssessmentOffer } from "@fit/engines";
import type { TestedPattern } from "@fit/shared";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Icon } from "@/components/icons";
import { LoadingButton } from "@/components/loading-button";
import { Pressable } from "@/components/pressable";
import { SectionLabel } from "@/components/section-label";
import { Text } from "@/components/text";
import { SyncingNote } from "@/features/assessment/components/syncing-note";
import { useStartAssessment } from "@/features/assessment/hooks/use-start-assessment";
import { patternLabels } from "@/features/exercises/labels";
import { useLogbook } from "@/features/workouts/logbook-provider";
import { spacing } from "@/theme";
import { TodayCard, TodayCardLink } from "./today-card";

// "squat, hinge and core"
function patternsInWords(patterns: TestedPattern[]) {
  const words = patterns.map((pattern) => patternLabels[pattern].toLowerCase());
  return words.length > 1 ? `${words.slice(0, -1).join(", ")} and ${words.at(-1)}` : words[0];
}

const WHAT_IT_TESTS = `Tests your ${patternsInWords(ASSESSMENT_PATTERNS)}, so the Coach knows your starting strength.`;

const HEADLINE = "Let's find your starting strength.";

const START_LABEL = "Start assessment";

// The deload week's retake (#137): what it keeps, so the user knows the Block's progress is safe
const RETAKE_LABEL = "Retake the Assessment";
const RETAKE_LINE =
  "Your deload week is a good time to check your strength. Only the Exercises it tests, and any you didn't do this Block, get new levels.";

const untestedNote = (untested: TestedPattern[]) =>
  `No test suits your injuries and equipment for ${patternsInWords(untested)}, so ${untested.length > 1 ? "they're" : "it's"} estimated from your other results.`;

// The same offer as Today's main card, for a user who has no plan until the Assessment is done
export function AssessmentCard({
  offer,
  onDismiss,
}: {
  offer: Extract<AssessmentOffer, { kind: "start" }>;
  onDismiss: () => void;
}) {
  const { start, starting } = useStartAssessment();
  const { untested } = offer;

  return (
    <TodayCard tone="accent" headline={HEADLINE} line={WHAT_IT_TESTS}>
      {untested.length > 0 ? <Text color="onAccent">{untestedNote(untested)}</Text> : null}
      <LoadingButton label={START_LABEL} action="inverse" fullWidth loading={starting} onPress={start} />
      <TodayCardLink label="Not now" color="onAccent" size="sm" onPress={onDismiss} />
    </TodayCard>
  );
}

// Today's Assessment offer: start it, why it's unavailable, "Results once synced", open the Results, or retake it
// in the deload week. Every offer can be dismissed. Starting needs no Workout in progress
export function AssessmentSection({ offer, onDismiss }: { offer: AssessmentOffer; onDismiss: () => void }) {
  const { workout } = useLogbook();
  const { start, starting } = useStartAssessment();

  const startButton = workout ? null : (
    <LoadingButton label={START_LABEL} action="secondary" fullWidth loading={starting} onPress={start} />
  );

  return (
    <View style={{ gap: spacing[2] }}>
      <View style={styles.header}>
        <SectionLabel style={styles.label}>{offer.kind === "retake" ? RETAKE_LABEL : "Assessment"}</SectionLabel>
        <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Dismiss" hitSlop={12}>
          <Icon name="x" size={18} />
        </Pressable>
      </View>
      {offer.kind === "results" ? (
        <LoadingButton
          label="Assessment results"
          icon="chevronRight"
          action="secondary"
          variant="outline"
          fullWidth
          onPress={() => router.push("/assessment-results")}
        />
      ) : offer.kind === "syncing" ? (
        <SyncingNote />
      ) : offer.kind === "retake" ? (
        <>
          <Text size="sm" color="muted">
            {RETAKE_LINE}
          </Text>
          {offer.untested.length > 0 ? (
            <Text size="sm" color="muted">
              {untestedNote(offer.untested)}
            </Text>
          ) : null}
          {startButton}
        </>
      ) : offer.kind === "unavailable" ? (
        <Text size="sm" color="muted">
          No Assessment test suits your injuries and equipment. Log Manual Workouts with the Exercises you can do.
        </Text>
      ) : (
        <>
          <Text size="sm" color="muted">
            {WHAT_IT_TESTS}
          </Text>
          {offer.untested.length > 0 ? (
            <Text size="sm" color="muted">
              {untestedNote(offer.untested)}
            </Text>
          ) : null}
          {startButton}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  label: { flex: 1 },
});

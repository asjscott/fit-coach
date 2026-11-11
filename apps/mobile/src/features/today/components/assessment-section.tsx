import { ASSESSMENT_PATTERNS, type AssessmentOffer } from "@fit/engines";
import type { AssessmentPart, TestedPattern } from "@fit/shared";
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

const WHAT_IT_TESTS: Record<AssessmentPart, string> = {
  A: `Tests your ${patternsInWords(ASSESSMENT_PATTERNS.A)}, so the Coach knows your starting strength.`,
  B: `Tests your ${patternsInWords(ASSESSMENT_PATTERNS.B)}, and finishes your Assessment.`,
};

const HEADLINES: Record<AssessmentPart, string> = {
  A: "Let's find your starting strength.",
  B: "One more test to go.",
};

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
  const { part, untested } = offer;

  return (
    <TodayCard tone="accent" headline={HEADLINES[part]} line={WHAT_IT_TESTS[part]}>
      {untested.length > 0 ? <Text color="onAccent">{untestedNote(untested)}</Text> : null}
      <LoadingButton
        label={`Start assessment ${part}`}
        action="inverse"
        fullWidth
        loading={starting === part}
        disabled={starting !== null}
        onPress={() => start(part)}
      />
      {part === "B" && offer.redoA ? (
        <>
          <Text color="onAccent">
            Your Assessment A was over 2 weeks ago. Redo it if your strength may have changed.
          </Text>
          <TodayCardLink label="Redo assessment A" color="onAccent" onPress={() => start("A")} />
        </>
      ) : null}
      <TodayCardLink label="Not now" color="onAccent" size="sm" onPress={onDismiss} />
    </TodayCard>
  );
}

// Today's Assessment offer: start A or B (and redo a stale A), why it's unavailable, "Results once synced", open
// the Results, or retake it in the deload week. Every offer can be dismissed. Starting needs no Workout in progress
export function AssessmentSection({ offer, onDismiss }: { offer: AssessmentOffer; onDismiss: () => void }) {
  const { workout } = useLogbook();
  const { start, starting } = useStartAssessment();

  const startButton = (part: AssessmentPart, label: string, variant: "solid" | "outline" = "solid") =>
    workout ? null : (
      <LoadingButton
        label={label}
        action="secondary"
        variant={variant}
        fullWidth
        loading={starting === part}
        disabled={starting !== null}
        onPress={() => start(part)}
      />
    );

  return (
    <View style={{ gap: spacing[2] }}>
      <View style={styles.header}>
        <SectionLabel style={styles.label}>
          {offer.kind === "start" ? `Assessment ${offer.part}` : offer.kind === "retake" ? RETAKE_LABEL : "Assessment"}
        </SectionLabel>
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
          {startButton("A", "Start assessment A")}
        </>
      ) : offer.kind === "unavailable" ? (
        <Text size="sm" color="muted">
          No Assessment test suits your injuries and equipment. Log Manual Workouts with the Exercises you can do.
        </Text>
      ) : (
        <>
          <Text size="sm" color="muted">
            {WHAT_IT_TESTS[offer.part]}
          </Text>
          {offer.untested.length > 0 ? (
            <Text size="sm" color="muted">
              {untestedNote(offer.untested)}
            </Text>
          ) : null}
          {startButton(offer.part, `Start assessment ${offer.part}`)}
          {offer.part === "B" && offer.redoA ? (
            <>
              <Text size="sm" color="muted">
                Your Assessment A was over 2 weeks ago. Redo it if your strength may have changed.
              </Text>
              {startButton("A", "Redo assessment A", "outline")}
            </>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  label: { flex: 1 },
});

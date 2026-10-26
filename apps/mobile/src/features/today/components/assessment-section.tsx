import { ASSESSMENT_PATTERNS, type AssessmentOffer } from "@fit/engines";
import type { AssessmentPart } from "@fit/shared";
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

// "squat, hinge and core"
function patternsInWords(part: AssessmentPart) {
  const words = ASSESSMENT_PATTERNS[part].map((pattern) => patternLabels[pattern].toLowerCase());
  return words.length > 1 ? `${words.slice(0, -1).join(", ")} and ${words.at(-1)}` : words[0];
}

const WHAT_IT_TESTS: Record<AssessmentPart, string> = {
  A: `Tests your ${patternsInWords("A")}, so the Coach knows your starting strength.`,
  B: `Tests your ${patternsInWords("B")}, and finishes your Assessment.`,
};

// Today's Assessment offer: start A or B (and redo a stale A), "Results once synced", or open the Results. Every
// offer can be dismissed. Starting needs no Workout in progress
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
          {offer.kind === "start" ? `Assessment ${offer.part}` : "Assessment"}
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
      ) : (
        <>
          <Text size="sm" color="muted">
            {WHAT_IT_TESTS[offer.part]}
          </Text>
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

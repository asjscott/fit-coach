import type { AssessmentPart } from "@fit/shared";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Icon } from "@/components/icons";
import { LoadingButton } from "@/components/loading-button";
import { Pressable } from "@/components/pressable";
import { SectionLabel } from "@/components/section-label";
import { Text } from "@/components/text";
import { useStartAssessment } from "@/features/assessment/hooks/use-start-assessment";
import { useLogbook } from "@/features/workouts/logbook-provider";
import { spacing } from "@/theme";
import type { AssessmentOffer } from "../today-status";

const WHAT_IT_TESTS: Record<AssessmentPart, string> = {
  A: "Tests your squat and hinge, so the Coach knows your starting strength.",
  B: "Tests your push and pull, and finishes your Assessment.",
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
        <Text size="sm" color="muted">
          Results once synced. Assessment B is saved on your phone and uploads when you have signal.
        </Text>
      ) : (
        <>
          <Text size="sm" color="muted">
            {WHAT_IT_TESTS[offer.part]}
          </Text>
          {startButton(offer.part, `Start Assessment ${offer.part}`)}
          {offer.part === "B" && offer.redoA ? (
            <>
              <Text size="sm" color="muted">
                Your Assessment A was over 2 weeks ago. Redo it if your strength may have changed.
              </Text>
              {startButton("A", "Redo Assessment A", "outline")}
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

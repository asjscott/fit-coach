import type { AssessmentPart } from "@fit/shared";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { LoadingButton } from "@/components/loading-button";
import { SectionLabel } from "@/components/section-label";
import { Text } from "@/components/text";
import { useToast } from "@/contexts/toast-context";
import { useCurrentUser } from "@/features/user/current-user-provider";
import { useLogbook } from "@/features/workouts/logbook-provider";
import { spacing } from "@/theme";
import type { AssessmentOffer } from "../today-status";

const WHAT_IT_TESTS: Record<AssessmentPart, string> = {
  A: "Tests your squat and hinge, so the Coach knows your starting strength.",
  B: "Tests your push and pull, and finishes your Assessment.",
};

// Today's Assessment offer: start A or B, or open the Results. Starting needs no Workout in progress
export function AssessmentSection({ offer }: { offer: Exclude<AssessmentOffer, null> }) {
  const { workout, startAssessment } = useLogbook();
  const { user } = useCurrentUser();
  const { showToast } = useToast();
  const [starting, setStarting] = useState(false);

  if (offer.kind === "results") {
    return (
      <LoadingButton
        label="Assessment results"
        icon="chevronRight"
        action="secondary"
        variant="outline"
        fullWidth
        onPress={() => router.push("/assessment-results")}
      />
    );
  }

  const { part } = offer;
  const start = async () => {
    const equipmentProfile = user?.equipmentProfiles.find((p) => p.isPrimary);
    const { injuries = [], weightKg, gender } = user?.profile ?? {};
    if (!equipmentProfile || weightKg === undefined || !gender) {
      showToast("Finish your profile and equipment first", { type: "warning" });
      return;
    }
    setStarting(true);
    try {
      await startAssessment({ part, equipmentProfile, injuries, weightKg, gender });
      router.push("/workout");
    } catch (err) {
      showToast(`Couldn't start Assessment ${part}`, { error: err });
    } finally {
      setStarting(false);
    }
  };

  return (
    <View style={{ gap: spacing[2] }}>
      <SectionLabel>{`Assessment ${part}`}</SectionLabel>
      <Text size="sm" color="muted">
        {WHAT_IT_TESTS[part]}
      </Text>
      {workout ? null : (
        <LoadingButton
          label={`Start Assessment ${part}`}
          action="secondary"
          fullWidth
          loading={starting}
          onPress={start}
        />
      )}
    </View>
  );
}

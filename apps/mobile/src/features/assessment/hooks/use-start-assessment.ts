import type { AssessmentPart } from "@fit/shared";
import { router } from "expo-router";
import { useState } from "react";
import { useToast } from "@/contexts/toast-context";
import { useCurrentUser } from "@/features/user/current-user-provider";
import { useLogbook } from "@/features/workouts/logbook-provider";

// Starts Assessment A or B from the user's primary Equipment Profile and profile, then opens the Workout. Used by
// Today's offer and by Retake on the Results
export function useStartAssessment() {
  const { startAssessment } = useLogbook();
  const { user } = useCurrentUser();
  const { showToast } = useToast();
  const [starting, setStarting] = useState<AssessmentPart | null>(null);

  const start = async (part: AssessmentPart) => {
    const equipmentProfile = user?.equipmentProfiles.find((p) => p.isPrimary);
    const { injuries = [], weightKg, gender } = user?.profile ?? {};
    if (!equipmentProfile || weightKg === undefined || !gender) {
      showToast("Finish your profile and equipment first", { type: "warning" });
      return;
    }
    setStarting(part);
    try {
      await startAssessment({ part, equipmentProfile, injuries, weightKg, gender });
      router.push("/workout");
    } catch (err) {
      showToast(`Couldn't start Assessment ${part}`, { error: err });
    } finally {
      setStarting(null);
    }
  };

  return { start, starting };
}

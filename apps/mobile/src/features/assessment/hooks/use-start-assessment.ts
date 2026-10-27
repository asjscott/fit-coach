import { BodyProfile, type AssessmentPart } from "@fit/shared";
import { router } from "expo-router";
import { useState } from "react";
import { useToast } from "@/contexts/toast-context";
import { useCurrentUser, usePrimaryEquipmentProfile } from "@/features/user/current-user-provider";
import { useLogbook } from "@/features/workouts/logbook-provider";

// Starts Assessment A or B from the user's primary Equipment Profile and profile, then opens the Workout. Used by
// Today's offer and by Retake on Profile. The app only opens once onboarded, so weight and gender are there
export function useStartAssessment() {
  const { startAssessment } = useLogbook();
  const { user } = useCurrentUser();
  const equipmentProfile = usePrimaryEquipmentProfile();
  const { showToast } = useToast();
  const [starting, setStarting] = useState<AssessmentPart | null>(null);

  const start = async (part: AssessmentPart) => {
    setStarting(part);
    try {
      if (!user || !equipmentProfile) throw new Error("No primary Equipment Profile");
      const { injuries = [] } = user.profile;
      await startAssessment({ part, equipmentProfile, injuries, bodyProfile: BodyProfile.parse(user.profile) });
      router.push("/workout");
    } catch (err) {
      showToast(`Couldn't start Assessment ${part}`, { error: err });
    } finally {
      setStarting(null);
    }
  };

  return { start, starting };
}

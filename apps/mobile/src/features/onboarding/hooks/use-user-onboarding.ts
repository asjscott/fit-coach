import { zodResolver } from "@hookform/resolvers/zod";
import { UserProfile } from "@fit/shared";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { LoadsForm, pruneLoads, toLoadsForm } from "@/features/equipment/loads";
import {
  asksForLoads,
  EquipmentByGroup,
  groupTags,
  selectedTags,
  toEquipmentInput,
  toTrainingSetup,
  TrainingSetup,
} from "@/features/equipment/training-setup";
import { useCurrentUser, usePrimaryEquipmentProfile } from "@/features/user/current-user-provider";
import { useNotifications } from "@/hooks/use-notifications";
import type { Stage, StageAction } from "../form/staged-form";

// ----------------------------------------------------------------------

// The profile plus the answers that become the primary equipment profile
export const OnboardingValues = UserProfile.extend({
  trainingSetup: TrainingSetup,
  equipment: EquipmentByGroup,
  loads: LoadsForm,
});
export type OnboardingValues = z.infer<typeof OnboardingValues>;

// One form across every stage, saved once at the end
export function useUserOnboarding() {
  // The view only renders the form once the user has loaded
  const { user, updateUser, saveEquipmentProfile } = useCurrentUser();
  const { handleError } = useNotifications();
  const profile = user?.profile ?? {};
  const primaryEquipment = usePrimaryEquipmentProfile();

  // Captured once so the completion message doesn't flip when the save stamps onboardedAt
  const [isEditing] = useState(!!user?.onboardedAt);
  const [stage, setStage] = useState<Stage>(1);

  const onboardingForm = useForm<OnboardingValues>({
    resolver: zodResolver(OnboardingValues),
    mode: "onBlur",
    defaultValues: {
      ...profile,
      daysPerWeek: profile.daysPerWeek ?? 3,
      trainingSetup: primaryEquipment && toTrainingSetup(primaryEquipment),
      equipment: groupTags(primaryEquipment?.tags ?? []),
      loads: toLoadsForm(primaryEquipment?.loads),
    },
  });

  const { trigger, handleSubmit, formState, getValues, setValue } = onboardingForm;

  const onStageChange = async (change: StageAction<OnboardingValues>) => {
    if (typeof stage !== "number") return;

    // Always allow going back
    if (change.action === "previous") {
      setStage(Math.max(stage - 1, 1));
      return;
    }

    // If going forwards, validate the current stage's fields; trigger() with none would validate the whole form
    const valid = change.fields.length === 0 || (await trigger(change.fields));
    if (!valid) {
      handleError("Please check the form for errors before continuing.");
      return;
    }

    // Drop weights for equipment no longer selected, so a stale half-filled answer can't block saving
    const { trainingSetup, equipment, loads } = getValues();
    const tags = asksForLoads(trainingSetup) ? selectedTags(trainingSetup, equipment) : [];
    setValue("loads", pruneLoads(loads, tags));

    setStage(stage + 1);
  };

  const save = async ({ trainingSetup, equipment, loads, ...values }: OnboardingValues) => {
    try {
      // Updates the primary profile by id if there is one, so retrying or editing never adds a second
      await saveEquipmentProfile(toEquipmentInput(trainingSetup, equipment, loads), primaryEquipment?.id);

      // The server stamps onboardedAt once the required fields and an equipment profile are saved
      const updated = await updateUser({ profile: values });
      if (!updated.onboardedAt) throw new Error("Some answers are missing, go back and check them");
      setStage("complete");
    } catch (err) {
      handleError(err);
    }
  };

  const errorCallback = () => {
    handleError("Error saving your profile. Please check the form and try again.");
  };

  const onSubmit = handleSubmit(save, errorCallback);

  return {
    stage,
    onStageChange,
    onSubmit,
    onboardingForm,
    isEditing,
    isSaving: formState.isSubmitting,
  };
}

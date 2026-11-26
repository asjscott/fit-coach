import { zodResolver } from "@hookform/resolvers/zod";
import { usualWorkoutLength } from "@fit/engines";
import {
  ActivityLevel,
  bodyWeightAnswer,
  bodyWeightInUnit,
  bodyWeightKg,
  UserProfile,
  type WeightUnit,
} from "@fit/shared";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { loadsForm, pruneLoads, toLoadsForm } from "@/features/equipment/loads";
import {
  loadTagsAsked,
  EquipmentByGroup,
  groupTags,
  selectedTags,
  toEquipmentInput,
  toTrainingSetup,
  TrainingSetup,
} from "@/features/equipment/training-setup";
import { useCurrentUser, usePrimaryEquipmentProfile, useWeightUnit } from "@/features/user/current-user-provider";
import { useNotifications } from "@/hooks/use-notifications";
import type { Stage, StageAction } from "../form/staged-form";

// ----------------------------------------------------------------------

// The profile plus the answers that become the primary equipment profile. Body weight is answered in the user's
// unit and saved in kg (#148), by a new user only: it becomes their first Weigh-in, and after that a Weigh-in sets it
// (#161). Onboarding always asks the Activity Level, which the server lets an older user lack. The fibre target is
// edited on Profile, never here
export const onboardingValues = (unit: WeightUnit, isEditing: boolean) =>
  UserProfile.omit({ weightKg: true, fibreTargetG: true }).extend({
    activityLevel: ActivityLevel,
    weight: isEditing ? bodyWeightAnswer(unit).optional() : bodyWeightAnswer(unit),
    trainingSetup: TrainingSetup,
    equipment: EquipmentByGroup,
    loads: loadsForm(unit),
  });
export type OnboardingValues = z.infer<ReturnType<typeof onboardingValues>>;

// One form across every stage, saved once at the end
export function useUserOnboarding() {
  // The view only renders the form once the user has loaded
  const { user, updateUser, saveEquipmentProfile } = useCurrentUser();
  const { handleError } = useNotifications();
  // The form's schema drops the fibre target, so saving the form never changes it
  const { weightKg, ...profile } = user?.profile ?? {};
  const primaryEquipment = usePrimaryEquipmentProfile();
  // Weights and body weight are entered in the user's unit and saved in kg
  const unit = useWeightUnit();

  // Captured once so the completion message doesn't flip when the save stamps onboardedAt
  const [isEditing] = useState(!!user?.onboardedAt);
  const [stage, setStage] = useState<Stage>(1);

  const onboardingForm = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingValues(unit, isEditing)),
    mode: "onBlur",
    defaultValues: {
      ...profile,
      weight: weightKg && bodyWeightInUnit(weightKg, unit),
      daysPerWeek: profile.daysPerWeek ?? 3,
      // A new user must choose; an existing user without one edits from Standard
      workoutLength: isEditing ? usualWorkoutLength(profile) : profile.workoutLength,
      trainingSetup: primaryEquipment && toTrainingSetup(primaryEquipment),
      equipment: groupTags(primaryEquipment?.tags ?? []),
      loads: toLoadsForm(primaryEquipment?.loads, unit),
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
    const tags = loadTagsAsked(trainingSetup, selectedTags(trainingSetup, equipment));
    setValue("loads", pruneLoads(loads, tags));

    setStage(stage + 1);
  };

  const save = async ({ trainingSetup, equipment, loads, weight, ...values }: OnboardingValues) => {
    try {
      // Updates the primary profile by id if there is one, so retrying or editing never adds a second
      await saveEquipmentProfile(toEquipmentInput(trainingSetup, equipment, loads, unit), primaryEquipment?.id);

      // The server stamps onboardedAt once the required fields and an equipment profile are saved, and makes the
      // weight the first Weigh-in. Once onboarded, only a Weigh-in changes it
      const updated = await updateUser({
        profile: {
          ...values,
          ...(weight !== undefined && !user?.onboardedAt && { weightKg: bodyWeightKg(weight, unit, weightKg) }),
        },
      });
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

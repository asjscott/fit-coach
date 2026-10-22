import { zodResolver } from "@hookform/resolvers/zod";
import { UserProfile } from "@fit/shared";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useCurrentUser } from "@/features/user/CurrentUserProvider";
import { useNotifications } from "@/hooks/useNotifications";
import type { Stage, StageAction } from "../form/StagedForm";

// ----------------------------------------------------------------------

// Field names for each stage, used to trigger partial validation for each stage
const stages: Record<number, (keyof UserProfile)[]> = {
  1: ["gender", "birthYear", "heightCm", "weightKg"],
  2: ["goal", "daysPerWeek"],
  3: ["injuries"],
};

// ----------------------------------------------------------------------

// One form across every stage, saved once at the end
export function useUserOnboarding() {
  // The view only renders the form once the user has loaded
  const { user, updateProfile } = useCurrentUser();
  const { handleError } = useNotifications();
  const profile = user?.profile ?? {};

  // Captured once so the completion message doesn't flip when the save stamps onboardedAt
  const [isEditing] = useState(!!user?.onboardedAt);
  const [stage, setStage] = useState<Stage>(1);

  const onboardingForm = useForm<UserProfile>({
    resolver: zodResolver(UserProfile),
    mode: "onBlur",
    defaultValues: { ...profile, daysPerWeek: profile.daysPerWeek ?? 3 },
  });

  const { trigger, handleSubmit, formState } = onboardingForm;

  const onStageChange = async ({ action }: StageAction) => {
    if (typeof stage !== "number") return;

    // Always allow going back
    if (action === "previous") {
      setStage(Math.max(stage - 1, 1));
      return;
    }

    // If going forwards, validate the current stage
    const valid = await trigger(stages[stage]);
    if (!valid) {
      handleError("Please check the form for errors before continuing.");
      return;
    }
    setStage(stage + 1);
  };

  const save = async (values: UserProfile) => {
    try {
      // The server stamps onboardedAt once the required fields are saved
      const updated = await updateProfile(values);
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

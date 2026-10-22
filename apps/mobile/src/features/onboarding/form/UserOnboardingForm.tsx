import { Box } from "@/components/box";
import { FormProvider } from "@/components/hook-form";
import { LoadingDialog } from "@/components/loading";
import { HStack } from "@/components/stack";
import { Text } from "@/components/text";
import { UserBirthYearField } from "@/features/user/components/form/fields/user-birth-year-field";
import { UserDaysPerWeekField } from "@/features/user/components/form/fields/user-days-per-week-field";
import { UserGoalField } from "@/features/user/components/form/fields/user-goal-field";
import { UserHeightField } from "@/features/user/components/form/fields/user-height-field";
import { UserInjuriesField } from "@/features/user/components/form/fields/user-injuries-field";
import { UserGenderField } from "@/features/user/components/form/fields/user-gender-field";
import { UserWeightField } from "@/features/user/components/form/fields/user-weight-field";
import { useUserOnboarding } from "../hooks/useUserOnboarding";
import { CompleteStage, FormStage, StagedForm } from "./StagedForm";

export function UserOnboardingForm() {
  const { onboardingForm, stage, onStageChange, onSubmit, isSaving, isEditing } = useUserOnboarding();

  return (
    <>
      <LoadingDialog isLoading={isSaving} title="Saving...">
        <Text color="textMuted" centered>
          Updating your profile...
        </Text>
      </LoadingDialog>
      <FormProvider form={onboardingForm}>
        <StagedForm
          stage={stage}
          onStageChange={onStageChange}
          onSubmit={onSubmit}
          isSubmitting={isSaving}
          renderComplete={() =>
            isEditing ? (
              <CompleteStage title="Profile updated" message="Your plan will use your new answers." />
            ) : (
              <CompleteStage title="You're all set!" message="Your profile is ready. Let's get training." />
            )
          }
        >
          <FormStage
            currentStage={stage}
            stage={1}
            title="About you"
            message="We use these to set your starting weights and volume."
          >
            <UserGenderField />
            <UserBirthYearField />
            <HStack spacing={3} align="start">
              <Box flex>
                <UserHeightField />
              </Box>
              <Box flex>
                <UserWeightField />
              </Box>
            </HStack>
          </FormStage>
          <FormStage
            currentStage={stage}
            stage={2}
            title="Your goal"
            message="Pick what matters most right now. You can change it later."
          >
            <UserGoalField />
            <UserDaysPerWeekField />
          </FormStage>
          <FormStage
            currentStage={stage}
            stage={3}
            title="Any injuries?"
            message="Select anything that hurts or limits you, and we'll program around it."
          >
            <UserInjuriesField />
          </FormStage>
        </StagedForm>
      </FormProvider>
    </>
  );
}

export default UserOnboardingForm;

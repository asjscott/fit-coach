import { Box } from "@/components/box";
import { useWatch } from "react-hook-form";
import { FormProvider } from "@/components/hook-form";
import { LoadingDialog } from "@/components/loading";
import { HStack } from "@/components/stack";
import { Text } from "@/components/text";
import { EquipmentPresetsField } from "@/features/equipment/components/form/fields/equipment-presets-field";
import { EquipmentTagsField } from "@/features/equipment/components/form/fields/equipment-tags-field";
import { TrainingSetupField } from "@/features/equipment/components/form/fields/training-setup-field";
import { EquipmentLoadsField } from "@/features/equipment/components/form/fields/equipment-loads-field";
import { hasLoadTags } from "@/features/equipment/loads";
import { asksForLoads, selectableGroups, selectedTags } from "@/features/equipment/training-setup";
import { UserBirthYearField } from "@/features/user/components/form/fields/user-birth-year-field";
import { UserDaysPerWeekField } from "@/features/user/components/form/fields/user-days-per-week-field";
import { UserGoalField } from "@/features/user/components/form/fields/user-goal-field";
import { UserHeightField } from "@/features/user/components/form/fields/user-height-field";
import { UserInjuriesField } from "@/features/user/components/form/fields/user-injuries-field";
import { UserGenderField } from "@/features/user/components/form/fields/user-gender-field";
import { UserWeightField } from "@/features/user/components/form/fields/user-weight-field";
import { useUserOnboarding, type OnboardingValues } from "../hooks/use-user-onboarding";
import { CompleteStage, FormStage, StagedForm } from "./staged-form";

export function UserOnboardingForm() {
  const { onboardingForm, stage, onStageChange, onSubmit, isSaving, isEditing } = useUserOnboarding();
  // Which optional stages show depends on earlier answers. useWatch rather than
  // watch(), which the React Compiler memoizes and so never updates
  const trainingSetup = useWatch({ control: onboardingForm.control, name: "trainingSetup" });
  const equipment = useWatch({ control: onboardingForm.control, name: "equipment" });
  const tags = selectedTags(trainingSetup, equipment);
  // Gym has everything and no equipment has nothing, so neither is asked to pick
  const picksEquipment = trainingSetup === "home" || trainingSetup === "bodyweight";
  const asksLoads = asksForLoads(trainingSetup) && hasLoadTags(tags);

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
          <FormStage<OnboardingValues>
            fields={["gender", "birthYear", "heightCm", "weightKg"]}
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
          <FormStage<OnboardingValues>
            fields={["goal", "daysPerWeek"]}
            title="Your goal"
            message="Pick what matters most right now. You can change it later."
          >
            <UserGoalField />
            <UserDaysPerWeekField />
          </FormStage>
          <FormStage<OnboardingValues>
            fields={["trainingSetup"]}
            title="Where do you train?"
            message="We'll build your workouts around the equipment you have."
          >
            <TrainingSetupField />
          </FormStage>
          {picksEquipment && (
            <FormStage<OnboardingValues>
              fields={["equipment"]}
              title={trainingSetup === "home" ? "What equipment do you have?" : "Any bodyweight stations?"}
              message={
                trainingSetup === "home"
                  ? "Select everything you can use. Leave a category empty if you have none of it."
                  : "Select anything you can use, or leave it empty for floor work only."
              }
            >
              {trainingSetup === "home" && <EquipmentPresetsField />}
              <EquipmentTagsField groups={selectableGroups[trainingSetup]} />
            </FormStage>
          )}
          {asksLoads && (
            <FormStage<OnboardingValues>
              fields={["loads"]}
              title="What weights do you have?"
              message="So we can pick the right loads. Skip anything you're not sure of."
            >
              <EquipmentLoadsField tags={tags} />
            </FormStage>
          )}
          <FormStage<OnboardingValues>
            fields={["injuries"]}
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

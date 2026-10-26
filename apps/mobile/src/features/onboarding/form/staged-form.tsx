import { router } from "expo-router";
import { Children, createContext, isValidElement, use, useEffect, useRef, type ReactNode } from "react";
import { View, type ScrollView as RNScrollView } from "react-native";
import type { FieldPath, FieldValues } from "react-hook-form";
import { Button, ButtonBanner, ButtonText, LeftButtons, RightButtons } from "@/components/button";
import { Heading } from "@/components/heading";
import { KeyboardAwareScrollView } from "@/components/keyboard-aware-scroll-view";
import { Loading } from "@/components/loading";
import { Progress, ProgressFilledTrack } from "@/components/progress";
import { SectionLabel } from "@/components/section-label";
import { Stack } from "@/components/stack";
import { Text } from "@/components/text";
import { spacing } from "@/theme";

export type Stage = number | "complete";

// "next" carries the current stage's fields so the caller can validate just those
export type StageAction<T extends FieldValues = FieldValues> =
  { action: "previous" } | { action: "next"; fields: FieldPath<T>[] };

const StagedFormContext = createContext({ stage: 0, stageCount: 0 });

// ----------------------------------------------------------------------

type FormStageProps<T extends FieldValues = FieldValues> = {
  title: string;
  message: string;
  // Fields validated before moving on from this stage
  fields?: FieldPath<T>[];
  children?: ReactNode;
};

// One step of a StagedForm; its number comes from its position among the StagedForm's children
export function FormStage<T extends FieldValues = FieldValues>({ title, message, children }: FormStageProps<T>) {
  const { stage, stageCount } = use(StagedFormContext);

  return (
    <Stack spacing={8}>
      <Stack spacing={3}>
        <Progress value={(stage / stageCount) * 100} size="sm">
          <ProgressFilledTrack />
        </Progress>
        <SectionLabel>{`Step ${stage} of ${stageCount}`}</SectionLabel>
        <Stack spacing={1}>
          <Heading size="2xl">{title}</Heading>
          <Text color="muted">{message}</Text>
        </Stack>
      </Stack>
      <Stack spacing={5}>{children}</Stack>
    </Stack>
  );
}

// ----------------------------------------------------------------------

type CompleteStageProps = { title?: string; message?: string };

// Confirmation that sends the user home after a short pause
export function CompleteStage({
  title = "Onboarding complete!",
  message = "Thanks for setting up your profile. Welcome aboard!",
}: CompleteStageProps) {
  useEffect(() => {
    const timeout = setTimeout(() => router.replace("/"), 3000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <Stack flex centered spacing={4}>
      <Heading size="2xl" centered>
        {title}
      </Heading>
      <Text color="muted" centered>
        {message}
      </Text>
      <Stack style={{ height: 80 }}>
        <Loading />
      </Stack>
    </Stack>
  );
}

// ----------------------------------------------------------------------

type StagedFormProps<T extends FieldValues> = {
  // 1-based index into the child stages, or "complete"
  stage: Stage;
  onStageChange: (change: StageAction<T>) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  // FormStage elements, in order; only the current one is rendered
  children: ReactNode;
  renderComplete?: () => ReactNode;
};

export function StagedForm<T extends FieldValues>({
  stage,
  onStageChange,
  onSubmit,
  isSubmitting = false,
  children,
  renderComplete = () => <CompleteStage />,
}: StagedFormProps<T>) {
  const scrollRef = useRef<RNScrollView>(null);
  const stages = Children.toArray(children);
  const stageCount = stages.length;
  const showComplete = stage === "complete";
  const current = showComplete ? null : stages[stage - 1];
  const fields = (isValidElement<FormStageProps<T>>(current) && current.props.fields) || [];
  const showPrevious = !showComplete && stage > 1;
  const showNext = !showComplete && stage < stageCount;
  const showSubmit = stage === stageCount;

  // Each stage starts at the top
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [stage]);

  return (
    <StagedFormContext value={{ stage: showComplete ? stageCount : stage, stageCount }}>
      <View style={{ flex: 1 }}>
        <KeyboardAwareScrollView ref={scrollRef} contentContainerStyle={{ flexGrow: 1, paddingBottom: spacing[4] }}>
          {current}
          {showComplete && renderComplete()}
        </KeyboardAwareScrollView>

        {!showComplete && (
          <ButtonBanner style={{ paddingTop: spacing[3] }}>
            {showPrevious && (
              <LeftButtons>
                <Button action="secondary" size="lg" onPress={() => onStageChange({ action: "previous" })}>
                  <ButtonText>Back</ButtonText>
                </Button>
              </LeftButtons>
            )}
            <RightButtons>
              {showNext && (
                <Button size="lg" onPress={() => onStageChange({ action: "next", fields })}>
                  <ButtonText>Next</ButtonText>
                </Button>
              )}
              {showSubmit && (
                <Button size="lg" onPress={onSubmit} disabled={isSubmitting}>
                  <ButtonText>Finish</ButtonText>
                </Button>
              )}
            </RightButtons>
          </ButtonBanner>
        )}
      </View>
    </StagedFormContext>
  );
}

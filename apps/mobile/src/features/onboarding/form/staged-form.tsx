import { router } from "expo-router";
import { Children, isValidElement, useEffect, useState, type ReactNode } from "react";
import { View } from "react-native";
import type { FieldPath, FieldValues } from "react-hook-form";
import { Button, ButtonBanner, ButtonText, LeftButtons, RightButtons } from "@/components/button";
import { CompactChoiceCards } from "@/components/choice-cards";
import { Heading } from "@/components/heading";
import { KeyboardAwareScrollView } from "@/components/keyboard-aware-scroll-view";
import { Loading } from "@/components/loading";
import { Pressable } from "@/components/pressable";
import { Progress, ProgressFilledTrack } from "@/components/progress";
import { SectionLabel } from "@/components/section-label";
import { HStack, Stack } from "@/components/stack";
import { Text } from "@/components/text";
import { spacing } from "@/theme";

export type Stage = number | "complete";

// "next" carries the current stage's fields so the caller can validate just those
export type StageAction<T extends FieldValues = FieldValues> =
  { action: "previous" } | { action: "next"; fields: FieldPath<T>[] };

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
  return (
    <Stack spacing={4}>
      <Stack spacing={1}>
        <Heading size="2xl">{title}</Heading>
        <Text size="sm" color="muted">
          {message}
        </Text>
      </Stack>
      <Stack spacing={3}>{children}</Stack>
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

// Scrolls a stage that runs past the screen, after shrinking its cards in case that's enough to fit it (#71)
function StageBody({ children }: { children: ReactNode }) {
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [compact, setCompact] = useState(false);
  // Stays compact once set: going back to large would only overflow again
  if (!compact && viewportHeight > 0 && contentHeight > viewportHeight) setCompact(true);

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={{ flexGrow: 1, paddingBottom: spacing[4] }}
      onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
      onContentSizeChange={(_width, height) => setContentHeight(height)}
    >
      <CompactChoiceCards value={compact}>{children}</CompactChoiceCards>
    </KeyboardAwareScrollView>
  );
}

// ----------------------------------------------------------------------

type StagedFormProps<T extends FieldValues> = {
  // 1-based index into the child stages, or "complete"
  stage: Stage;
  onStageChange: (change: StageAction<T>) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  // Leaves the form; always shown, including on the complete stage
  exit: { label: string; onPress: () => void };
  // FormStage elements, in order; only the current one is rendered
  children: ReactNode;
  renderComplete?: () => ReactNode;
};

export function StagedForm<T extends FieldValues>({
  stage,
  onStageChange,
  onSubmit,
  isSubmitting = false,
  exit,
  children,
  renderComplete = () => <CompleteStage />,
}: StagedFormProps<T>) {
  const stages = Children.toArray(children);
  const stageCount = stages.length;
  const showComplete = stage === "complete";
  const current = showComplete ? null : stages[stage - 1];
  const fields = (isValidElement<FormStageProps<T>>(current) && current.props.fields) || [];
  const showPrevious = !showComplete && stage > 1;
  const showNext = !showComplete && stage < stageCount;
  const showSubmit = stage === stageCount;

  return (
    <View style={{ flex: 1 }}>
      {/* Pinned, and a touch target tall (#56): the steps fit on one screen on the smallest phone only without a
          separate row for each of these (#71) */}
      <Stack spacing={1} style={{ paddingBottom: spacing[3] }}>
        <HStack justify="between">
          {!showComplete && <SectionLabel>{`Step ${stage} of ${stageCount}`}</SectionLabel>}
          {/* Body-sized and muted so it doesn't compete with the stage's title */}
          <Pressable
            accessibilityRole="button"
            onPress={exit.onPress}
            style={{ minHeight: 44, justifyContent: "center", marginLeft: "auto" }}
          >
            <Text weight="medium" color="muted">
              {exit.label}
            </Text>
          </Pressable>
        </HStack>
        {!showComplete && (
          <Progress value={(stage / stageCount) * 100} size="sm">
            <ProgressFilledTrack />
          </Progress>
        )}
      </Stack>

      {/* Keyed so each stage starts at the top, measured afresh */}
      <StageBody key={stage}>
        {current}
        {showComplete && renderComplete()}
      </StageBody>

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
  );
}

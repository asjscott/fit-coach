import { router } from "expo-router";
import { Children, createContext, use, useEffect, useRef, type ReactNode } from "react";
import { View, type ScrollView as RNScrollView } from "react-native";
import { Button, ButtonBanner, ButtonText, LeftButtons, RightButtons } from "@/components/button";
import { Heading } from "@/components/heading";
import { KeyboardAwareScrollView } from "@/components/keyboard-aware-scroll-view";
import { Loading } from "@/components/loading";
import { Progress, ProgressFilledTrack } from "@/components/progress";
import { Stack } from "@/components/stack";
import { Text } from "@/components/text";
import { spacing } from "@/theme";

export type Stage = number | "complete";

export type StageAction = { action: "next" | "previous" };

const StagedFormContext = createContext({ stageCount: 0 });

// ----------------------------------------------------------------------

type FormStageProps = {
  currentStage: Stage;
  stage: number;
  title: string;
  message: string;
  children?: ReactNode;
};

// Renders only while it is the current stage
export function FormStage({ currentStage, stage, title, message, children }: FormStageProps) {
  const { stageCount } = use(StagedFormContext);
  if (currentStage !== stage) return null;

  return (
    <Stack spacing={8}>
      <Stack spacing={3}>
        <Progress value={(stage / stageCount) * 100} size="sm">
          <ProgressFilledTrack />
        </Progress>
        <Text size="xs" weight="medium" color="textSubtle">
          STEP {stage} OF {stageCount}
        </Text>
        <Stack spacing={1}>
          <Heading size="2xl">{title}</Heading>
          <Text color="textMuted">{message}</Text>
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
      <Text color="textMuted" centered>
        {message}
      </Text>
      <Stack style={{ height: 80 }}>
        <Loading />
      </Stack>
    </Stack>
  );
}

// ----------------------------------------------------------------------

type StagedFormProps = {
  // 1-based index corresponding to child stages, or "complete"
  stage: Stage;
  onStageChange: (change: StageAction) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  // Form stage components; they control their own visibility, e.g. FormStage above
  children: ReactNode;
  renderComplete?: () => ReactNode;
};

export function StagedForm({
  stage,
  onStageChange,
  onSubmit,
  isSubmitting = false,
  children,
  renderComplete = () => <CompleteStage />,
}: StagedFormProps) {
  const scrollRef = useRef<RNScrollView>(null);
  const stageCount = Children.toArray(children).length;
  const showComplete = stage === "complete";
  const showPrevious = !showComplete && stage > 1;
  const showNext = !showComplete && stage < stageCount;
  const showSubmit = stage === stageCount;

  // Each stage starts at the top
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [stage]);

  return (
    <StagedFormContext value={{ stageCount }}>
      <View style={{ flex: 1 }}>
        <KeyboardAwareScrollView ref={scrollRef} contentContainerStyle={{ flexGrow: 1, paddingBottom: spacing[4] }}>
          {children}
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
                <Button size="lg" onPress={() => onStageChange({ action: "next" })}>
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

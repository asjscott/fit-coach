import { Heading } from "@/components/heading";
import { Progress, ProgressFilledTrack } from "@/components/progress";
import { Stack } from "@/components/stack";
import { Text } from "@/components/text";

const TOTAL_STEPS = 3;

type StepHeaderProps = { step: number; title: string; subtitle: string };

export function StepHeader({ step, title, subtitle }: StepHeaderProps) {
  return (
    <Stack spacing={3}>
      <Progress value={(step / TOTAL_STEPS) * 100} size="sm">
        <ProgressFilledTrack />
      </Progress>
      <Text size="xs" weight="medium" color="textSubtle">
        STEP {step} OF {TOTAL_STEPS}
      </Text>
      <Stack spacing={1}>
        <Heading size="2xl">{title}</Heading>
        <Text color="textMuted">{subtitle}</Text>
      </Stack>
    </Stack>
  );
}

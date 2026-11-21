import type { ActivityLevel } from "@fit/shared";
import { useState } from "react";
import { Card } from "@/components/card";
import { ChoiceCards, CompactChoiceCards } from "@/components/choice-cards";
import { Heading } from "@/components/heading";
import { Stack } from "@/components/stack";
import { Text } from "@/components/text";
import { useToast } from "@/contexts/toast-context";
import {
  ACTIVITY_LEVEL_NOTE,
  activityLevelOptions,
} from "@/features/user/components/form/fields/user-activity-level-field";
import { useCurrentUser } from "@/features/user/current-user-provider";
import { TodayCardLink } from "./today-card";

// Asks a user who has no Activity Level for one, once: picking a level saves it, and "Not now" never asks again
export function ActivityLevelCard({ onSkip }: { onSkip: () => void }) {
  const { updateUser } = useCurrentUser();
  const { showToast } = useToast();
  const [chosen, setChosen] = useState<ActivityLevel | undefined>(undefined);

  const choose = async (activityLevel: ActivityLevel) => {
    setChosen(activityLevel);
    try {
      await updateUser({ profile: { activityLevel } });
    } catch (err) {
      setChosen(undefined);
      showToast("Couldn't save how active you are", { error: err });
    }
  };

  return (
    <Card>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Heading size="md">How active are you?</Heading>
          <Text size="sm" color="muted">
            {`It sets your daily calories. ${ACTIVITY_LEVEL_NOTE}`}
          </Text>
        </Stack>
        <CompactChoiceCards value>
          <ChoiceCards options={activityLevelOptions} value={chosen} onChange={choose} />
        </CompactChoiceCards>
        <TodayCardLink label="Not now" color="muted" size="sm" onPress={onSkip} />
      </Stack>
    </Card>
  );
}

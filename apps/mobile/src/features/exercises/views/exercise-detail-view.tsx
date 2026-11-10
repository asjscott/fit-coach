import { Stack as RouterStack, useLocalSearchParams } from "expo-router";
import type { ReactNode } from "react";
import { ButtonGroup } from "@/components/button";
import { Divider } from "@/components/divider";
import { Heading } from "@/components/heading";
import { Icon } from "@/components/icons";
import { Loading } from "@/components/loading";
import { LoadingButton } from "@/components/loading-button";
import { Screen } from "@/components/screen";
import { SectionLabel } from "@/components/section-label";
import { HStack, Stack } from "@/components/stack";
import { Text } from "@/components/text";
import { useExercise } from "../hooks/use-exercises";
import { equipmentInWords, muscleLabel, patternLabels, RECOVERY_LABEL } from "../labels";

export default function ExerciseDetailView() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { exercise, error, isLoading } = useExercise(slug);

  if (isLoading) return <Loading message="Loading Exercise…" />;
  if (!exercise) {
    return (
      <Screen edges={["bottom"]}>
        <Text color="danger">{error}</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll="screen" edges={["bottom"]}>
      <RouterStack.Screen options={{ title: exercise.name }} />
      <Stack spacing={5} flex>
        <Stack spacing={2}>
          <Stack spacing={1}>
            <Heading size="2xl">{exercise.name}</Heading>
            <Text color="muted">
              {exercise.recovery ? RECOVERY_LABEL : exercise.patterns.map((p) => patternLabels[p.pattern]).join(" · ")}
            </Text>
          </Stack>
          {/* One line until there's a video to show, so it doesn't push the Exercise down */}
          <HStack spacing={2}>
            <Icon name="video" color="subtle" size={16} />
            <Text size="sm" color="subtle">
              Video coming soon
            </Text>
          </HStack>
        </Stack>

        <Section title="Primary muscles">
          <Text>{exercise.muscles.primary.map(muscleLabel).join(", ")}</Text>
        </Section>

        <Section title="Equipment">
          <Text>{equipmentInWords(exercise.equipmentOptions)}</Text>
        </Section>

        {exercise.cues.length > 0 && (
          <Section title="Cues">
            <Stack spacing={2}>
              {exercise.cues.map((cue, i) => (
                <HStack key={cue} spacing={3} align="start">
                  <Text weight="semiBold" color="accent" style={{ minWidth: 16 }}>
                    {i + 1}
                  </Text>
                  <Text style={{ flexShrink: 1 }}>{cue}</Text>
                </HStack>
              ))}
            </Stack>
          </Section>
        )}

        {!!(exercise.regression || exercise.progression) && (
          <ButtonGroup space={2} flexDirection="row" style={{ marginTop: "auto" }}>
            {!!exercise.regression && (
              <LoadingButton
                label="Easier"
                action="secondary"
                icon="chevronDown"
                href={`/exercises/${exercise.regression}`}
                style={{ flex: 1 }}
              />
            )}
            {!!exercise.progression && (
              <LoadingButton
                label="Harder"
                action="secondary"
                icon="chevronUp"
                href={`/exercises/${exercise.progression}`}
                style={{ flex: 1 }}
              />
            )}
          </ButtonGroup>
        )}
      </Stack>
    </Screen>
  );
}

// A labelled block under a hairline
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack spacing={3}>
      <Divider />
      <SectionLabel>{title}</SectionLabel>
      {children}
    </Stack>
  );
}

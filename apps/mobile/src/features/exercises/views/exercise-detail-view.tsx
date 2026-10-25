import { Stack as RouterStack, useLocalSearchParams } from "expo-router";
import type { ReactNode } from "react";
import { useWindowDimensions, View } from "react-native";
import { ButtonGroup } from "@/components/button";
import { Heading } from "@/components/heading";
import { Loading } from "@/components/loading";
import { LoadingButton } from "@/components/loading-button";
import { Screen } from "@/components/screen";
import { SectionLabel } from "@/components/section-label";
import { HStack, Stack } from "@/components/stack";
import { Text } from "@/components/text";
import { spacing, useTheme } from "@/theme";
import { useExercise } from "../hooks/use-exercises";
import { equipmentInWords, muscleLabel, patternLabels } from "../labels";

export default function ExerciseDetailView() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { exercise, error, isLoading } = useExercise(slug);
  const { colors } = useTheme();
  // Full-width 16:9 at most; the box shrinks into whatever height is left so the screen never scrolls
  const { width } = useWindowDimensions();
  const maxVideoHeight = ((width - spacing[6] * 2) * 9) / 16;

  if (isLoading) return <Loading message="Loading exercise..." />;
  if (!exercise) {
    return (
      <Screen edges={["bottom"]}>
        <Text color="danger">{error}</Text>
      </Screen>
    );
  }

  return (
    <Screen edges={["bottom"]}>
      <RouterStack.Screen options={{ title: exercise.name }} />
      <Stack spacing={4} flex>
        <Stack spacing={1}>
          <Heading size="2xl">{exercise.name}</Heading>
          <Text color="muted">{exercise.patterns.map((p) => patternLabels[p.pattern]).join(" · ")}</Text>
        </Stack>

        <View
          style={{
            flexShrink: 1,
            height: maxVideoHeight,
            minHeight: 64,
            borderRadius: spacing[3],
            backgroundColor: colors.line,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text weight="semiBold" color="muted">
            Video coming soon
          </Text>
        </View>

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
                  <Text weight="semiBold" color="accent">
                    {i + 1}.
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack spacing={2}>
      <SectionLabel>{title}</SectionLabel>
      {children}
    </Stack>
  );
}

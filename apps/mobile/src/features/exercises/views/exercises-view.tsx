import { Pattern, type Exercise } from "@fit/shared";
import { isAvailable } from "@fit/engines";
import { router } from "expo-router";
import { useState } from "react";
import { SectionList } from "react-native";
import { Card } from "@/components/card";
import { Loading } from "@/components/loading";
import { Pressable } from "@/components/pressable";
import { Screen } from "@/components/screen";
import { HStack, Stack } from "@/components/stack";
import { Switch } from "@/components/switch";
import { Text } from "@/components/text";
import { useCurrentUser } from "@/features/user/current-user-provider";
import { spacing, useTheme } from "@/theme";
import { useExercises } from "../hooks/use-exercises";
import { patternLabels } from "../labels";
import { neededEquipment } from "../needed-equipment";

type Row = { exercise: Exercise; available: boolean };

// Sections in Pattern order; each exercise appears once, under its first pattern
function groupByPattern(rows: Row[]) {
  return Pattern.options
    .map((pattern) => ({
      title: patternLabels[pattern],
      data: rows.filter((row) => row.exercise.patterns[0].pattern === pattern),
    }))
    .filter((section) => section.data.length > 0);
}

export default function ExercisesView() {
  const { user } = useCurrentUser();
  const { exercises, error, isLoading } = useExercises();
  const { colors } = useTheme();
  const [showAll, setShowAll] = useState(false);

  // No primary profile counts as no equipment
  const tags = user?.equipmentProfiles.find((p) => p.isPrimary)?.tags ?? [];
  const rows = (exercises ?? []).map((exercise) => ({ exercise, available: isAvailable(exercise, { tags }) }));
  const availableCount = rows.filter((row) => row.available).length;
  const sections = groupByPattern(showAll ? rows : rows.filter((row) => row.available));

  if (isLoading) return <Loading message="Loading exercises..." />;

  return (
    <Screen padded={false} edges={["bottom"]}>
      <SectionList
        sections={sections}
        keyExtractor={(row) => row.exercise.slug}
        contentContainerStyle={{ padding: spacing[6], gap: spacing[2] }}
        ListHeaderComponent={
          <Stack spacing={2} style={{ marginBottom: spacing[2] }}>
            <HStack justify="between" align="center">
              <Text weight="semiBold">Show all</Text>
              <Switch value={showAll} onValueChange={setShowAll} accessibilityLabel="Show all exercises" />
            </HStack>
            {error ? (
              <Text color="danger">{error}</Text>
            ) : (
              <Text size="sm" color="textMuted">
                {availableCount} of {rows.length} exercises match your equipment
              </Text>
            )}
          </Stack>
        }
        renderSectionHeader={({ section }) => (
          <Text
            size="xs"
            weight="semiBold"
            color="textSubtle"
            style={{ backgroundColor: colors.bg, paddingTop: spacing[4], paddingBottom: spacing[1] }}
          >
            {section.title.toUpperCase()}
          </Text>
        )}
        renderItem={({ item: { exercise, available } }) => (
          <Pressable accessibilityRole="link" onPress={() => router.push(`/exercises/${exercise.slug}`)}>
            <Card size="sm" style={!available && { opacity: 0.5 }}>
              <Text weight="semiBold">{exercise.name}</Text>
              {!available && (
                <Text size="sm" color="textMuted">
                  Needs: {neededEquipment(exercise, tags)}
                </Text>
              )}
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={
          error ? null : (
            <Text color="textMuted" centered style={{ marginTop: spacing[6] }}>
              Nothing matches your equipment yet. Turn on Show all to see everything.
            </Text>
          )
        }
      />
    </Screen>
  );
}

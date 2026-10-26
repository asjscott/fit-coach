import { router } from "expo-router";
import { useState } from "react";
import { SectionList, View } from "react-native";
import { Loading } from "@/components/loading";
import { Screen } from "@/components/screen";
import { SectionLabel } from "@/components/section-label";
import { HStack, Stack } from "@/components/stack";
import { Switch } from "@/components/switch";
import { Text } from "@/components/text";
import { useCurrentUser } from "@/features/user/current-user-provider";
import { spacing, useTheme } from "@/theme";
import { ExerciseRow } from "../components/exercise-row";
import { useExercises } from "../hooks/use-exercises";
import { librarySections } from "../library-sections";
import { neededEquipment } from "../needed-equipment";

export default function ExercisesView() {
  const { user } = useCurrentUser();
  const { exercises, error, isLoading } = useExercises();
  const { colors } = useTheme();
  const [showAll, setShowAll] = useState(false);

  // No primary profile counts as no equipment
  const tags = user?.equipmentProfiles.find((p) => p.isPrimary)?.tags ?? [];
  const { sections, availableCount, total } = librarySections(exercises ?? [], { tags, showAll });

  if (isLoading) return <Loading message="Loading Exercises…" />;

  return (
    <Screen padded={false} edges={["bottom"]}>
      <SectionList
        sections={sections}
        keyExtractor={(row) => row.exercise.slug}
        contentContainerStyle={{ paddingHorizontal: spacing[6], paddingBottom: spacing[6] }}
        ListHeaderComponent={
          <Stack spacing={1} style={{ paddingTop: spacing[4] }}>
            <HStack justify="between" align="center" style={{ minHeight: 44 }}>
              <Text weight="semiBold">Show all</Text>
              <Switch value={showAll} onValueChange={setShowAll} accessibilityLabel="Show all exercises" />
            </HStack>
            {error ? (
              <Text color="danger">{error}</Text>
            ) : (
              <Text size="sm" color="muted">
                {availableCount} of {total} Exercises match your equipment
              </Text>
            )}
          </Stack>
        }
        renderSectionHeader={({ section }) => (
          // Opaque, so rows scroll under it where headers stick
          <View style={{ backgroundColor: colors.bg, paddingTop: spacing[6], paddingBottom: spacing[2] }}>
            <SectionLabel right={`${section.data.length}`}>{section.title}</SectionLabel>
          </View>
        )}
        renderItem={({ item: { exercise, available } }) => (
          <ExerciseRow
            accessibilityRole="link"
            name={exercise.name}
            unavailable={!available}
            detail={available ? undefined : `Needs: ${neededEquipment(exercise, tags)}`}
            chevron
            onPress={() => router.push(`/exercises/${exercise.slug}`)}
          />
        )}
        ListEmptyComponent={
          error ? null : (
            <Text color="muted" centered style={{ marginTop: spacing[6] }}>
              Nothing matches your equipment yet. Turn on Show all to see everything.
            </Text>
          )
        }
      />
    </Screen>
  );
}

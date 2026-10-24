import type { Workout } from "@fit/shared";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { FlatList } from "react-native";
import { Card } from "@/components/card";
import { Loading } from "@/components/loading";
import { Pressable } from "@/components/pressable";
import { Screen } from "@/components/screen";
import { HStack } from "@/components/stack";
import { Spinner } from "@/components/spinner";
import { Text } from "@/components/text";
import { spacing } from "@/theme";
import { dateLabel, durationLabel } from "../format";
import { useHistory } from "../history-provider";
import { libraryExercise } from "../library";

// An Exercise this app version doesn't know shows as its slug
const exerciseNames = (workout: Workout) =>
  workout.workoutExercises.map(({ slug }) => libraryExercise(slug)?.name ?? slug).join(", ");

export default function HistoryView() {
  const { workouts, error, isLoading, isLoadingMore, refresh, loadMore } = useHistory();

  // Reload on every visit, so a Workout just finished shows at the top
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  if (isLoading) return <Loading message="Loading history..." />;

  return (
    <Screen padded={false} edges={["bottom"]}>
      <FlatList
        data={workouts ?? []}
        keyExtractor={(workout) => workout.id}
        contentContainerStyle={{ padding: spacing[6], gap: spacing[2] }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={error ? <Text color="danger">{error}</Text> : null}
        renderItem={({ item: workout }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/history/[id]", params: { id: workout.id } })}
          >
            <Card size="sm">
              <HStack justify="between" spacing={4}>
                <Text weight="semiBold">{dateLabel(workout.startedAt)}</Text>
                <Text color="textMuted" tabular>
                  {durationLabel(workout)}
                </Text>
              </HStack>
              <Text size="sm" color="textMuted">
                {exerciseNames(workout)}
              </Text>
            </Card>
          </Pressable>
        )}
        ListFooterComponent={isLoadingMore ? <Spinner /> : null}
        ListEmptyComponent={
          error ? null : (
            <Text color="textMuted" centered style={{ marginTop: spacing[6] }}>
              No workouts yet. Finished workouts show up here.
            </Text>
          )
        }
      />
    </Screen>
  );
}

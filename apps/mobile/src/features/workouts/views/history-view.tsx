import type { Workout } from "@fit/shared";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { FlatList } from "react-native";
import { Card } from "@/components/card";
import { Loading } from "@/components/loading";
import { Screen } from "@/components/screen";
import { HStack } from "@/components/stack";
import { Spinner } from "@/components/spinner";
import { Text } from "@/components/text";
import { spacing } from "@/theme";
import { useHistory } from "../hooks/use-history";
import { libraryExercise } from "../library";

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });

const durationLabel = ({ startedAt, endedAt }: Workout) => {
  const minutes = Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return rest ? `${Math.floor(minutes / 60)} h ${rest} min` : `${minutes / 60} h`;
};

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

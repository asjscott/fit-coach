import type { Workout } from "@fit/shared";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList } from "react-native";
import { Alert, AlertText } from "@/components/alert";
import { Badge, BadgeText } from "@/components/badge";
import { Button, ButtonText } from "@/components/button";
import { Card } from "@/components/card";
import { Loading } from "@/components/loading";
import { Pressable } from "@/components/pressable";
import { Screen } from "@/components/screen";
import { HStack } from "@/components/stack";
import { Spinner } from "@/components/spinner";
import { Text } from "@/components/text";
import { useToast } from "@/contexts/toast-context";
import { spacing } from "@/theme";
import { dateLabel, durationLabel } from "../format";
import { useHistory } from "../history-provider";
import { libraryExercise } from "../library";
import { useLogbook } from "../logbook-provider";

// An Exercise this app version doesn't know shows as its slug
const exerciseNames = (workout: Workout) =>
  workout.workoutExercises
    .map(({ slug }) => libraryExercise(slug)?.name ?? slug)
    .join(", ");

type Row = { workout: Workout; isPending: boolean };

export default function HistoryView() {
  const { workouts, error, isLoading, isLoadingMore, refresh, loadMore } =
    useHistory();
  const { pending } = useLogbook();

  // Reload on every visit, so a Workout just finished shows at the top
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // A Pending Workout that just uploaded leaves the phone; reload so it shows from the server
  const pendingCount = useRef(pending.length);
  useEffect(() => {
    if (pending.length < pendingCount.current) refresh();
    pendingCount.current = pending.length;
  }, [pending.length, refresh]);

  if (isLoading && !pending.length)
    return <Loading message="Loading history..." />;

  // Pending Workouts on top, newest first; a Workout the server already has shows once
  const pendingIds = new Set(pending.map((w) => w.id));
  const isOffline = !workouts && !!error;
  const rows: Row[] = [
    ...[...pending].reverse().map((workout) => ({ workout, isPending: true })),
    ...(workouts ?? [])
      .filter((w) => !pendingIds.has(w.id))
      .map((workout) => ({ workout, isPending: false })),
  ];

  return (
    <Screen padded={false} edges={["bottom"]}>
      <FlatList
        data={rows}
        keyExtractor={({ workout }) => workout.id}
        contentContainerStyle={{ padding: spacing[6], gap: spacing[2] }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          isOffline ? (
            <Alert action="muted">
              <AlertText>
                Showing only workouts on this phone. The rest of your history
                needs a connection.
              </AlertText>
            </Alert>
          ) : error ? (
            <Text color="danger">{error}</Text>
          ) : null
        }
        renderItem={({ item }) => <WorkoutCard {...item} />}
        ListFooterComponent={isLoadingMore || isLoading ? <Spinner /> : null}
        ListEmptyComponent={
          error || isLoading ? null : (
            <Text color="textMuted" centered style={{ marginTop: spacing[6] }}>
              No workouts yet. Finished workouts show up here.
            </Text>
          )
        }
      />
    </Screen>
  );
}

function WorkoutCard({ workout, isPending }: Row) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        router.push({ pathname: "/history/[id]", params: { id: workout.id } })
      }
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
        {isPending ? <PendingActions workoutId={workout.id} /> : null}
      </Card>
    </Pressable>
  );
}

// A Pending Workout can be deleted even offline, so a mistake never uploads
function PendingActions({ workoutId }: { workoutId: string }) {
  const { deletePending } = useLogbook();
  const { showToast } = useToast();
  const [confirming, setConfirming] = useState(false);

  const handleDelete = async () => {
    try {
      await deletePending(workoutId);
    } catch (err) {
      showToast("Couldn't delete the workout", { error: err });
    }
  };

  return (
    <HStack justify="between" spacing={2}>
      <Badge action="warning" size="sm">
        <BadgeText>Not uploaded yet</BadgeText>
      </Badge>
      {confirming ? (
        <HStack spacing={2}>
          <Button
            size="xs"
            action="default"
            variant="outline"
            onPress={() => setConfirming(false)}
          >
            <ButtonText>Keep</ButtonText>
          </Button>
          <Button size="xs" action="negative" onPress={handleDelete}>
            <ButtonText>Delete</ButtonText>
          </Button>
        </HStack>
      ) : (
        <Button
          size="xs"
          action="negative"
          variant="link"
          onPress={() => setConfirming(true)}
        >
          <ButtonText>Delete</ButtonText>
        </Button>
      )}
    </HStack>
  );
}

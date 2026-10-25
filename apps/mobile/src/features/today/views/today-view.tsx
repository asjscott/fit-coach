import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Heading } from "@/components/heading";
import { LoadingButton } from "@/components/loading-button";
import { Screen } from "@/components/screen";
import { Stack } from "@/components/stack";
import { Text } from "@/components/text";
import { useToast } from "@/contexts/toast-context";
import { ForgottenWorkoutModal } from "@/features/workouts/components/forgotten-workout-modal";
import { useLogbook } from "@/features/workouts/logbook-provider";

export default function TodayView() {
  const logbook = useLogbook();
  const { showToast } = useToast();
  const [starting, setStarting] = useState(false);
  const [forgotten, setForgotten] = useState(false);
  const { isLoaded, isStale } = logbook;

  // A forgotten Workout must be finished or discarded before the user carries on
  useEffect(() => {
    if (isLoaded) isStale().then(setForgotten, () => {});
  }, [isLoaded, isStale]);

  // Resuming just opens the Workout, unless it was forgotten; starting saves a new one
  // on the phone first
  const handleWorkout = async () => {
    if (logbook.workout && (await isStale())) {
      setForgotten(true);
      return;
    }
    if (!logbook.workout) {
      setStarting(true);
      try {
        await logbook.start();
      } catch (err) {
        showToast("Couldn't start a Workout", { error: err });
        return;
      } finally {
        setStarting(false);
      }
    }
    router.push("/workout");
  };

  return (
    <Screen scroll edges={["top"]}>
      <Stack spacing={6}>
        <Stack spacing={1}>
          <Heading size="2xl">Today</Heading>
          <Text color="muted">
            {new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}
          </Text>
        </Stack>
        <LoadingButton
          label={logbook.workout ? "Resume workout" : "Start workout"}
          icon="dumbbell"
          loading={!logbook.isLoaded || starting}
          onPress={handleWorkout}
        />
      </Stack>
      <ForgottenWorkoutModal isOpen={forgotten} onDone={() => setForgotten(false)} />
    </Screen>
  );
}

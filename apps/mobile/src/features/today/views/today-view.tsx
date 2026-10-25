import { lastWorkout, thisWeek, withPending } from "@fit/engines";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { Divider } from "@/components/divider";
import { Heading } from "@/components/heading";
import { LoadingButton } from "@/components/loading-button";
import { Screen } from "@/components/screen";
import { Spinner } from "@/components/spinner";
import { Text } from "@/components/text";
import { useToast } from "@/contexts/toast-context";
import { useCurrentUser } from "@/features/user/current-user-provider";
import { ForgottenWorkoutModal } from "@/features/workouts/components/forgotten-workout-modal";
import { useHistory } from "@/features/workouts/history-provider";
import { useRefreshHistory } from "@/features/workouts/hooks/use-refresh-history";
import { useLogbook } from "@/features/workouts/logbook-provider";
import { spacing } from "@/theme";
import { LastWorkoutSection } from "../components/last-workout-section";
import { ThisWeekSection } from "../components/this-week-section";
import { todayStatus, type TodayState } from "../today-status";

// The training hub: Start or Resume, this week against the user's days per week, and the last Workout
export default function TodayView() {
  const logbook = useLogbook();
  const { showToast } = useToast();
  const [starting, setStarting] = useState(false);
  const [forgotten, setForgotten] = useState(false);
  const { isLoaded, isStale, pending } = logbook;
  const { workouts, error } = useHistory();
  const daysPerWeek = useCurrentUser().user?.profile.daysPerWeek;
  useRefreshHistory();

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

  // The same Workouts as History: Pending ones, then those loaded from the server (none offline, ADR 0001)
  const now = new Date();
  const all = withPending(pending, workouts);
  const week = thisWeek(all, now, daysPerWeek);
  const last = lastWorkout(all);
  const state: TodayState = workouts ? (all.length ? "loaded" : "first-run") : error ? "offline" : "loading";
  const status = todayStatus({ state, workoutCount: week.workoutCount, target: week.target });

  return (
    <Screen scroll edges={["top"]}>
      <View style={{ gap: spacing[1] }}>
        <Text size="sm" weight="semiBold" color="muted">
          {now.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}
        </Text>
        <Heading size="2xl">Today</Heading>
      </View>
      <View style={{ marginTop: spacing[5], gap: spacing[2] }}>
        <LoadingButton
          label={logbook.workout ? "Resume workout" : "Start workout"}
          icon="dumbbell"
          fullWidth
          loading={!logbook.isLoaded || starting}
          onPress={handleWorkout}
        />
        {status ? (
          <Text size="sm" color="muted">
            {status}
          </Text>
        ) : null}
      </View>
      <Divider spacing={6} />
      {state === "loading" ? (
        <Spinner />
      ) : (
        <>
          <ThisWeekSection week={week} state={state} now={now} />
          <Divider spacing={6} />
          <LastWorkoutSection workout={last} isOffline={state === "offline"} now={now} />
        </>
      )}
      <ForgottenWorkoutModal isOpen={forgotten} onDone={() => setForgotten(false)} />
    </Screen>
  );
}

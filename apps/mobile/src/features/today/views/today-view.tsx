import { assessmentOffer, lastWorkout, offerKey, restDay, thisWeek, withPending } from "@fit/engines";
import { router } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import { Divider } from "@/components/divider";
import { Heading } from "@/components/heading";
import { LoadingButton } from "@/components/loading-button";
import { Screen } from "@/components/screen";
import { Spinner } from "@/components/spinner";
import { Text } from "@/components/text";
import { useChosenTests } from "@/features/assessment/hooks/use-chosen-tests";
import { useLatestAssessment } from "@/features/assessment/hooks/use-latest-assessment";
import { useCurrentUser } from "@/features/user/current-user-provider";
import { ForgottenWorkoutModal } from "@/features/workouts/components/forgotten-workout-modal";
import { useHistory } from "@/features/workouts/history-provider";
import { useResumeWorkout, useStartPlannedWorkout, useStartWorkout } from "@/features/workouts/hooks/use-open-workout";
import { useRefreshHistory } from "@/features/workouts/hooks/use-refresh-history";
import { useLogbook } from "@/features/workouts/logbook-provider";
import { spacing } from "@/theme";
import { LastWorkoutSection } from "../components/last-workout-section";
import { PlannedWorkoutSection } from "../components/planned-workout-section";
import { RestDaySection } from "../components/rest-day-section";
import { ThisWeekSection } from "../components/this-week-section";
import { todayState, todayStatus } from "../today-status";
import { AssessmentSection } from "../components/assessment-section";
import { useDismissedOffer } from "../hooks/use-dismissed-offer";
import { usePlannedWorkout } from "../hooks/use-planned-workout";

// The training hub: Resume, the Planned Workout to start once there is one, else a Manual Workout to start, then this
// week against the user's days per week, and the last Workout
export default function TodayView() {
  const logbook = useLogbook();
  const { startWorkout, starting } = useStartWorkout();
  const { startPlannedWorkout, startingPlan } = useStartPlannedWorkout();
  const { resumeWorkout, forgotten, setForgotten } = useResumeWorkout();
  const { isLoaded, isStale, pending } = logbook;
  const { workouts, error } = useHistory();
  const daysPerWeek = useCurrentUser().user?.profile.daysPerWeek;
  const { latest: latestAssessment } = useLatestAssessment();
  const latestPlan = usePlannedWorkout();
  const { dismissed, dismiss } = useDismissedOffer();
  const tests = useChosenTests();
  useRefreshHistory();

  // A Workout under way is what's on offer, so Resume stands alone until it's finished or discarded
  const plannedWorkout = isLoaded && !logbook.workout ? latestPlan : null;

  // A forgotten Workout must be finished or discarded before the user carries on
  useEffect(() => {
    if (isLoaded) isStale().then(setForgotten, () => {});
  }, [isLoaded, isStale, setForgotten]);

  const handleWorkout = async () => {
    if (logbook.workout) await resumeWorkout();
    else if (await startWorkout()) router.push("/workout");
  };

  const handleStartPlan = async () => {
    if (plannedWorkout && (await startPlannedWorkout(plannedWorkout))) router.push("/workout");
  };

  // The same Workouts as History: Pending ones, then those loaded from the server (none offline, ADR 0001)
  const now = new Date();
  const all = withPending(pending, workouts);
  const week = thisWeek(all, now, daysPerWeek);
  const last = lastWorkout(all);
  const state = todayState({ historyLoaded: workouts !== null, failed: !!error, workoutCount: all.length });
  const status = todayStatus({ state, workoutCount: week.workoutCount, target: week.target });
  const restDayReason = plannedWorkout && !logbook.workout ? restDay(all, now, daysPerWeek) : null;
  const offer =
    dismissed === undefined
      ? null
      : assessmentOffer({
          workouts: all,
          historyLoaded: workouts !== null,
          latestAssessment: latestAssessment && latestAssessment.assessment,
          now,
          tests,
          dismissed,
        });

  return (
    <Screen scroll="screen" edges={["top"]}>
      <View style={{ gap: spacing[1] }}>
        <Text size="sm" weight="semiBold" color="muted">
          {now.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}
        </Text>
        <Heading size="2xl">Today</Heading>
      </View>
      <View style={{ marginTop: spacing[5], gap: spacing[2] }}>
        {plannedWorkout ? null : (
          <LoadingButton
            label={logbook.workout ? "Resume workout" : "Start workout"}
            icon="dumbbell"
            fullWidth
            loading={!logbook.isLoaded || starting}
            onPress={handleWorkout}
          />
        )}
        {status ? (
          <Text size="sm" color="muted">
            {status}
          </Text>
        ) : null}
      </View>
      {restDayReason ? (
        <View style={{ marginTop: spacing[5] }}>
          <RestDaySection reason={restDayReason} />
        </View>
      ) : null}
      {plannedWorkout ? (
        <View style={{ marginTop: spacing[5] }}>
          <PlannedWorkoutSection
            plannedWorkout={plannedWorkout}
            startingPlan={startingPlan}
            startingManual={starting}
            onStart={handleStartPlan}
            onStartManual={handleWorkout}
          />
        </View>
      ) : null}
      {offer ? (
        <View style={{ marginTop: spacing[5] }}>
          <AssessmentSection offer={offer} onDismiss={() => dismiss(offerKey(offer))} />
        </View>
      ) : null}
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

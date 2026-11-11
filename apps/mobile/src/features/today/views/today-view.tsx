import { assessmentOffer, finishedToday, lastWorkout, offerKey, thisWeek, withPending } from "@fit/engines";
import type { RestDayReason } from "@fit/engines";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { Divider } from "@/components/divider";
import { LoadingButton } from "@/components/loading-button";
import { Screen } from "@/components/screen";
import { Spinner } from "@/components/spinner";
import { Text } from "@/components/text";
import { useChosenTests } from "@/features/assessment/hooks/use-chosen-tests";
import { useLatestAssessment } from "@/features/assessment/hooks/use-latest-assessment";
import { useCurrentUser } from "@/features/user/current-user-provider";
import { ForgottenWorkoutModal } from "@/features/workouts/components/forgotten-workout-modal";
import { PastWorkoutSheet } from "@/features/workouts/components/past-workout-sheet";
import { elapsedLabel, estimatedTimeLabel } from "@/features/workouts/format";
import { useHistory } from "@/features/workouts/history-provider";
import {
  useResumeWorkout,
  useStartPlannedWorkout,
  useStartPastWorkout,
  useStartRecoveryWorkout,
  useStartWorkout,
} from "@/features/workouts/hooks/use-open-workout";
import { useRefreshHistory } from "@/features/workouts/hooks/use-refresh-history";
import { useLogbook } from "@/features/workouts/logbook-provider";
import { spacing } from "@/theme";
import { AssessmentCard, AssessmentSection } from "../components/assessment-section";
import { LastWorkoutSection } from "../components/last-workout-section";
import { PlannedWorkoutSheet } from "../components/planned-workout-sheet";
import { ThisWeekSection } from "../components/this-week-section";
import { TodayCard, TodayCardLink } from "../components/today-card";
import { CheckInCard } from "../components/check-in-card";
import { useCheckIn } from "../hooks/use-check-in";
import { useDaysWorkout } from "../hooks/use-days-workout";
import { useDismissedOffer } from "../hooks/use-dismissed-offer";
import { usePlannedWorkout } from "../hooks/use-planned-workout";
import { planReasonLines } from "../plan-reasons";
import {
  RECOVERY_INSTEAD,
  showsCheckIn,
  todayCard,
  todayLoggedLine,
  todayPlan,
  todayPlanLine,
  todayRestDay,
  todayState,
} from "../today-status";

// A Workout not logged live, so it doesn't look like a skip (#129)
const LOG_PAST = "Log a past workout";

const WHY_REST: Record<RestDayReason, string> = {
  "days-per-week-reached": "You've reached your days per week.",
  "trained-today": "You've trained today.",
  "trained-yesterday": "You trained yesterday, and this week's Workouts still fit.",
};

// The training hub: one card for what the day calls for, then this week against the user's days per week, and the last
// Workout. Everything about the next Workout itself is a tap away in its sheet
export default function TodayView() {
  const logbook = useLogbook();
  const { startWorkout, starting } = useStartWorkout();
  const { startPlannedWorkout, startingPlan } = useStartPlannedWorkout();
  const { startRecoveryWorkout } = useStartRecoveryWorkout();
  const { startPastWorkout } = useStartPastWorkout();
  const [pastSheetIsOpen, setPastSheetIsOpen] = useState(false);
  const { resumeWorkout, forgotten, setForgotten } = useResumeWorkout();
  const { isLoaded, isStale, pending, syncing } = logbook;
  const { workouts, error } = useHistory();
  const daysPerWeek = useCurrentUser().user?.profile.daysPerWeek;
  const { latest: latestAssessment } = useLatestAssessment();
  const { plannedWorkout: latestPlan, stale: planIsStale } = usePlannedWorkout();
  const { dismissed, dismiss } = useDismissedOffer();
  const tests = useChosenTests();
  const [sheetIsOpen, setSheetIsOpen] = useState(false);
  useRefreshHistory();

  const plan = todayPlan({
    isLoaded,
    workoutInProgress: !!logbook.workout,
    hasPlan: !!latestPlan,
    stale: planIsStale,
    syncing,
  });
  const plannedWorkout = plan === "planned" ? latestPlan : null;
  const { checkIn, state: checkInState, keep: keepCheckIn } = useCheckIn();
  const { today, clearChoices } = useDaysWorkout(plannedWorkout, checkIn);

  // A forgotten Workout must be finished or discarded before the user carries on
  useEffect(() => {
    if (isLoaded) isStale().then(setForgotten, () => {});
  }, [isLoaded, isStale, setForgotten]);

  const handleManual = async () => {
    if (await startWorkout()) router.push("/workout");
  };

  // A Manual Workout logged afterwards, for an earlier day (#129)
  const handleStartPast = async (pastStart: Date) => {
    if (await startPastWorkout(pastStart)) router.push("/workout");
  };

  // Leaves the plan as it is: the Recovery Workout links to none, so the plan is offered again afterwards
  const handleStartRecovery = async () => {
    if (await startRecoveryWorkout()) router.push("/workout");
  };

  const handleStartPlan = async () => {
    if (today && (await startPlannedWorkout(today))) {
      clearChoices();
      router.push("/workout");
    }
  };

  // The same Workouts as History: Pending ones, then those loaded from the server (none offline, ADR 0001)
  const now = new Date();
  const all = withPending(pending, workouts);
  const week = thisWeek(all, now, daysPerWeek);
  const last = lastWorkout(all);
  const state = todayState({ historyLoaded: workouts !== null, failed: !!error, workoutCount: all.length });
  const restDayReason = todayRestDay(plan, all, now, daysPerWeek);
  const finished = finishedToday(all, now);
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
  const leadingOffer = offer?.kind === "start" && plan === "none" && !logbook.workout ? offer : null;
  const card = todayCard({
    isLoaded,
    state,
    plan,
    workoutInProgress: !!logbook.workout,
    assessmentFirst: !!leadingOffer,
    finishedToday: finished.length > 0,
    restDay: restDayReason,
  });
  const nextWorkout = (action: string) =>
    today ? `Next Workout: ${estimatedTimeLabel(today.estimatedSeconds)} · ${action}` : "";
  const openSheet = () => setSheetIsOpen(true);
  const connectNote = plan === "connect" ? "Connect to plan your next Workout" : null;
  const reasonLines = planReasonLines(plannedWorkout?.reasons, now);

  return (
    <Screen scroll="screen" edges={["top"]}>
      <Text size="sm" weight="semiBold" color="muted" style={{ marginBottom: spacing[3] }}>
        {now.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}
      </Text>
      {card === "loading" ? <Spinner /> : null}
      {card === "resume" && logbook.workout ? (
        <TodayCard
          tone="accent"
          headline="Keep going."
          line={`Started ${elapsedLabel(now.getTime() - Date.parse(logbook.workout.startedAt))} ago`}
        >
          <LoadingButton label="Resume workout" icon="dumbbell" action="inverse" fullWidth onPress={resumeWorkout} />
        </TodayCard>
      ) : null}
      {card === "assessment" && leadingOffer ? (
        <AssessmentCard offer={leadingOffer} onDismiss={() => dismiss(offerKey(leadingOffer))} />
      ) : null}
      {card === "done" ? (
        <TodayCard tone="success" headline="Done for today." line={todayLoggedLine(finished)}>
          {today ? <TodayCardLink label={nextWorkout("Train again")} color="accent" onPress={openSheet} /> : null}
          {connectNote ? <Text color="muted">{connectNote}</Text> : null}
        </TodayCard>
      ) : null}
      {card === "rest" && restDayReason ? (
        <TodayCard
          tone="quiet"
          headline="Rest today."
          line={`${WHY_REST[restDayReason]} You can still train if you want to.`}
        >
          {today ? <TodayCardLink label={nextWorkout("Train anyway")} color="text" onPress={openSheet} /> : null}
          <TodayCardLink label={RECOVERY_INSTEAD} color="text" onPress={handleStartRecovery} />
          {connectNote ? <Text color="muted">{connectNote}</Text> : null}
        </TodayCard>
      ) : null}
      {card === "ready" && today ? (
        <TodayCard
          tone="accent"
          headline="Time to train."
          line={todayPlanLine(today.plannedExercises, today.estimatedSeconds, today.lighter)}
        >
          {reasonLines.length ? <Text color="onAccent">{reasonLines[0]}</Text> : null}
          {plannedWorkout?.cue ? <Text color="onAccent">{plannedWorkout.cue}</Text> : null}
          <LoadingButton
            label="Start workout"
            icon="dumbbell"
            action="inverse"
            fullWidth
            loading={startingPlan}
            disabled={starting || !today.plannedExercises.length}
            onPress={handleStartPlan}
          />
          <TodayCardLink label="See or change this Workout" color="onAccent" size="sm" onPress={openSheet} />
        </TodayCard>
      ) : null}
      {card === "connect" ? (
        <TodayCard
          tone="quiet"
          headline={plan === "planning" ? "Planning your next Workout." : "Connect to plan your next Workout."}
        />
      ) : null}
      {card === "manual" ? (
        <TodayCard tone="accent" headline="Time to train." line="Add Exercises as you go.">
          <LoadingButton
            label="Start manual workout"
            icon="dumbbell"
            action="inverse"
            fullWidth
            loading={starting}
            onPress={handleManual}
          />
          <TodayCardLink label={LOG_PAST} color="onAccent" size="sm" onPress={() => setPastSheetIsOpen(true)} />
        </TodayCard>
      ) : null}
      {showsCheckIn({ card, hasDaysWorkout: !!today, checkIn: checkInState }) ? (
        <View style={{ marginTop: spacing[3] }}>
          <CheckInCard onCheckIn={keepCheckIn} />
        </View>
      ) : null}
      {state === "offline" ? (
        <Text size="sm" color="muted" style={{ marginTop: spacing[2] }}>
          No connection. Workouts save on this phone until there is.
        </Text>
      ) : null}
      {state === "loading" ? null : (
        <View style={{ marginTop: spacing[3] }}>
          <ThisWeekSection week={week} state={state} now={now} />
        </View>
      )}
      {card === "loading" || card === "resume" || card === "manual" ? null : (
        <View style={{ marginTop: spacing[4] }}>
          <LoadingButton
            label="Start manual workout"
            size="md"
            action="secondary"
            variant="outline"
            fullWidth
            loading={starting}
            disabled={startingPlan}
            onPress={handleManual}
          />
          <View style={{ marginTop: spacing[3], alignItems: "center" }}>
            <TodayCardLink label={LOG_PAST} color="muted" size="sm" onPress={() => setPastSheetIsOpen(true)} />
          </View>
        </View>
      )}
      <PastWorkoutSheet isOpen={pastSheetIsOpen} onClose={() => setPastSheetIsOpen(false)} onPick={handleStartPast} />
      {offer && !leadingOffer ? (
        <View style={{ marginTop: spacing[5] }}>
          <AssessmentSection offer={offer} onDismiss={() => dismiss(offerKey(offer))} />
        </View>
      ) : null}
      {state === "loading" ? null : (
        <>
          <Divider spacing={6} />
          <LastWorkoutSection workout={last} isOffline={state === "offline"} now={now} />
        </>
      )}
      {today ? (
        <PlannedWorkoutSheet
          isOpen={sheetIsOpen}
          onClose={() => setSheetIsOpen(false)}
          cue={plannedWorkout?.cue}
          reasons={reasonLines}
          plannedExercises={today.plannedExercises}
          estimatedSeconds={today.estimatedSeconds}
          dropped={today.dropped}
          workoutLength={today.workoutLength}
          onChooseLength={today.chooseLength}
          equipment={today.equipment}
          equipmentChoices={today.equipmentChoices}
          onChooseEquipment={today.chooseEquipment}
          onPickAlternative={today.pickAlternative}
          supersets={{ paired: today.paired, off: today.noSupersets, onChooseOff: today.chooseNoSupersets }}
          checkIn={
            checkIn
              ? {
                  ratings: checkIn,
                  onChange: keepCheckIn,
                  lighter: today.lighter,
                  canBeLighter: today.canBeLighter,
                  fullWorkout: today.fullWorkout,
                  onChooseFullWorkout: today.chooseFullWorkout,
                }
              : null
          }
          onStart={handleStartPlan}
          onStartRecovery={handleStartRecovery}
        />
      ) : null}
      <ForgottenWorkoutModal isOpen={forgotten} onDone={() => setForgotten(false)} />
    </Screen>
  );
}

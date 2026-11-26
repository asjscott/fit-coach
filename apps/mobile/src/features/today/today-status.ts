import {
  holdTimeSeconds,
  mobilitySeconds,
  restDay,
  summarizeWorkout,
  type FinishedWorkoutSets,
  type MobilityFocus,
  type RecoveryExercise,
  type RestDayReason,
} from "@fit/engines";
import type { ActivityLevel, WeightUnit } from "@fit/shared";
import { estimatedTimeLabel, secondsLabel, timeStat, volumeLabel } from "../workouts/format";

// Whether Today asks for the Activity Level (spec #158 story 4): only a user onboarded before it was asked has none,
// and they're asked once. Skipped is undefined until the phone has read it
export const asksActivityLevel = ({
  activityLevel,
  skipped,
}: {
  activityLevel: ActivityLevel | undefined;
  skipped: boolean | undefined;
}) => activityLevel === undefined && skipped === false;

// What Today knows about the user's Workouts: History loading, loaded (with or without any Workouts yet), or
// unavailable offline, when only the Pending Workouts on the phone are known (ADR 0001)
export type TodayState = "loading" | "loaded" | "first-run" | "offline";

// Which state Today is in, from whether History has loaded or failed, and how many Workouts there are
// with the Pending ones
export function todayState({
  historyLoaded,
  failed,
  workoutCount,
}: {
  historyLoaded: boolean;
  failed: boolean;
  workoutCount: number;
}): TodayState {
  if (historyLoaded) return workoutCount ? "loaded" : "first-run";
  return failed ? "offline" : "loading";
}

// Where the Planned Workout stands on Today: on show, on its way after an upload, or asking for a connection in place
// of a stale copy
export type TodayPlan = "planned" | "planning" | "connect" | "none";

// A Workout under way is what's on offer, so Resume stands alone until it's finished or discarded. A stale plan is
// never shown (ADR 0003)
export function todayPlan({
  isLoaded,
  workoutInProgress,
  hasPlan,
  stale,
  syncing = false,
}: {
  isLoaded: boolean;
  workoutInProgress: boolean;
  hasPlan: boolean;
  stale: boolean;
  syncing?: boolean;
}): TodayPlan {
  if (!isLoaded || workoutInProgress || !hasPlan) return "none";
  if (!stale) return "planned";
  return syncing ? "planning" : "connect";
}

// Finishing a Workout offline makes the plan stale, which is just when a Rest Day is likely, so a stale plan counts too.
// Pass the Workouts with the Pending ones
export const todayRestDay = (
  plan: TodayPlan,
  workouts: readonly FinishedWorkoutSets[],
  now: Date,
  daysPerWeek: number | undefined,
) => (plan === "none" ? null : restDay(workouts, now, daysPerWeek));

// The one card at the top of Today
export type TodayCard = "loading" | "resume" | "assessment" | "done" | "rest" | "ready" | "connect" | "manual";

// Waits for the phone and History, so that a day already finished doesn't flash as ready to train
export function todayCard({
  isLoaded,
  state,
  plan,
  workoutInProgress,
  assessmentFirst,
  finishedToday,
  restDay: restDayReason,
}: {
  isLoaded: boolean;
  state: TodayState;
  plan: TodayPlan;
  workoutInProgress: boolean;
  assessmentFirst: boolean;
  finishedToday: boolean;
  restDay: RestDayReason | null;
}): TodayCard {
  if (workoutInProgress) return "resume";
  if (!isLoaded || state === "loading") return "loading";
  if (assessmentFirst) return "assessment";
  if (finishedToday) return "done";
  if (restDayReason) return "rest";
  if (plan === "planned") return "ready";
  return plan === "none" ? "manual" : "connect";
}

const counted = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;

// What the day's Workouts came to, Volume in the user's unit: "18 Sets · 44 min · 6,240 kg"
export function todayLoggedLine(workouts: readonly FinishedWorkoutSets[], weightUnit: WeightUnit) {
  const summaries = workouts.map(summarizeWorkout);
  const total = (field: "sets" | "durationMs" | "volumeKg") => summaries.reduce((sum, s) => sum + s[field], 0);
  const { value, unit } = timeStat(total("durationMs"));
  const volumeKg = total("volumeKg");
  return [
    counted(total("sets"), "Set"),
    `${value} ${unit}`,
    ...(volumeKg ? [`${volumeLabel(volumeKg, weightUnit)} ${weightUnit}`] : []),
  ].join(" · ");
}

// The plan's sheet says it on its own, and the day's card at the end of todayPlanLine
export const LIGHTER_AFTER_CHECK_IN = "Lighter after your check-in";

// The check-in's row in the plan's sheet: the Full workout chip, and below it the note that the check-in made the
// Workout lighter. It sits below the ratings, so coming and going as you rate moves nothing above them, and takes no
// space when it's gone (#147)
export function checkInLighterRow({ lighter, fullWorkout }: { lighter: boolean; fullWorkout: boolean }) {
  const chip = lighter || fullWorkout;
  return { shown: chip, note: lighter, chip };
}

// The plan's sheet, when the Workout pairs Exercises to fit its Length (#96), and under each paired Exercise. The
// partner's name is the library's, as it is (#111)
export const SUPERSETS_TO_FIT = "Paired into supersets to fit the time";
export const supersetWithLabel = (partnerName: string) => `Superset with ${partnerName}`;

export const mobilityFocusLabels: Record<MobilityFocus, string> = {
  full_body: "Full body",
  hips_and_legs: "Hips and legs",
  back_and_shoulders: "Back and shoulders",
};

// How long a hold of a Mobility Workout takes, and how it's made up: "1 min 50 s · 45 s per side"
export function mobilityHoldLine(hold: RecoveryExercise, setLabel: string) {
  return [secondsLabel(holdTimeSeconds(hold)), ...(hold.sets > 1 ? [`${hold.sets} sets`] : []), setLabel].join(" · ");
}

// The whole list: "14 holds · About 20 min"
export const mobilityTotalLine = (holds: readonly RecoveryExercise[]) =>
  `${counted(holds.length, "hold")} · ${estimatedTimeLabel(mobilitySeconds(holds))}`;

export const NO_OTHER_HOLDS = "There are no other holds you can do with your injuries and equipment.";

// What's in a Planned Workout: "6 Exercises · 18 Sets · About 45 min", and "· lighter after your check-in" when it
// took Sets off
export function todayPlanLine(
  plannedExercises: readonly { sets: number }[],
  estimatedSeconds: number,
  lighter = false,
) {
  const sets = plannedExercises.reduce((sum, exercise) => sum + exercise.sets, 0);
  return [
    counted(plannedExercises.length, "Exercise"),
    counted(sets, "Set"),
    estimatedTimeLabel(estimatedSeconds),
    ...(lighter ? [LIGHTER_AFTER_CHECK_IN.toLowerCase()] : []),
  ].join(" · ");
}

// Where today's check-in stands: not yet read from the phone, or read and made or not
export type CheckInState = "unread" | "not-checked-in" | "checked-in";

// The check-in card sits under the day's card only while there's a Planned Workout to start, and goes once the user
// checks in or a Workout starts that day
export const showsCheckIn = ({
  card,
  hasDaysWorkout,
  checkIn,
}: {
  card: TodayCard;
  hasDaysWorkout: boolean;
  checkIn: CheckInState;
}) => (card === "ready" || card === "rest") && hasDaysWorkout && checkIn === "not-checked-in";

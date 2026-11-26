import {
  adjustRest,
  afterHoldLogged,
  backHold,
  canMoveGuide,
  createLogbook,
  finishedHoldSeconds,
  guidedHold,
  guidedPlace,
  guidedStart,
  guidedStep,
  holdAlone,
  holdCues,
  isHoldPaused,
  NO_EQUIPMENT,
  pauseHold,
  reopenedCourse,
  REST_ADJUSTMENT_SECONDS,
  restAfterSet,
  restStep,
  resumeHold,
  skipHold,
  startGuidedRun,
  takesAnotherSet,
  type FinishResult,
  type GuidedCourse,
  type GuidedPlace,
  type GuidedSkips,
  type Hold,
  type HoldRun,
  type Logbook,
  type PlannedWorkoutCopy,
  type RecoveryExercise,
  type Rest,
  type RestChoice,
  type UnseenPrs,
  type WorkoutTimes,
} from "@fit/engines";
import {
  PlannedWorkout,
  PreviousSets,
  Workout,
  type DatedCheckIn,
  type Exercise,
  type InProgressWorkout,
  type Pr,
  type SetValues,
} from "@fit/shared";
import * as Crypto from "expo-crypto";
import { useKeepAwake } from "expo-keep-awake";
import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState, Vibration } from "react-native";
import { useApi } from "@/api";
import { useCurrentUser, usePrimaryEquipmentProfile } from "@/features/user/current-user-provider";
import { deviceStorage } from "./device-storage";
import { finishCelebration } from "./finish-celebration";
import { useSyncTriggers } from "./hooks/use-sync-triggers";
import { playRestBeep, unlockRestSound } from "./rest-sound";
import { createStoredGuide } from "./stored-guide";
import { createStoredRestChoice } from "./stored-rest-choice";
import { createStoredRestSound } from "./stored-rest-sound";

const storedGuide = createStoredGuide(deviceStorage);
const storedRestChoice = createStoredRestChoice(deviceStorage);
const storedRestSound = createStoredRestSound(deviceStorage);

// A rest as it's shown: after which Workout Exercise's Set, and filling the screen or minimised to its bar (#179)
export type CurrentRest = Rest & { afterId: string; expanded: boolean };

// The hold being timed, for a Workout Exercise's next Set (#196)
export type CurrentHold = { workoutExerciseId: string; hold: Hold; run: HoldRun };

// The guided flow under way (#200), or one Recovery Exercise timed alone (#201): where it is, the current hold's run,
// and whether logging the hold failed
export type CurrentGuide = { course: GuidedCourse; place: GuidedPlace; run: HoldRun; failed?: boolean };

// What a stopped hold fills in, until its Set is logged
export type HeldSeconds = { workoutExerciseId: string; seconds: number };

type LogbookContextValue = {
  // null when no Workout is in progress
  workout: InProgressWorkout | null;
  // false until the in-progress Workout has been read from the phone
  isLoaded: boolean;
  start: () => Promise<void>;
  // Starts a Manual Workout logged afterwards, for an earlier day (#129)
  startPast: (pastStart: Date) => Promise<void>;
  // Starts the Assessment Workout with its tests already added
  startAssessment: (options: AssessmentOptions) => Promise<void>;
  // The latest Planned Workout on the phone, read from it, and whether it's known to be out of date
  plannedWorkoutCopy: PlannedWorkoutCopy;
  // Asks the server for the latest; with no answer the copy stays as it is
  refreshPlannedWorkout: () => Promise<void>;
  // Whether an upload, or an answer about the plan, is on its way
  syncing: boolean;
  // Starts a Planned Workout with its Exercises already added, linked to it
  startPlannedWorkout: (plannedWorkout: PlannedWorkoutToStart) => Promise<void>;
  // Starts the Recovery Workout, linked to no plan, so the Planned Workout stays on offer
  startRecoveryWorkout: () => Promise<void>;
  // Starts a Mobility Workout with these holds, linked to no plan either
  startMobilityWorkout: (holds: readonly RecoveryExercise[]) => Promise<void>;
  // For a test Exercise of an Assessment Workout: the suggested next load, or done
  protocolState: Logbook["protocolState"];
  // For an Assessment Workout: its next test, and whether every test is done
  testProgress: Logbook["testProgress"];
  // Swaps a pull-up test for the inverted row, or passes over a test with no Set
  swapTest: Logbook["swapTest"];
  skipTest: Logbook["skipTest"];
  addWorkoutExercise: (exercise: Pick<Exercise, "slug" | "loadType">) => Promise<void>;
  removeWorkoutExercise: (workoutExerciseId: string) => Promise<void>;
  logSet: (workoutExerciseId: string, values: SetValues) => Promise<void>;
  editSet: (workoutExerciseId: string, setIndex: number, values: SetValues) => Promise<void>;
  deleteSet: (workoutExerciseId: string, setIndex: number) => Promise<void>;
  // The rest after the last Set logged, or null: every Log set starts or restarts it, and Finish or Discard ends it
  rest: CurrentRest | null;
  extendRest: () => void;
  // Ends the rest when less than the 15 s it takes off is left
  shortenRest: () => void;
  skipRest: () => void;
  expandRest: () => void;
  minimizeRest: () => void;
  // The hold being timed, or null. Starting one ends a rest; Stop fills in its seconds, and Cancel leaves them
  hold: CurrentHold | null;
  startHold: (workoutExerciseId: string, hold: Hold) => void;
  stopHold: () => void;
  cancelHold: () => void;
  heldSeconds: HeldSeconds | null;
  // The guided flow of a Recovery Workout's holds, or null. Starting one ends a rest; it logs each hold as it ends.
  // Where it is comes from the logged Sets and its skips. One left open when the app was killed reopens paused
  guide: CurrentGuide | null;
  startGuide: () => Promise<void>;
  pauseGuide: () => void;
  // Also tries again to log a hold that couldn't be
  resumeGuide: () => void;
  skipGuidedHold: () => void;
  // Repeats the previous hold, replacing its Set once done; until then the Set is kept
  backGuidedHold: () => void;
  // Times a Recovery Exercise's next Set by itself, as the guided flow would, and logs it
  startGuideAlone: (workoutExerciseId: string) => Promise<void>;
  leaveGuide: () => void;
  // True for a moment as a rest ends or a hold's target is reached, for the screen to flash
  restFlashing: boolean;
  // Whether a rest beeps as it ends and a hold at its target, remembered on the phone
  restSoundOn: boolean;
  setRestSoundOn: (on: boolean) => void;
  // How long the rests are, chosen on Today and remembered on the phone (#178)
  restChoice: RestChoice;
  chooseRest: (choice: RestChoice) => void;
  // The values a new Set starts with: a test's suggested load, else the last Set's, or null for the first
  nextSetDraft: Logbook["nextSetDraft"];
  // Ends the Workout with these times, resolving as soon as it is a Pending Workout, then
  // tries to upload it (see FinishOutcome). Resolves to "nothing-to-save" with no Sets,
  // leaving the Workout in progress to be discarded. Rejects with a LogbookError for invalid times
  finish: (times: WorkoutTimes) => Promise<FinishOutcome>;
  // For a forgotten Workout: finishes with the last Set's time as the end
  finishAtLastSet: () => Promise<FinishOutcome>;
  discard: () => Promise<void>;
  // Whether the in-progress Workout looks forgotten, so the user must finish or discard it
  isStale: () => Promise<boolean>;
  // Finished Workouts still on the phone, waiting to upload; oldest first
  pending: Workout[];
  // How many Pending Workouts signing out now would lose, read from the phone
  pendingCount: () => Promise<number>;
  // Removes a Pending Workout so it never uploads; works offline
  deletePending: (workoutId: string) => Promise<void>;
  // For signing out: removes the in-progress and Pending Workouts, queued Check-ins and the Planned Workout from the phone
  clear: () => Promise<void>;
  // Queues a Check-in to upload alongside Pending Workouts, retried the same way, and tries to upload it now
  queueCheckIn: (checkIn: DatedCheckIn) => Promise<void>;
  // PRs from uploads the user hasn't been shown (#130), leaving out a just-finished Workout's, which Finish celebrates
  unseenPrs: UnseenPrs[];
  // Once shown, a Workout's PRs are only in History
  markPrsSeen: (workoutIds: string[]) => Promise<void>;
};

export type AssessmentOptions = Parameters<Logbook["startAssessment"]>[0];
export type PlannedWorkoutToStart = Parameters<Logbook["startPlannedWorkout"]>[0];

// uploaded settles once the upload attempt does, or once Finish stops waiting on it (celebrationOf): true when the
// server has this Workout, false when it's still on the phone as a Pending Workout. prs settles with it: the PRs the
// upload found, now seen, or none when it didn't upload in time, so a late upload's PRs go to Today instead
export type FinishOutcome =
  | { status: "pending"; workoutId: string; uploaded: Promise<boolean>; prs: Promise<Pr[]> }
  | { status: "nothing-to-save" };

// How often a rest or a hold under way is looked at. A timeout to its end would stop while the phone sleeps
const REST_STEP_MS = 100;

const REST_FLASH_MS = 1200;

// Not every platform can vibrate, nor for a given time
function vibrate(end: boolean) {
  try {
    Vibration.vibrate(end ? 600 : 200);
  } catch {
    // It still beeps and flashes
  }
}

// Adding an Exercise waits for its Previous Sets, so a weak signal gives up after this long and
// falls back to Pending Workouts
const PREVIOUS_SETS_TIMEOUT_MS = 4000;

// The guided flow that was open over this Workout when the app was killed, paused
async function reopenedGuide(logbook: Logbook, workout: InProgressWorkout): Promise<CurrentGuide | null> {
  const now = new Date();
  const course = reopenedCourse(workout, { openOver: await storedGuide.read(), stale: await logbook.isStale(now) });
  return course && { course, place: guidedPlace(workout, course), run: startGuidedRun(now, true) };
}

const LogbookContext = createContext<LogbookContextValue | null>(null);

// Creates the Logbook once, over the phone's storage and the API, and shares the
// in-progress Workout with every screen
export function LogbookProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const primaryEquipment = usePrimaryEquipmentProfile();
  const injuries = useCurrentUser().user?.profile.injuries;
  const [logbook] = useState<Logbook>(() =>
    createLogbook({
      storage: deviceStorage,
      uploader: {
        upload: async (workout) =>
          Workout.parse(await api("/workouts", { method: "POST", body: JSON.stringify(workout) })).prs,
        uploadCheckIn: async ({ date, ...checkIn }) => {
          await api(`/check-ins/${date}`, { method: "PUT", body: JSON.stringify(checkIn) });
        },
      },
      previousSets: {
        forExercise: async (slug) => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), PREVIOUS_SETS_TIMEOUT_MS);
          try {
            const query = new URLSearchParams({ slug });
            const answer = await api(`/workouts/previous-sets?${query}`, { signal: controller.signal });
            return PreviousSets.nullable().parse(answer);
          } finally {
            clearTimeout(timeout);
          }
        },
      },
      plannedWorkouts: {
        current: async () =>
          PlannedWorkout.nullable().parse(await api("/planned-workouts/current", { method: "POST" })),
      },
      newId: Crypto.randomUUID,
    }),
  );
  const [workout, setWorkout] = useState<InProgressWorkout | null>(null);
  const [pending, setPending] = useState<Workout[]>([]);
  const [plannedWorkoutCopy, setPlannedWorkoutCopy] = useState<PlannedWorkoutCopy>({
    plannedWorkout: null,
    stale: false,
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [unseenPrs, setUnseenPrs] = useState<UnseenPrs[]>([]);
  // Workouts whose upload Finish is waiting on, to celebrate their PRs itself
  const celebrating = useRef(new Set<string>());
  // Held in memory only, as it belongs to the Workout, not an Exercise: a force-quit loses it
  const [rest, setRest] = useState<CurrentRest | null>(null);
  // In memory only too, like the rest
  const [hold, setHold] = useState<CurrentHold | null>(null);
  const [heldSeconds, setHeldSeconds] = useState<HeldSeconds | null>(null);
  // In memory only too: a force-quit loses its skips, which leaving it keeps
  const [guide, setGuide] = useState<CurrentGuide | null>(null);
  const keptSkips = useRef<{ workoutId: string; skips: GuidedSkips }>(null);
  const loggingHold = useRef(false);
  // When the guided flow's hold was last looked at, so a cue isn't lost as the look restarts with a new guide
  const guideLookedAt = useRef<Date>(null);
  const [restFlashing, setRestFlashing] = useState(false);
  // null until it's read from the phone or chosen
  const [chosenRestSound, setChosenRestSound] = useState<boolean | null>(null);
  const restSoundOn = chosenRestSound ?? true;
  // null until it's read from the phone or chosen
  const [chosenRest, setChosenRest] = useState<RestChoice | null>(null);
  const restChoice = chosenRest ?? "auto";
  // Counted, as a sync and a finish can overlap
  const [syncsUnderWay, setSyncsUnderWay] = useState(0);

  // The Planned Workout goes stale by Pending Workouts, so the two are shown together
  const refreshPending = useCallback(async () => {
    setPending(await logbook.pending());
    setPlannedWorkoutCopy(await logbook.plannedWorkout());
    setUnseenPrs((await logbook.unseenPrs()).filter((unseen) => !celebrating.current.has(unseen.workoutId)));
  }, [logbook]);

  const refreshPlannedWorkout = useCallback(async () => {
    setSyncsUnderWay((count) => count + 1);
    try {
      setPlannedWorkoutCopy(await logbook.refreshPlannedWorkout());
    } catch {
      // Keep the copy: Today's own status line already says when there's no connection
    } finally {
      setSyncsUnderWay((count) => count - 1);
    }
  }, [logbook]);

  // Runs a Logbook call, then shows what it left on the phone
  const run = useCallback(
    async (change: () => Promise<unknown>) => {
      try {
        await change();
      } finally {
        setWorkout(await logbook.inProgress());
        await refreshPending();
      }
    },
    [logbook, refreshPending],
  );

  // Uploads what it can; anything that fails stays pending for the next try. Then asks for the plan an upload rebuilt,
  // or a new week's on returning to the app, without holding up whoever is waiting on the upload
  const sync = useCallback(async () => {
    setSyncsUnderWay((count) => count + 1);
    await logbook.sync().catch(() => {});
    await refreshPending();
    refreshPlannedWorkout();
    setSyncsUnderWay((count) => count - 1);
  }, [logbook, refreshPending, refreshPlannedWorkout]);

  // Also uploads anything left pending last time the app ran
  useEffect(() => {
    logbook.inProgress().then(async (stored) => {
      const reopened = stored && (await reopenedGuide(logbook, stored).catch(() => null));
      setWorkout(stored);
      setGuide(reopened);
      setIsLoaded(true);
    });
    refreshPending();
    sync();
  }, [logbook, refreshPending, sync]);

  useEffect(() => {
    storedRestChoice.read().then(
      (stored) => setChosenRest((current) => current ?? stored),
      () => {},
    );
    storedRestSound.read().then(
      (stored) => setChosenRestSound((current) => current ?? stored),
      () => {},
    );
  }, []);

  const chooseRest = useCallback((choice: RestChoice) => {
    setChosenRest(choice);
    storedRestChoice.keep(choice).catch(() => {});
  }, []);

  const setRestSoundOn = useCallback((on: boolean) => {
    setChosenRestSound(on);
    storedRestSound.keep(on).catch(() => {});
  }, []);

  useSyncTriggers(sync);

  const start = useCallback(() => run(() => logbook.start(new Date())), [logbook, run]);
  const startPast = useCallback((pastStart: Date) => run(() => logbook.start(new Date(), pastStart)), [logbook, run]);

  const startAssessment = useCallback(
    (options: AssessmentOptions) => run(() => logbook.startAssessment(options, new Date())),
    [logbook, run],
  );

  const swapTest = useCallback(
    (...args: Parameters<Logbook["swapTest"]>) => run(() => logbook.swapTest(...args)),
    [logbook, run],
  );

  const skipTest = useCallback(
    async (workoutExerciseId: string) => {
      const skipping = logbook.skipTest(workoutExerciseId);
      await run(() => skipping);
      const skipped = await skipping;
      // With no test left, there's nothing to rest for
      if (primaryEquipment && logbook.testProgress(skipped, primaryEquipment).allDone) setRest(null);
      return skipped;
    },
    [logbook, run, primaryEquipment],
  );

  const startPlannedWorkout = useCallback(
    (plannedWorkout: PlannedWorkoutToStart) => run(() => logbook.startPlannedWorkout(plannedWorkout, new Date())),
    [logbook, run],
  );

  // What's built for the user's injuries and equipment, as far as the phone knows them
  const startRecoveryWorkout = useCallback(
    () =>
      run(() =>
        logbook.startRecoveryWorkout(
          { equipmentProfile: primaryEquipment ?? NO_EQUIPMENT, injuries: injuries ?? [] },
          new Date(),
        ),
      ),
    [logbook, run, primaryEquipment, injuries],
  );

  const openGuide = useCallback((inProgress: InProgressWorkout, course: GuidedCourse) => {
    const place = guidedPlace(inProgress, course);
    if (!place.current) return;
    setRest(null);
    setRestFlashing(false);
    setHold(null);
    setGuide({ course, place, run: startGuidedRun(new Date(), AppState.currentState === "background") });
  }, []);

  // From the skips kept since it was left (guidedStart). The sound is unlocked before anything waits, as it must come
  // from the tap
  const startGuide = useCallback(async () => {
    unlockRestSound();
    const stored = await logbook.inProgress();
    const kept = keptSkips.current?.workoutId === stored?.id ? keptSkips.current?.skips : undefined;
    const course = stored && guidedStart(stored, kept);
    if (course) openGuide(stored, course);
  }, [logbook, openGuide]);

  const startGuideAlone = useCallback(
    async (workoutExerciseId: string) => {
      unlockRestSound();
      const stored = await logbook.inProgress();
      const workoutExercise = stored?.workoutExercises.find(({ id }) => id === workoutExerciseId);
      const course = stored && workoutExercise && holdAlone(workoutExercise, stored);
      if (course) openGuide(stored, course);
    },
    [logbook, openGuide],
  );

  // The flow's skips, for when it's left, and that it's open, for when the app is killed
  const flowSkips = guide && !guide.course.only ? guide.course.skips : null;
  const workoutId = workout?.id;
  useEffect(() => {
    if (flowSkips && workoutId) keptSkips.current = { workoutId, skips: flowSkips };
  }, [flowSkips, workoutId]);
  const flowOpen = flowSkips !== null;
  useEffect(() => {
    if (!flowOpen || !workoutId) return;
    storedGuide.keep(workoutId).catch(() => {});
    return () => void storedGuide.clear().catch(() => {});
  }, [flowOpen, workoutId]);

  const startMobilityWorkout = useCallback(
    async (holds: readonly RecoveryExercise[]) => {
      unlockRestSound();
      await run(() => logbook.startMobilityWorkout(holds, new Date()));
      await startGuide();
    },
    [logbook, run, startGuide],
  );

  const addWorkoutExercise = useCallback(
    (exercise: Pick<Exercise, "slug" | "loadType">) => run(() => logbook.addWorkoutExercise(exercise)),
    [logbook, run],
  );

  // Starts the rest once the Set is stored, restarting one under way. Between the two Exercises of a superset there's
  // none, so one under way ends. The sound is unlocked before anything waits, as it must come from the tap
  const logSet = useCallback(
    async (workoutExerciseId: string, values: SetValues) => {
      unlockRestSound();
      const now = new Date();
      // Before the next Set's steppers are drawn, so they don't take it too
      setHeldSeconds(null);
      await run(() => logbook.logSet(workoutExerciseId, values, now));
      const logged = await logbook.inProgress();
      const started = logged && restAfterSet(logged, workoutExerciseId, now, restChoice, primaryEquipment);
      setRest(started && { ...started, afterId: workoutExerciseId, expanded: true });
      // The walk goes straight on to the holds
      const exercise = logged?.workoutExercises.find(({ id }) => id === workoutExerciseId);
      if (exercise && !takesAnotherSet(exercise)) await startGuide();
    },
    [logbook, run, restChoice, primaryEquipment, startGuide],
  );

  // Beeps and vibrates in the last seconds and at the end, unless it ended while the app was in the background (that
  // alert waits for M8)
  const restEndsAt = rest?.endsAt;
  useEffect(() => {
    if (restEndsAt === undefined) return;
    let before = new Date();
    const timer = setInterval(() => {
      const now = new Date();
      const { ended, alerts } = restStep({ endsAt: restEndsAt }, before, now);
      before = now;
      if (alerts) {
        vibrate(ended);
        if (restSoundOn) playRestBeep(ended);
      }
      if (ended) {
        setRest(null);
        setRestFlashing(alerts);
      }
    }, REST_STEP_MS);
    return () => clearInterval(timer);
  }, [restEndsAt, restSoundOn]);

  useEffect(() => {
    if (!restFlashing) return;
    const timer = setTimeout(() => setRestFlashing(false), REST_FLASH_MS);
    return () => clearTimeout(timer);
  }, [restFlashing]);

  // Beeps, vibrates and flashes at the ends of the target; the other cues are the guided flow's
  useEffect(() => {
    if (!hold) return;
    let before = new Date();
    const timer = setInterval(() => {
      const now = new Date();
      const cues = holdCues(hold.hold, hold.run, before, now);
      before = now;
      if (!cues.some(({ cue }) => cue === "bottom" || cue === "top")) return;
      vibrate(true);
      if (restSoundOn) playRestBeep(true);
      setRestFlashing(true);
    }, REST_STEP_MS);
    return () => clearInterval(timer);
  }, [hold, restSoundOn]);

  // Looks at the guided flow's hold, alerts, and at its end logs its Set and goes on to the next. A pause while it logs
  // holds for the next one
  useEffect(() => {
    const current = guide?.place.current;
    if (!guide || !current || isHoldPaused(guide.run)) return;
    const timed = guidedHold(current);

    const logHold = async () => {
      if (loggingHold.current) return;
      loggingHold.current = true;
      try {
        const set = { kind: "timed" as const, seconds: current.seconds };
        const { replaces } = guide.place;
        const before = await logbook.inProgress();
        await run(() =>
          replaces === undefined
            ? logbook.logSet(current.workoutExerciseId, set, new Date())
            : logbook.editSet(current.workoutExerciseId, replaces, set),
        );
        const logged = await logbook.inProgress();
        if (!before || !logged) return;
        const { course, place } = afterHoldLogged(before, logged, guide.course);
        setGuide((now) => now && { course, place, run: startGuidedRun(new Date(), isHoldPaused(now.run)) });
      } catch {
        setGuide((now) => now && { ...now, run: pauseHold(now.run, new Date()), failed: true });
      } finally {
        loggingHold.current = false;
      }
    };

    // Carries on from the last look when the effect restarts with a new guide, unless that was a while ago
    const lookedAt = guideLookedAt.current;
    let before = lookedAt && Date.now() - lookedAt.getTime() < REST_STEP_MS * 5 ? lookedAt : new Date();
    const timer = setInterval(() => {
      const now = new Date();
      const step = guidedStep(timed, guide.run, before, now);
      before = now;
      guideLookedAt.current = now;
      if (step.run !== guide.run) setGuide((latest) => latest && { ...latest, run: step.run });
      if (step.alert) {
        vibrate(step.alert === "long");
        if (restSoundOn) playRestBeep(step.alert === "long");
        if (step.alert === "long") setRestFlashing(true);
      }
      if (step.done) logHold();
    }, REST_STEP_MS);
    return () => clearInterval(timer);
  }, [guide, restSoundOn, logbook, run]);

  const pauseGuide = useCallback(
    () => setGuide((current) => current && { ...current, run: pauseHold(current.run, new Date()) }),
    [],
  );

  // Locking the phone or switching apps pauses it where it was
  useEffect(() => {
    const listening = AppState.addEventListener("change", (state) => {
      if (state === "background") pauseGuide();
    });
    return () => listening.remove();
  }, [pauseGuide]);

  const resumeGuide = () => {
    unlockRestSound();
    setGuide((current) => current && { ...current, run: resumeHold(current.run, new Date()), failed: false });
  };

  // Moves to another hold, when canMoveGuide allows it and no hold is being logged
  const moveGuide = (move: (workout: InProgressWorkout, course: GuidedCourse) => GuidedCourse) => {
    unlockRestSound();
    if (!workout || !guide || loggingHold.current || !canMoveGuide(guide, new Date())) return;
    const course = move(workout, guide.course);
    setGuide({ course, place: guidedPlace(workout, course), run: startGuidedRun(new Date()) });
  };
  const skipGuidedHold = () => moveGuide(skipHold);
  const backGuidedHold = () => moveGuide(backHold);

  const leaveGuide = useCallback(() => setGuide(null), []);

  // Unlocks the sound here, as it must come from the tap that starts the hold
  const startHold = useCallback((workoutExerciseId: string, started: Hold) => {
    unlockRestSound();
    setRest(null);
    setRestFlashing(false);
    setHold({ workoutExerciseId, hold: started, run: { startedAt: Date.now(), pauses: [] } });
  }, []);

  const stopHold = () => {
    if (!hold) return;
    const seconds = finishedHoldSeconds(hold.hold, hold.run, new Date());
    setHeldSeconds({ workoutExerciseId: hold.workoutExerciseId, seconds });
    setHold(null);
  };

  const cancelHold = useCallback(() => setHold(null), []);

  // Once there's no Workout to time for
  const endTimers = useCallback(() => {
    setRest(null);
    setHold(null);
    setGuide(null);
    setHeldSeconds(null);
  }, []);

  const moveRestEnd = (seconds: number) => setRest((current) => current && adjustRest(current, seconds, new Date()));
  const extendRest = () => moveRestEnd(REST_ADJUSTMENT_SECONDS);
  const shortenRest = () => moveRestEnd(-REST_ADJUSTMENT_SECONDS);
  const skipRest = useCallback(() => setRest(null), []);
  const showRest = (expanded: boolean) => setRest((current) => current && { ...current, expanded });
  const expandRest = () => showRest(true);
  const minimizeRest = () => showRest(false);

  const removeWorkoutExercise = useCallback(
    (workoutExerciseId: string) => run(() => logbook.removeWorkoutExercise(workoutExerciseId)),
    [logbook, run],
  );

  const editSet = useCallback(
    (workoutExerciseId: string, setIndex: number, values: SetValues) =>
      run(() => logbook.editSet(workoutExerciseId, setIndex, values)),
    [logbook, run],
  );

  const deleteSet = useCallback(
    (workoutExerciseId: string, setIndex: number) => run(() => logbook.deleteSet(workoutExerciseId, setIndex)),
    [logbook, run],
  );

  // Starts uploading straight after finishing, so a Workout finished with signal reaches the
  // server now, without making the user wait for it. Uploaded means this Workout left the
  // phone, whatever happened to other Pending Workouts
  const uploadFinished = useCallback(
    async (finishing: () => Promise<FinishResult>): Promise<FinishOutcome> => {
      let result: FinishResult | undefined;
      // From before the Workout turns Pending, so Today doesn't read its plan as stale before the sync below starts
      setSyncsUnderWay((count) => count + 1);
      try {
        await run(async () => {
          result = await finishing();
        });
        if (!result || result.status === "nothing-to-save") return { status: "nothing-to-save" };
        endTimers();
        const { id } = result.workout;
        celebrating.current.add(id);
        // Only while the user can be looking at the toast, so a late upload's PRs go to Today instead (#142)
        const { uploaded, prs } = finishCelebration({ logbook, workoutId: id, syncing: sync(), appState: AppState });
        prs.finally(() => {
          celebrating.current.delete(id);
          // An upload that got through after the window has left its PRs for Today's note
          refreshPending();
        });
        return { status: "pending", workoutId: id, uploaded, prs };
      } finally {
        setSyncsUnderWay((count) => count - 1);
      }
    },
    [logbook, run, sync, endTimers],
  );

  const finish = useCallback(
    ({ startedAt, endedAt }: WorkoutTimes) =>
      uploadFinished(() => logbook.finish({ startedAt, endedAt, now: new Date() })),
    [logbook, uploadFinished],
  );

  const finishAtLastSet = useCallback(() => uploadFinished(() => logbook.finishAtLastSet()), [logbook, uploadFinished]);

  const discard = useCallback(async () => {
    await run(() => logbook.discard());
    endTimers();
  }, [logbook, run, endTimers]);

  const isStale = useCallback(() => logbook.isStale(new Date()), [logbook]);

  const deletePending = useCallback((workoutId: string) => run(() => logbook.deletePending(workoutId)), [logbook, run]);

  const pendingCount = useCallback(() => logbook.pendingCount(), [logbook]);

  const markPrsSeen = useCallback((workoutIds: string[]) => run(() => logbook.markPrsSeen(workoutIds)), [logbook, run]);

  const clear = useCallback(async () => {
    await run(() => logbook.clear());
    endTimers();
  }, [logbook, run, endTimers]);

  const queueCheckIn = useCallback(
    async (checkIn: DatedCheckIn) => {
      await logbook.queueCheckIn(checkIn);
      await sync();
    },
    [logbook, sync],
  );

  return (
    <LogbookContext
      value={{
        workout,
        isLoaded,
        plannedWorkoutCopy,
        refreshPlannedWorkout,
        syncing: syncsUnderWay > 0,
        start,
        startPast,
        startAssessment,
        startPlannedWorkout,
        startRecoveryWorkout,
        startMobilityWorkout,
        protocolState: logbook.protocolState,
        testProgress: logbook.testProgress,
        swapTest,
        skipTest,
        addWorkoutExercise,
        removeWorkoutExercise,
        logSet,
        editSet,
        deleteSet,
        rest,
        extendRest,
        shortenRest,
        skipRest,
        expandRest,
        minimizeRest,
        hold,
        startHold,
        stopHold,
        cancelHold,
        heldSeconds,
        guide,
        startGuide,
        pauseGuide,
        resumeGuide,
        skipGuidedHold,
        backGuidedHold,
        startGuideAlone,
        leaveGuide,
        restFlashing,
        restSoundOn,
        setRestSoundOn,
        restChoice,
        chooseRest,
        nextSetDraft: logbook.nextSetDraft,
        finish,
        finishAtLastSet,
        discard,
        isStale,
        pending,
        pendingCount,
        deletePending,
        clear,
        queueCheckIn,
        unseenPrs,
        markPrsSeen,
      }}
    >
      {workout ? <KeepAwake /> : null}
      {children}
    </LogbookContext>
  );
}

// The screen stays on for the whole In-progress Workout, on any screen, and goes back to normal after it
function KeepAwake() {
  useKeepAwake("in-progress-workout", { suppressDeactivateWarnings: true });
  return null;
}

export function useLogbook() {
  const context = use(LogbookContext);
  if (!context) throw new Error("useLogbook must be used inside <LogbookProvider>");
  return context;
}

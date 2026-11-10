import {
  createLogbook,
  extendRest,
  startRest,
  type FinishResult,
  type Logbook,
  type PlannedWorkoutCopy,
  type Rest,
  type WorkoutTimes,
} from "@fit/engines";
import {
  PlannedWorkout,
  PreviousSets,
  type Exercise,
  type InProgressWorkout,
  type SetValues,
  type Workout,
} from "@fit/shared";
import * as Crypto from "expo-crypto";
import { useKeepAwake } from "expo-keep-awake";
import { createContext, use, useCallback, useEffect, useState, type ReactNode } from "react";
import { Vibration } from "react-native";
import { useApi } from "@/api";
import { deviceStorage } from "./device-storage";
import { useSyncTriggers } from "./hooks/use-sync-triggers";

type LogbookContextValue = {
  // null when no Workout is in progress
  workout: InProgressWorkout | null;
  // false until the in-progress Workout has been read from the phone
  isLoaded: boolean;
  start: () => Promise<void>;
  // Starts Assessment Workout A or B with its tests already added
  startAssessment: (options: AssessmentOptions) => Promise<void>;
  // The latest Planned Workout on the phone, read from it, and whether it's known to be out of date
  plannedWorkoutCopy: PlannedWorkoutCopy;
  // Asks the server for the latest; with no answer the copy stays as it is
  refreshPlannedWorkout: () => Promise<void>;
  // Whether an upload, or an answer about the plan, is on its way
  syncing: boolean;
  // Starts a Planned Workout with its Exercises already added, linked to it
  startPlannedWorkout: (plannedWorkout: PlannedWorkoutToStart) => Promise<void>;
  // For a test Exercise of an Assessment Workout: the suggested next load, or done
  protocolState: Logbook["protocolState"];
  // For an Assessment Workout: its next test, and whether every test is done
  testProgress: Logbook["testProgress"];
  addWorkoutExercise: (exercise: Pick<Exercise, "slug" | "loadType">) => Promise<void>;
  removeWorkoutExercise: (workoutExerciseId: string) => Promise<void>;
  logSet: (workoutExerciseId: string, values: SetValues) => Promise<void>;
  editSet: (workoutExerciseId: string, setIndex: number, values: SetValues) => Promise<void>;
  deleteSet: (workoutExerciseId: string, setIndex: number) => Promise<void>;
  // The rest after the last Set logged, or null: every Log set starts or restarts it, and Finish or Discard ends it
  rest: Rest | null;
  // +15 s on this rest only
  extendRest: () => void;
  skipRest: () => void;
  // The values a new Set starts with: a test's suggested load, else the last Set's, or null for the first
  nextSetDraft: Logbook["nextSetDraft"];
  // Where the kg stepper goes on − or +
  nextLoadKg: Logbook["nextLoadKg"];
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
  // For signing out: removes the in-progress and Pending Workouts and the Planned Workout from the phone
  clear: () => Promise<void>;
};

export type AssessmentOptions = Parameters<Logbook["startAssessment"]>[0];
export type PlannedWorkoutToStart = Parameters<Logbook["startPlannedWorkout"]>[0];

// uploaded settles once the upload attempt does: true when the server has this Workout,
// false when it stays on the phone as a Pending Workout for the next try
export type FinishOutcome = { status: "pending"; uploaded: Promise<boolean> } | { status: "nothing-to-save" };

// A rest that ended this long ago, while the app was in the background, ends without vibrating on return
const LATE_REST_END_MS = 2000;

// Adding an Exercise waits for its Previous Sets, so a weak signal gives up after this long and
// falls back to Pending Workouts
const PREVIOUS_SETS_TIMEOUT_MS = 4000;

const LogbookContext = createContext<LogbookContextValue | null>(null);

// Creates the Logbook once, over the phone's storage and the API, and shares the
// in-progress Workout with every screen
export function LogbookProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const [logbook] = useState<Logbook>(() =>
    createLogbook({
      storage: deviceStorage,
      uploader: {
        upload: async (workout) => {
          await api("/workouts", { method: "POST", body: JSON.stringify(workout) });
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
  // Held in memory only, as it belongs to the Workout, not an Exercise: a force-quit loses it
  const [rest, setRest] = useState<Rest | null>(null);
  // Counted, as a sync and a finish can overlap
  const [syncsUnderWay, setSyncsUnderWay] = useState(0);

  // The Planned Workout goes stale by Pending Workouts, so the two are shown together
  const refreshPending = useCallback(async () => {
    setPending(await logbook.pending());
    setPlannedWorkoutCopy(await logbook.plannedWorkout());
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
    logbook.inProgress().then((stored) => {
      setWorkout(stored);
      setIsLoaded(true);
    });
    refreshPending();
    sync();
  }, [logbook, refreshPending, sync]);

  useSyncTriggers(sync);

  const start = useCallback(() => run(() => logbook.start(new Date())), [logbook, run]);

  const startAssessment = useCallback(
    (options: AssessmentOptions) => run(() => logbook.startAssessment(options, new Date())),
    [logbook, run],
  );

  const startPlannedWorkout = useCallback(
    (plannedWorkout: PlannedWorkoutToStart) => run(() => logbook.startPlannedWorkout(plannedWorkout, new Date())),
    [logbook, run],
  );

  const addWorkoutExercise = useCallback(
    (exercise: Pick<Exercise, "slug" | "loadType">) => run(() => logbook.addWorkoutExercise(exercise)),
    [logbook, run],
  );

  // Starts the rest once the Set is stored, restarting one under way
  const logSet = useCallback(
    async (workoutExerciseId: string, values: SetValues) => {
      const now = new Date();
      await run(() => logbook.logSet(workoutExerciseId, values, now));
      const logged = (await logbook.inProgress())?.workoutExercises.find((we) => we.id === workoutExerciseId);
      if (logged) setRest(startRest(logged.slug, now));
    },
    [logbook, run],
  );

  // One vibration at the end, unless it ended while the app was in the background (that alert waits for M8)
  useEffect(() => {
    if (!rest) return;
    const timer = setTimeout(
      () => {
        if (Date.now() - rest.endsAt < LATE_REST_END_MS) Vibration.vibrate();
        setRest(null);
      },
      Math.max(0, rest.endsAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [rest]);

  const extendCurrentRest = useCallback(() => setRest((current) => current && extendRest(current)), []);
  const skipRest = useCallback(() => setRest(null), []);

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
        setRest(null);
        const { id } = result.workout;
        const uploaded = sync().then(async () => !(await logbook.pending()).some((p) => p.id === id));
        return { status: "pending", uploaded };
      } finally {
        setSyncsUnderWay((count) => count - 1);
      }
    },
    [logbook, run, sync],
  );

  const finish = useCallback(
    ({ startedAt, endedAt }: WorkoutTimes) =>
      uploadFinished(() => logbook.finish({ startedAt, endedAt, now: new Date() })),
    [logbook, uploadFinished],
  );

  const finishAtLastSet = useCallback(() => uploadFinished(() => logbook.finishAtLastSet()), [logbook, uploadFinished]);

  const discard = useCallback(async () => {
    await run(() => logbook.discard());
    setRest(null);
  }, [logbook, run]);

  const isStale = useCallback(() => logbook.isStale(new Date()), [logbook]);

  const deletePending = useCallback((workoutId: string) => run(() => logbook.deletePending(workoutId)), [logbook, run]);

  const pendingCount = useCallback(() => logbook.pendingCount(), [logbook]);

  const clear = useCallback(async () => {
    await run(() => logbook.clear());
    setRest(null);
  }, [logbook, run]);

  return (
    <LogbookContext
      value={{
        workout,
        isLoaded,
        plannedWorkoutCopy,
        refreshPlannedWorkout,
        syncing: syncsUnderWay > 0,
        start,
        startAssessment,
        startPlannedWorkout,
        protocolState: logbook.protocolState,
        testProgress: logbook.testProgress,
        addWorkoutExercise,
        removeWorkoutExercise,
        logSet,
        editSet,
        deleteSet,
        rest,
        extendRest: extendCurrentRest,
        skipRest,
        nextSetDraft: logbook.nextSetDraft,
        nextLoadKg: logbook.nextLoadKg,
        finish,
        finishAtLastSet,
        discard,
        isStale,
        pending,
        pendingCount,
        deletePending,
        clear,
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

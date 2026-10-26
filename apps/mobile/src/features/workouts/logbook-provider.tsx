import { createLogbook, type FinishResult, type Logbook, type WorkoutTimes } from "@fit/engines";
import { PreviousSets, type Exercise, type InProgressWorkout, type SetValues, type Workout } from "@fit/shared";
import * as Crypto from "expo-crypto";
import { createContext, use, useCallback, useEffect, useState, type ReactNode } from "react";
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
  // For a test Exercise of an Assessment Workout: the suggested next load, or done
  protocolState: Logbook["protocolState"];
  addWorkoutExercise: (exercise: Pick<Exercise, "slug" | "loadType">) => Promise<void>;
  removeWorkoutExercise: (workoutExerciseId: string) => Promise<void>;
  moveWorkoutExercise: (workoutExerciseId: string, toIndex: number) => Promise<void>;
  logSet: (workoutExerciseId: string, values: SetValues) => Promise<void>;
  editSet: (workoutExerciseId: string, setIndex: number, values: SetValues) => Promise<void>;
  deleteSet: (workoutExerciseId: string, setIndex: number) => Promise<void>;
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
  // For signing out: removes the in-progress and Pending Workouts from the phone
  clear: () => Promise<void>;
};

export type AssessmentOptions = Parameters<Logbook["startAssessment"]>[0];

// uploaded settles once the upload attempt does: true when the server has this Workout,
// false when it stays on the phone as a Pending Workout for the next try
export type FinishOutcome = { status: "pending"; uploaded: Promise<boolean> } | { status: "nothing-to-save" };

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
      newId: Crypto.randomUUID,
    }),
  );
  const [workout, setWorkout] = useState<InProgressWorkout | null>(null);
  const [pending, setPending] = useState<Workout[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const refreshPending = useCallback(async () => setPending(await logbook.pending()), [logbook]);

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

  // Uploads what it can; anything that fails stays pending for the next try
  const sync = useCallback(async () => {
    await logbook.sync().catch(() => {});
    await refreshPending();
  }, [logbook, refreshPending]);

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

  const addWorkoutExercise = useCallback(
    (exercise: Pick<Exercise, "slug" | "loadType">) => run(() => logbook.addWorkoutExercise(exercise)),
    [logbook, run],
  );

  const logSet = useCallback(
    (workoutExerciseId: string, values: SetValues) => run(() => logbook.logSet(workoutExerciseId, values, new Date())),
    [logbook, run],
  );

  const removeWorkoutExercise = useCallback(
    (workoutExerciseId: string) => run(() => logbook.removeWorkoutExercise(workoutExerciseId)),
    [logbook, run],
  );

  const moveWorkoutExercise = useCallback(
    (workoutExerciseId: string, toIndex: number) => run(() => logbook.moveWorkoutExercise(workoutExerciseId, toIndex)),
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
      await run(async () => {
        result = await finishing();
      });
      if (!result || result.status === "nothing-to-save") return { status: "nothing-to-save" };
      const { id } = result.workout;
      const uploaded = sync().then(async () => !(await logbook.pending()).some((p) => p.id === id));
      return { status: "pending", uploaded };
    },
    [logbook, run, sync],
  );

  const finish = useCallback(
    ({ startedAt, endedAt }: WorkoutTimes) =>
      uploadFinished(() => logbook.finish({ startedAt, endedAt, now: new Date() })),
    [logbook, uploadFinished],
  );

  const finishAtLastSet = useCallback(() => uploadFinished(() => logbook.finishAtLastSet()), [logbook, uploadFinished]);

  const discard = useCallback(() => run(() => logbook.discard()), [logbook, run]);

  const isStale = useCallback(() => logbook.isStale(new Date()), [logbook]);

  const deletePending = useCallback((workoutId: string) => run(() => logbook.deletePending(workoutId)), [logbook, run]);

  const pendingCount = useCallback(() => logbook.pendingCount(), [logbook]);

  const clear = useCallback(() => run(() => logbook.clear()), [logbook, run]);

  return (
    <LogbookContext
      value={{
        workout,
        isLoaded,
        start,
        startAssessment,
        protocolState: logbook.protocolState,
        addWorkoutExercise,
        removeWorkoutExercise,
        moveWorkoutExercise,
        logSet,
        editSet,
        deleteSet,
        nextSetDraft: logbook.nextSetDraft,
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
      {children}
    </LogbookContext>
  );
}

export function useLogbook() {
  const context = use(LogbookContext);
  if (!context) throw new Error("useLogbook must be used inside <LogbookProvider>");
  return context;
}

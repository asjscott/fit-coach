import { createLogbook, type FinishResult, type Logbook } from "@fit/engines";
import type { Exercise, InProgressWorkout, InProgressWorkoutExercise, SetValues, Workout } from "@fit/shared";
import * as Crypto from "expo-crypto";
import * as Network from "expo-network";
import Storage from "expo-sqlite/kv-store";
import { createContext, use, useCallback, useEffect, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { useApi } from "@/api";

type LogbookContextValue = {
  // null when no Workout is in progress
  workout: InProgressWorkout | null;
  // false until the in-progress Workout has been read from the phone
  isLoaded: boolean;
  start: () => Promise<void>;
  addWorkoutExercise: (exercise: Pick<Exercise, "slug" | "loadType">) => Promise<void>;
  removeWorkoutExercise: (workoutExerciseId: string) => Promise<void>;
  moveWorkoutExercise: (workoutExerciseId: string, toIndex: number) => Promise<void>;
  logSet: (workoutExerciseId: string, values: SetValues) => Promise<void>;
  editSet: (workoutExerciseId: string, setIndex: number, values: SetValues) => Promise<void>;
  deleteSet: (workoutExerciseId: string, setIndex: number) => Promise<void>;
  // The values a new Set starts with: the last Set's, or null for the first
  nextSetDraft: (workoutExercise: InProgressWorkoutExercise) => SetValues | null;
  // Ends the Workout with these times and tries to upload it. Resolves to whether the
  // server has it (if not, it stays on the phone as a Pending Workout), or to
  // "nothing-to-save" with no Sets, leaving the Workout in progress to be discarded.
  // Rejects with a LogbookError for invalid times
  finish: (times: { startedAt: Date; endedAt: Date }) => Promise<FinishOutcome>;
  // For a forgotten Workout: finishes with the last Set's time as the end
  finishAtLastSet: () => Promise<FinishOutcome>;
  discard: () => Promise<void>;
  // Whether the in-progress Workout looks forgotten, so the user must finish or discard it
  isStale: () => Promise<boolean>;
  // Finished Workouts still on the phone, waiting to upload; oldest first
  pending: Workout[];
  // Removes a Pending Workout so it never uploads; works offline
  deletePending: (workoutId: string) => Promise<void>;
};

export type FinishOutcome = { status: "pending"; uploaded: boolean } | { status: "nothing-to-save" };

const LogbookContext = createContext<LogbookContextValue | null>(null);

// Creates the Logbook once, over the phone's storage and the API, and shares the
// in-progress Workout with every screen
export function LogbookProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const [logbook] = useState<Logbook>(() =>
    createLogbook({
      storage: Storage,
      uploader: {
        upload: async (workout) => {
          await api("/workouts", { method: "POST", body: JSON.stringify(workout) });
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

  // Syncs when the app returns to the foreground and when the network comes back
  useEffect(() => {
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") sync();
    });
    let wasConnected: boolean | undefined;
    const network = Network.addNetworkStateListener(({ isConnected }) => {
      if (isConnected && wasConnected === false) sync();
      wasConnected = isConnected;
    });
    return () => {
      appState.remove();
      network.remove();
    };
  }, [sync]);

  const start = useCallback(() => run(() => logbook.start(new Date())), [logbook, run]);

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

  // Uploads straight after finishing, so a Workout finished with signal reaches the server now.
  // Uploaded means this Workout left the phone, whatever happened to other Pending Workouts
  const uploadFinished = useCallback(
    async (finishing: () => Promise<FinishResult>): Promise<FinishOutcome> => {
      let result: FinishResult | undefined;
      await run(async () => {
        result = await finishing();
      });
      if (!result || result.status === "nothing-to-save") return { status: "nothing-to-save" };
      const { id } = result.workout;
      await sync();
      const stillPending = (await logbook.pending()).some((p) => p.id === id);
      return { status: "pending", uploaded: !stillPending };
    },
    [logbook, run, sync],
  );

  const finish = useCallback(
    ({ startedAt, endedAt }: { startedAt: Date; endedAt: Date }) =>
      uploadFinished(() => logbook.finish({ startedAt, endedAt, now: new Date() })),
    [logbook, uploadFinished],
  );

  const finishAtLastSet = useCallback(() => uploadFinished(() => logbook.finishAtLastSet()), [logbook, uploadFinished]);

  const discard = useCallback(() => run(() => logbook.discard()), [logbook, run]);

  const isStale = useCallback(() => logbook.isStale(new Date()), [logbook]);

  const deletePending = useCallback((workoutId: string) => run(() => logbook.deletePending(workoutId)), [logbook, run]);

  return (
    <LogbookContext
      value={{
        workout,
        isLoaded,
        start,
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
        deletePending,
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

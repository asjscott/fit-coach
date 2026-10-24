import { createLogbook, type FinishResult, type Logbook } from "@fit/engines";
import type { Exercise, InProgressWorkout, SetValues } from "@fit/shared";
import * as Crypto from "expo-crypto";
import Storage from "expo-sqlite/kv-store";
import { createContext, use, useCallback, useEffect, useState, type ReactNode } from "react";
import { useApi } from "@/api";

type LogbookContextValue = {
  // null when no Workout is in progress
  workout: InProgressWorkout | null;
  // false until the in-progress Workout has been read from the phone
  isLoaded: boolean;
  start: () => Promise<void>;
  addWorkoutExercise: (exercise: Pick<Exercise, "slug" | "loadType">) => Promise<void>;
  logSet: (workoutExerciseId: string, values: SetValues) => Promise<void>;
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
  const [isLoaded, setIsLoaded] = useState(false);

  // Runs a Logbook call, then shows what it left on the phone
  const run = useCallback(
    async (change: () => Promise<unknown>) => {
      try {
        await change();
      } finally {
        setWorkout(await logbook.inProgress());
      }
    },
    [logbook],
  );

  // Also uploads anything left pending last time the app ran
  useEffect(() => {
    logbook.inProgress().then((stored) => {
      setWorkout(stored);
      setIsLoaded(true);
    });
    logbook.sync().catch(() => {});
  }, [logbook]);

  const start = useCallback(() => run(() => logbook.start(new Date())), [logbook, run]);

  const addWorkoutExercise = useCallback(
    (exercise: Pick<Exercise, "slug" | "loadType">) => run(() => logbook.addWorkoutExercise(exercise)),
    [logbook, run],
  );

  const logSet = useCallback(
    (workoutExerciseId: string, values: SetValues) => run(() => logbook.logSet(workoutExerciseId, values, new Date())),
    [logbook, run],
  );

  // Uploads straight after finishing, so a Workout finished with signal reaches the server now
  const uploadFinished = useCallback(
    async (finishing: () => Promise<FinishResult>): Promise<FinishOutcome> => {
      let result: FinishResult;
      try {
        result = await finishing();
      } finally {
        setWorkout(await logbook.inProgress());
      }
      if (result.status === "nothing-to-save") return result;
      return logbook.sync().then(
        () => ({ status: "pending", uploaded: true }),
        () => ({ status: "pending", uploaded: false }),
      );
    },
    [logbook],
  );

  const finish = useCallback(
    ({ startedAt, endedAt }: { startedAt: Date; endedAt: Date }) =>
      uploadFinished(() => logbook.finish({ startedAt, endedAt, now: new Date() })),
    [logbook, uploadFinished],
  );

  const finishAtLastSet = useCallback(() => uploadFinished(() => logbook.finishAtLastSet()), [logbook, uploadFinished]);

  const discard = useCallback(() => run(() => logbook.discard()), [logbook, run]);

  const isStale = useCallback(() => logbook.isStale(new Date()), [logbook]);

  return (
    <LogbookContext
      value={{ workout, isLoaded, start, addWorkoutExercise, logSet, finish, finishAtLastSet, discard, isStale }}
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

import { createLogbook, type Logbook } from "@fit/engines";
import type { Exercise, InProgressWorkout, InProgressWorkoutExercise, SetValues } from "@fit/shared";
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
  removeWorkoutExercise: (workoutExerciseId: string) => Promise<void>;
  moveWorkoutExercise: (workoutExerciseId: string, toIndex: number) => Promise<void>;
  logSet: (workoutExerciseId: string, values: SetValues) => Promise<void>;
  editSet: (workoutExerciseId: string, setIndex: number, values: SetValues) => Promise<void>;
  deleteSet: (workoutExerciseId: string, setIndex: number) => Promise<void>;
  // The values a new Set starts with: the last Set's, or null for the first
  nextSetDraft: (workoutExercise: InProgressWorkoutExercise) => SetValues | null;
  discard: () => Promise<void>;
  // Ends the Workout now and tries to upload it. Resolves to whether the server has it;
  // if not, it stays on the phone as a Pending Workout
  finish: () => Promise<{ uploaded: boolean }>;
};

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

  const discard = useCallback(() => run(() => logbook.discard()), [logbook, run]);

  const finish = useCallback(async () => {
    await run(async () => {
      const current = await logbook.inProgress();
      if (current) await logbook.finish({ startedAt: new Date(current.startedAt), endedAt: new Date() });
    });
    return logbook.sync().then(
      () => ({ uploaded: true }),
      () => ({ uploaded: false }),
    );
  }, [logbook, run]);

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
        discard,
        finish,
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

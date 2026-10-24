import { createLogbook, type Logbook } from "@fit/engines";
import type { Exercise, InProgressWorkout, SetValues, Workout } from "@fit/shared";
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
  logSet: (workoutExerciseId: string, values: SetValues) => Promise<void>;
  // Ends the Workout now and tries to upload it. Resolves to whether the server has it;
  // if not, it stays on the phone as a Pending Workout
  finish: () => Promise<{ uploaded: boolean }>;
  // Finished Workouts still on the phone, waiting to upload; oldest first
  pending: Workout[];
  // Removes a Pending Workout so it never uploads; works offline
  deletePending: (workoutId: string) => Promise<void>;
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

  const finish = useCallback(async () => {
    let finished: Workout | undefined;
    await run(async () => {
      const current = await logbook.inProgress();
      if (current) finished = await logbook.finish({ startedAt: new Date(current.startedAt), endedAt: new Date() });
    });
    await sync();
    const stillPending = (await logbook.pending()).some((p) => p.id === finished?.id);
    return { uploaded: !stillPending };
  }, [logbook, run, sync]);

  const deletePending = useCallback((workoutId: string) => run(() => logbook.deletePending(workoutId)), [logbook, run]);

  return (
    <LogbookContext value={{ workout, isLoaded, start, addWorkoutExercise, logSet, finish, pending, deletePending }}>
      {children}
    </LogbookContext>
  );
}

export function useLogbook() {
  const context = use(LogbookContext);
  if (!context) throw new Error("useLogbook must be used inside <LogbookProvider>");
  return context;
}

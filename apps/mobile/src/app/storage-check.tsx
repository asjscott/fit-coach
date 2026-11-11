import { createLogbook } from "@fit/engines";
import type { PlannedWorkout } from "@fit/shared";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { Text } from "react-native";
import { deviceStorage } from "@/features/workouts/device-storage";

// Target of the browser check in e2e/ (`pnpm test:web`): writes and reads back through the Logbook's storage.
// Only built in when EXPO_PUBLIC_STORAGE_CHECK=1, so it needs no sign-in and never ships
const ENABLED = process.env.EXPO_PUBLIC_STORAGE_CHECK === "1";
const KEY = "storage-check";

const plannedWorkout: PlannedWorkout = {
  id: "3b241101-e2bb-4255-8caf-4136c566a962",
  status: "current",
  weekStart: "2026-11-02",
  createdAt: "2026-11-04T09:00:00.000Z",
  plannedExercises: [{ slug: "goblet-squat", sets: 3, target: { unit: "kg", kg: 20, reps: 8 } }],
};

const unused = () => {
  throw new Error("Not used by this check");
};

// A Logbook over the real storage, whose server only ever has this plan
const newLogbook = () =>
  createLogbook({
    storage: deviceStorage,
    uploader: { upload: unused, uploadCheckIn: unused },
    previousSets: { forExercise: unused },
    plannedWorkouts: { current: async () => plannedWorkout },
    newId: unused,
  });

export default function StorageCheck() {
  const [result, setResult] = useState("pending");

  useEffect(() => {
    if (!ENABLED) return;
    const value = `written-${Date.now()}-${Math.random()}`;
    (async () => {
      const previous = await deviceStorage.getItem(KEY);
      await deviceStorage.setItem(KEY, value);
      const read = await deviceStorage.getItem(KEY);
      // What an earlier load's Logbook kept, read before this load asks for the plan again
      const logbook = newLogbook();
      const plan = (await logbook.plannedWorkout()).plannedWorkout?.id ?? null;
      await logbook.refreshPlannedWorkout();
      setResult(
        read === value
          ? `STORAGE_OK previous=${previous} written=${value} plan=${plan}`
          : `STORAGE_MISMATCH read=${read}`,
      );
    })().catch((err) => setResult(`STORAGE_ERROR ${err instanceof Error ? err.message : String(err)}`));
  }, []);

  if (!ENABLED) return <Redirect href="/" />;
  return <Text testID="storage-check">{result}</Text>;
}

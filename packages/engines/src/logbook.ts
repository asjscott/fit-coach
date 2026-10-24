import {
  InProgressWorkout,
  Workout,
  type Exercise,
  type InProgressWorkoutExercise,
  type SetValues,
} from "@fit/shared";
import type { z } from "zod";

// Strings by key; expo-sqlite/kv-store on the phone, a Map in tests
export type PhoneStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

// Resolves once the server has the Workout; rejects on any failure
export type WorkoutUploader = {
  upload(workout: Workout): Promise<void>;
};

// A change the Logbook refused; the message is fit to show the user
export class LogbookError extends Error {}

function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new LogbookError(parsed.error.issues[0].message);
  return parsed.data;
}

const IN_PROGRESS_KEY = "logbook:in-progress";
const PENDING_KEY = "logbook:pending";

// Owns the Workout being logged and the Pending Workouts waiting to upload. Every change
// is written to phone storage before the call returns, so a Logbook rebuilt over the
// same storage carries on where it was
export function createLogbook({
  storage,
  uploader,
  newId,
}: {
  storage: PhoneStorage;
  uploader: WorkoutUploader;
  newId: () => string;
}) {
  // Calls run one at a time, so two quick taps can't both read the same Workout
  // and overwrite each other's change
  let queue: Promise<unknown> = Promise.resolve();
  const serially = <T>(task: () => Promise<T>): Promise<T> => {
    const result = queue.then(task);
    queue = result.catch(() => {});
    return result;
  };

  async function read() {
    const json = await storage.getItem(IN_PROGRESS_KEY);
    return json === null ? null : InProgressWorkout.parse(JSON.parse(json));
  }

  async function readOrThrow() {
    const workout = await read();
    if (!workout) throw new LogbookError("No Workout in progress");
    return workout;
  }

  const write = (workout: InProgressWorkout) => storage.setItem(IN_PROGRESS_KEY, JSON.stringify(workout));

  async function readPending() {
    const json = await storage.getItem(PENDING_KEY);
    return json === null ? [] : Workout.array().parse(JSON.parse(json));
  }

  const writePending = (workouts: Workout[]) => storage.setItem(PENDING_KEY, JSON.stringify(workouts));

  // Shared by overlapping sync() calls, so no Workout is uploaded twice at once
  let syncing: Promise<void> | null = null;

  function findWorkoutExercise(workout: InProgressWorkout, workoutExerciseId: string) {
    const workoutExercise = workout.workoutExercises.find((we) => we.id === workoutExerciseId);
    if (!workoutExercise) throw new LogbookError("No such Workout Exercise in this Workout");
    return workoutExercise;
  }

  function findSet(sets: InProgressWorkoutExercise["sets"], setIndex: number) {
    const set = sets[setIndex];
    if (!set) throw new LogbookError("No such Set in this Workout Exercise");
    return set;
  }

  return {
    inProgress: () => serially(read),

    start: (now: Date) =>
      serially(async () => {
        if (await read()) throw new LogbookError("A Workout is already in progress");
        const workout: InProgressWorkout = { id: newId(), startedAt: now.toISOString(), workoutExercises: [] };
        await write(workout);
        return workout;
      }),

    // Throws the in-progress Workout away; it never becomes a Pending Workout
    discard: () => serially(() => storage.removeItem(IN_PROGRESS_KEY)),

    // Snapshots the Exercise's Load Type so Sets can be checked without the library
    addWorkoutExercise: (exercise: Pick<Exercise, "slug" | "loadType">) =>
      serially(async () => {
        const workout = await readOrThrow();
        const workoutExercise: InProgressWorkoutExercise = {
          id: newId(),
          slug: exercise.slug,
          loadType: exercise.loadType,
          sets: [],
        };
        workout.workoutExercises.push(workoutExercise);
        await write(workout);
        return workoutExercise;
      }),

    removeWorkoutExercise: (workoutExerciseId: string) =>
      serially(async () => {
        const workout = await readOrThrow();
        const workoutExercise = findWorkoutExercise(workout, workoutExerciseId);
        workout.workoutExercises = workout.workoutExercises.filter((we) => we !== workoutExercise);
        await write(workout);
      }),

    // Moves a Workout Exercise to the given position, shifting the others along
    moveWorkoutExercise: (workoutExerciseId: string, toIndex: number) =>
      serially(async () => {
        const workout = await readOrThrow();
        const workoutExercise = findWorkoutExercise(workout, workoutExerciseId);
        const { workoutExercises } = workout;
        if (!Number.isInteger(toIndex) || toIndex < 0 || toIndex >= workoutExercises.length) {
          throw new LogbookError("Can't move a Workout Exercise outside the Workout");
        }
        workoutExercises.splice(workoutExercises.indexOf(workoutExercise), 1);
        workoutExercises.splice(toIndex, 0, workoutExercise);
        await write(workout);
      }),

    logSet: (workoutExerciseId: string, values: SetValues, now: Date) =>
      serially(async () => {
        const workout = await readOrThrow();
        const workoutExercise = findWorkoutExercise(workout, workoutExerciseId);
        workoutExercise.sets.push({ ...values, loggedAt: now.toISOString() });
        await write(parseOrThrow(InProgressWorkout, workout));
        return workoutExercise;
      }),

    // Replaces a Set's values; it keeps the time it was logged
    editSet: (workoutExerciseId: string, setIndex: number, values: SetValues) =>
      serially(async () => {
        const workout = await readOrThrow();
        const { sets } = findWorkoutExercise(workout, workoutExerciseId);
        const set = findSet(sets, setIndex);
        sets[setIndex] = { ...values, loggedAt: set.loggedAt };
        await write(parseOrThrow(InProgressWorkout, workout));
      }),

    deleteSet: (workoutExerciseId: string, setIndex: number) =>
      serially(async () => {
        const workout = await readOrThrow();
        const { sets } = findWorkoutExercise(workout, workoutExerciseId);
        findSet(sets, setIndex);
        sets.splice(setIndex, 1);
        await write(workout);
      }),

    // The values to pre-fill the next Set with: the last Set's, or null for the first Set
    nextSetDraft: (workoutExercise: InProgressWorkoutExercise): SetValues | null => {
      const last = workoutExercise.sets.at(-1);
      if (!last) return null;
      return Object.fromEntries(Object.entries(last).filter(([key]) => key !== "loggedAt")) as SetValues;
    },

    // Turns the in-progress Workout into a Pending Workout; sync() uploads it
    finish: ({ startedAt, endedAt }: { startedAt: Date; endedAt: Date }) =>
      serially(async () => {
        const { id, workoutExercises } = await readOrThrow();
        const workout = parseOrThrow(Workout, {
          id,
          startedAt: startedAt.toISOString(),
          endedAt: endedAt.toISOString(),
          workoutExercises: workoutExercises.map(({ slug, loadType, sets }) => ({ slug, loadType, sets })),
        });
        await writePending([...(await readPending()), workout]);
        await storage.removeItem(IN_PROGRESS_KEY);
        return workout;
      }),

    // Uploads each Pending Workout, removing it from the phone only once the server has it.
    // Rejects on the first failure, leaving that Workout and any after it pending.
    // Uploads run outside the queue, so logging a Set never waits on the network
    sync: () =>
      (syncing ??= (async () => {
        try {
          for (const workout of await serially(readPending)) {
            await uploader.upload(workout);
            await serially(async () => writePending((await readPending()).filter((p) => p.id !== workout.id)));
          }
        } finally {
          syncing = null;
        }
      })()),
  };
}

export type Logbook = ReturnType<typeof createLogbook>;

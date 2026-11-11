import {
  DatedCheckIn,
  InProgressWorkout,
  PlannedWorkout,
  Workout,
  type AssessmentPart,
  type BodyProfile,
  type EquipmentProfile,
  type Exercise,
  type InProgressWorkoutExercise,
  type LoadType,
  type PlannedExercise,
  type PreviousSets,
  type SetTarget,
  type SetValues,
  type UserProfile,
} from "@fit/shared";
import { z } from "zod";
import {
  hasTestResult,
  isRatedTest,
  protocolState,
  TEST_REPS,
  testProgress,
  type ProtocolState,
  type TestProgress,
} from "./assessment-protocol";
import { canAssess, chooseTests, partTests } from "./assessment-tests";
import { exerciseBySlug } from "./data/exercises";
import { exerciseLoadsKg, stepLoadKg, type ProfileWithLoads, type StepDirection } from "./equipment";
import { isRecoveryWorkout, RECOVERY_WORKOUT, trainingWorkouts } from "./recovery-workout";
import { previousSets } from "./training-summaries";

// Strings by key: SQLite on the phone, localStorage on web, a Map in tests
export type DeviceStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

// What's stored under a key, or null with nothing there. A copy an older version of the app wrote can fail to parse,
// which counts as nothing
export async function readStoredCopy<T>(storage: DeviceStorage, key: string, schema: z.ZodType<T>): Promise<T | null> {
  const json = await storage.getItem(key);
  return json === null ? null : (schema.safeParse(JSON.parse(json)).data ?? null);
}

// Each resolves once the server has the Workout or Check-in; rejects on any failure
export type WorkoutUploader = {
  upload(workout: Workout): Promise<void>;
  uploadCheckIn(checkIn: DatedCheckIn): Promise<void>;
};

// The server's Previous Sets for an Exercise: null when no Workout on the server has it; rejects
// on any failure, such as no signal
export type PreviousSetsSource = {
  forExercise(slug: string): Promise<PreviousSets | null>;
};

// The plan the server says to train next, building one if it's due: null when it can't, such as before the first
// Assessment; rejects on any failure, such as no signal
export type PlannedWorkoutSource = {
  current(): Promise<PlannedWorkout | null>;
};

// The latest Planned Workout the phone has (ADR 0003). Stale from a Workout finishing until the plan that counts it
// arrives, so Today never shows a plan the phone knows is out of date. A Recovery Workout changes no plan, so it never
// makes one stale
export type PlannedWorkoutCopy = { plannedWorkout: PlannedWorkout | null; stale: boolean };

// When a Workout started and ended, as the user confirms them on finishing
export type WorkoutTimes = { startedAt: Date; endedAt: Date };

export type FinishResult = { status: "pending"; workout: Workout } | { status: "nothing-to-save" };

// A change the Logbook refused; the message is fit to show the user
export class LogbookError extends Error {}

function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new LogbookError(parsed.error.issues[0].message);
  return parsed.data;
}

// A Workout left this long after its last Set was probably forgotten, not still going
const STALE_AFTER_MS = 3 * 60 * 60 * 1000;

// When the most recently logged Set was logged, or null with no Sets
function lastSetAt(workout: InProgressWorkout): Date | null {
  const times = workout.workoutExercises.flatMap((we) => we.sets.map((set) => Date.parse(set.loggedAt)));
  return times.length === 0 ? null : new Date(Math.max(...times));
}

// For an Exercise the server's library has and the phone's doesn't yet, which can still be logged
const LOAD_TYPE_OF_TARGET: Record<SetTarget["unit"], LoadType> = {
  kg: "external",
  band: "external",
  reps: "bodyweight",
  seconds: "timed",
};

const plannedLoadType = ({ slug, target }: PlannedExercise) =>
  exerciseBySlug(slug)?.loadType ?? LOAD_TYPE_OF_TARGET[target.unit];

// A Set's values from its target, or null when the target can't fill them, like a band level where kg is logged. A
// target's kg is only as round as the profile's loads, and a Set's must be in 0.25 kg steps
function targetDraft(loadType: LoadType, target: SetTarget): SetValues | null {
  if (loadType === "external" && target.unit === "kg") {
    return { kind: "external", kg: Math.round(target.kg * 4) / 4, reps: target.reps };
  }
  if (loadType === "bodyweight" && "reps" in target) return { kind: "bodyweight", reps: target.reps };
  if (loadType === "timed" && target.unit === "seconds") return { kind: "timed", seconds: target.seconds };
  return null;
}

const IN_PROGRESS_KEY = "logbook:in-progress";
const PENDING_KEY = "logbook:pending";
const PLANNED_WORKOUT_KEY = "logbook:planned-workout";
const PENDING_CHECK_INS_KEY = "logbook:pending-check-ins";

// awaitingNextPlan: a Workout has uploaded since this plan was built, so the server has a newer one for the phone
const StoredPlannedWorkout = z.object({ plannedWorkout: PlannedWorkout, awaitingNextPlan: z.boolean() });
type StoredPlannedWorkout = z.infer<typeof StoredPlannedWorkout>;

// Owns the Workout being logged, the Pending Workouts waiting to upload and the copy of the Planned Workout. Every
// change is written to device storage before the call returns, so a Logbook rebuilt over the same storage carries on
// where it was
export function createLogbook({
  storage,
  uploader,
  previousSets: previousSetsSource,
  plannedWorkouts,
  newId,
}: {
  storage: DeviceStorage;
  uploader: WorkoutUploader;
  previousSets: PreviousSetsSource;
  plannedWorkouts: PlannedWorkoutSource;
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

  // Check-ins waiting to upload, at most one per date. One the phone can't read counts as none, as it's not training
  const readPendingCheckIns = async () =>
    (await readStoredCopy(storage, PENDING_CHECK_INS_KEY, DatedCheckIn.array())) ?? [];

  const writePendingCheckIns = (checkIns: DatedCheckIn[]) =>
    storage.setItem(PENDING_CHECK_INS_KEY, JSON.stringify(checkIns));

  // The same Check-in: a newer one for its date is a different one
  const sameCheckIn = (a: DatedCheckIn, b: DatedCheckIn) => a.date === b.date && a.checkedInAt === b.checkedInAt;

  // With no copy, the phone asks for a plan
  const readPlannedWorkout = () => readStoredCopy(storage, PLANNED_WORKOUT_KEY, StoredPlannedWorkout);

  const writePlannedWorkout = (stored: StoredPlannedWorkout) =>
    storage.setItem(PLANNED_WORKOUT_KEY, JSON.stringify(stored));

  async function plannedWorkoutCopy(): Promise<PlannedWorkoutCopy> {
    const stored = await readPlannedWorkout();
    if (!stored) return { plannedWorkout: null, stale: false };
    const { plannedWorkout, awaitingNextPlan } = stored;
    return { plannedWorkout, stale: awaitingNextPlan || trainingWorkouts(await readPending()).length > 0 };
  }

  // Shared by overlapping sync() calls, so no Workout is uploaded twice at once
  let syncing: Promise<void> | null = null;

  // Tells a plan built after the last upload from an answer that may have left the server before it
  let uploadCount = 0;

  // Uploads each Pending Workout, removing it once the server has it. Reads the phone again before each upload, so a
  // Workout deleted meanwhile is skipped
  async function uploadPendingWorkouts(failures: unknown[]) {
    const tried = new Set<string>();
    let workout: Workout | undefined;
    while ((workout = (await serially(readPending)).find((p) => !tried.has(p.id)))) {
      tried.add(workout.id);
      try {
        await uploader.upload(workout);
      } catch (err) {
        failures.push(err);
        continue;
      }
      // A Recovery Workout changes no plan, so the copy stays current
      const changesPlan = !isRecoveryWorkout(workout);
      if (changesPlan) uploadCount += 1;
      const { id } = workout;
      await serially(async () => {
        await writePending((await readPending()).filter((p) => p.id !== id));
        const stored = await readPlannedWorkout();
        if (stored && changesPlan) await writePlannedWorkout({ ...stored, awaitingNextPlan: true });
      });
    }
  }

  // Uploads each queued Check-in the same way. One replaced while it uploads stays queued as the newer one, which
  // uploads next, so the server ends on the latest
  async function uploadPendingCheckIns(failures: unknown[]) {
    const tried: DatedCheckIn[] = [];
    let checkIn: DatedCheckIn | undefined;
    while (
      (checkIn = (await serially(readPendingCheckIns)).find((queued) => !tried.some((t) => sameCheckIn(t, queued))))
    ) {
      tried.push(checkIn);
      try {
        await uploader.uploadCheckIn(checkIn);
      } catch (err) {
        failures.push(err);
        continue;
      }
      const uploaded = checkIn;
      await serially(async () =>
        writePendingCheckIns((await readPendingCheckIns()).filter((queued) => !sameCheckIn(queued, uploaded))),
      );
    }
  }

  // A Workout Exercise with its Previous Sets snapshot: the server's or a Pending Workout's, whichever is newer
  function newWorkoutExercise(
    { slug, loadType }: Pick<Exercise, "slug" | "loadType">,
    fromServer: PreviousSets | null,
    pending: Workout[],
  ): InProgressWorkoutExercise {
    const asWorkout = fromServer && { ...fromServer, workoutExercises: [{ slug, sets: fromServer.sets }] };
    const latest = previousSets(asWorkout ? [...pending, asWorkout] : pending, slug);
    return { id: newId(), slug, loadType, sets: [], ...(latest && { previousSets: latest }) };
  }

  // Its tests were chosen and ordered for it, so the results mean what they say
  function refuseIfAssessment(workout: InProgressWorkout) {
    if (workout.assessment) throw new LogbookError("An Assessment Workout's Exercises can't be changed");
  }

  // A weighted test's Sets are read by their RPE
  function refuseUnratedTestSet(workout: InProgressWorkout, values: SetValues) {
    if (isRatedTest(workout, values.kind) && values.rpe === undefined) {
      throw new LogbookError("Rate how hard the Set felt");
    }
  }

  // A test that has its result takes no more Sets; correcting or deleting its Sets can reopen it
  function refuseSetOnDoneTest(workout: InProgressWorkout, workoutExercise: InProgressWorkoutExercise) {
    if (workout.assessment && hasTestResult(workoutExercise)) throw new LogbookError("This test is done");
  }

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

  async function finishAs(
    { id, assessment, plannedWorkoutId, workoutExercises }: InProgressWorkout,
    { startedAt, endedAt, now }: WorkoutTimes & { now: Date },
  ): Promise<FinishResult> {
    const withSets = workoutExercises.filter(({ sets }) => sets.length > 0);
    if (withSets.length === 0) return { status: "nothing-to-save" };
    if (endedAt > now) throw new LogbookError("The end can't be in the future");
    const workout = parseOrThrow(Workout, {
      id,
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      ...(assessment && { assessment }),
      ...(plannedWorkoutId && { plannedWorkoutId }),
      workoutExercises: withSets.map(({ slug, loadType, sets }) => ({ slug, loadType, sets })),
    });
    await writePending([...(await readPending()), workout]);
    await storage.removeItem(IN_PROGRESS_KEY);
    return { status: "pending", workout };
  }

  // A Workout started with its Exercises and their targets, and nothing logged
  async function startWithTargets(
    plannedExercises: readonly (Pick<PlannedExercise, "slug" | "sets" | "target"> & { supersetWith?: string })[],
    now: Date,
    plannedWorkoutId?: string,
  ) {
    const fromServer = await Promise.all(
      plannedExercises.map(({ slug }) => previousSetsSource.forExercise(slug).catch(() => null)),
    );
    return serially(async () => {
      if (await read()) throw new LogbookError("A Workout is already in progress");
      const pending = await readPending();
      const workoutExercises = plannedExercises.map((plannedExercise, i): InProgressWorkoutExercise => {
        const { slug, sets, target } = plannedExercise;
        const exercise = { slug, loadType: plannedLoadType(plannedExercise) };
        return { ...newWorkoutExercise(exercise, fromServer[i], pending), planned: { sets, target } };
      });
      // A superset names its partner by slug, unique in the day's Workout, and the Workout by Workout Exercise
      plannedExercises.forEach(({ supersetWith }, i) => {
        const partner = workoutExercises.find(({ slug }) => slug === supersetWith);
        const planned = workoutExercises[i]?.planned;
        if (partner && planned) planned.supersetWith = partner.id;
      });
      const workout: InProgressWorkout = {
        id: newId(),
        startedAt: now.toISOString(),
        ...(plannedWorkoutId && { plannedWorkoutId }),
        workoutExercises,
      };
      await write(workout);
      return workout;
    });
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

    // Throws the in-progress Workout away; nothing reaches History
    discard: () => serially(() => storage.removeItem(IN_PROGRESS_KEY)),

    // True when the in-progress Workout was probably forgotten: more than 3 hours since
    // its last Set, or since the start if it has none
    isStale: (now: Date) =>
      serially(async () => {
        const workout = await read();
        if (!workout) return false;
        const since = lastSetAt(workout) ?? new Date(workout.startedAt);
        return now.getTime() - since.getTime() > STALE_AFTER_MS;
      }),

    // Snapshots the Exercise's Load Type so Sets can be checked without the library, and its
    // Previous Sets (ADR 0002): the server's or a Pending Workout's, whichever Workout is newer.
    // With no signal only Pending Workouts count; with neither, there are no Previous Sets.
    // The server is asked outside the queue, so other changes never wait on the network
    addWorkoutExercise: async (exercise: Pick<Exercise, "slug" | "loadType">) => {
      const fromServer = await previousSetsSource.forExercise(exercise.slug).catch(() => null);
      return serially(async () => {
        const workout = await readOrThrow();
        refuseIfAssessment(workout);
        const workoutExercise = newWorkoutExercise(exercise, fromServer, await readPending());
        workout.workoutExercises.push(workoutExercise);
        await write(workout);
        return workoutExercise;
      });
    },

    // Starts Assessment Workout A or B with its tests already added, in order: one per Pattern, chosen from the
    // primary Equipment Profile and the user's injuries. Body weight and gender are for the first suggested load
    startAssessment: async (
      {
        part,
        equipmentProfile,
        injuries,
        bodyProfile,
      }: {
        part: AssessmentPart;
        equipmentProfile: Pick<EquipmentProfile, "tags">;
        bodyProfile: BodyProfile;
      } & Pick<UserProfile, "injuries">,
      now: Date,
    ) => {
      const tests = chooseTests(equipmentProfile, injuries);
      if (!canAssess(tests)) throw new LogbookError("No Assessment suits this equipment and these injuries");
      const { exercises } = partTests(tests, part);
      const fromServer = await Promise.all(
        exercises.map(({ slug }) => previousSetsSource.forExercise(slug).catch(() => null)),
      );
      return serially(async () => {
        if (await read()) throw new LogbookError("A Workout is already in progress");
        const pending = await readPending();
        const workout: InProgressWorkout = {
          id: newId(),
          startedAt: now.toISOString(),
          assessment: part,
          bodyProfile,
          workoutExercises: exercises.map((exercise, i) => newWorkoutExercise(exercise, fromServer[i], pending)),
        };
        await write(workout);
        return workout;
      });
    },

    // Starts a Planned Workout with its Exercises added and nothing logged: only what the user does counts, and
    // the targets start each Exercise's first Set. Works with no signal, and later edits never touch the link
    startPlannedWorkout: (
      { id: plannedWorkoutId, plannedExercises }: Pick<PlannedWorkout, "id" | "plannedExercises">,
      now: Date,
    ) => startWithTargets(plannedExercises, now, plannedWorkoutId),

    // Starts the Recovery Workout the same way, from the library built into the app, so it works with no signal. It
    // links to no plan, so the Planned Workout stays current and is offered again
    startRecoveryWorkout: (now: Date) => startWithTargets(RECOVERY_WORKOUT, now),

    removeWorkoutExercise: (workoutExerciseId: string) =>
      serially(async () => {
        const workout = await readOrThrow();
        refuseIfAssessment(workout);
        const workoutExercise = findWorkoutExercise(workout, workoutExerciseId);
        workout.workoutExercises = workout.workoutExercises.filter((we) => we !== workoutExercise);
        await write(workout);
      }),

    // Moves a Workout Exercise to the given position, shifting the others along
    moveWorkoutExercise: (workoutExerciseId: string, toIndex: number) =>
      serially(async () => {
        const workout = await readOrThrow();
        refuseIfAssessment(workout);
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
        refuseUnratedTestSet(workout, values);
        refuseSetOnDoneTest(workout, workoutExercise);
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
        refuseUnratedTestSet(workout, values);
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

    // The values to pre-fill the next Set with: a test's suggested load, else the last Set's (not its RPE: each Set is
    // rated on its own), else the plan's target, or null for the first Set
    nextSetDraft: (workoutExercise: InProgressWorkoutExercise, protocol?: ProtocolState): SetValues | null => {
      if (protocol && "suggestedKg" in protocol && protocol.suggestedKg !== null) {
        return { kind: "external", kg: protocol.suggestedKg, reps: TEST_REPS };
      }
      const last = workoutExercise.sets.at(-1);
      if (!last) {
        const { loadType, planned } = workoutExercise;
        return planned ? targetDraft(loadType, planned.target) : null;
      }
      return Object.fromEntries(
        Object.entries(last).filter(([key]) => key !== "loggedAt" && key !== "rpe"),
      ) as SetValues;
    },

    // For a test Exercise of an Assessment Workout: the suggested next load, or done. The logging screen only renders
    // it. The first load follows the body weight and gender the Workout started with
    protocolState: (
      { bodyProfile }: Pick<InProgressWorkout, "bodyProfile">,
      workoutExercise: Pick<InProgressWorkoutExercise, "slug" | "sets">,
      equipmentProfile: ProfileWithLoads,
    ) => protocolState(workoutExercise, equipmentProfile, bodyProfile),

    // For an Assessment Workout: the test to open next and whether every test is done, so the screen only renders it
    testProgress: (
      workout: Pick<InProgressWorkout, "workoutExercises" | "bodyProfile">,
      equipmentProfile: ProfileWithLoads,
    ): TestProgress => testProgress(workout, equipmentProfile),

    // The Logbook rather than the screen decides, so Manual and Assessment Workouts step through the same loads (#58)
    nextLoadKg: (slug: string, kg: number, direction: StepDirection, equipmentProfile: ProfileWithLoads | undefined) =>
      stepLoadKg(kg, direction, exerciseLoadsKg(slug, equipmentProfile)),

    // Turns the in-progress Workout into a Pending Workout; sync() uploads it. Workout
    // Exercises with no Sets are dropped; with no Sets at all there is nothing to save,
    // and the Workout stays in progress for the user to confirm a discard
    finish: ({ startedAt, endedAt, now }: WorkoutTimes & { now: Date }) =>
      serially(async () => finishAs(await readOrThrow(), { startedAt, endedAt, now })),

    // For a forgotten Workout: finishes with the last Set's time as the end
    finishAtLastSet: () =>
      serially(async (): Promise<FinishResult> => {
        const workout = await readOrThrow();
        const endedAt = lastSetAt(workout);
        if (!endedAt) return { status: "nothing-to-save" };
        return finishAs(workout, { startedAt: new Date(workout.startedAt), endedAt, now: endedAt });
      }),

    // The finished Workouts still waiting to upload, oldest first
    pending: () => serially(readPending),

    // How many finished Workouts haven't uploaded yet: what signing out now would lose
    pendingCount: () => serially(async () => (await readPending()).length),

    // Removes a Pending Workout from the phone so it never uploads. A Workout already
    // uploading when this is called may still reach the server
    deletePending: (workoutId: string) =>
      serially(async () => writePending((await readPending()).filter((p) => p.id !== workoutId))),

    // The copy of the latest Planned Workout. Starting one takes a snapshot of it, so nothing here can touch a Workout
    // under way, and discarding that Workout shows this copy again
    plannedWorkout: () => serially(plannedWorkoutCopy),

    // Asks the server, outside the queue, and keeps its answer for offline. A failure rejects and keeps the copy
    refreshPlannedWorkout: async () => {
      let uploadCountWhenAsked: number;
      let plannedWorkout: PlannedWorkout | null;
      // An upload during the ask makes the answer out of date, so ask again rather than keep it
      do {
        uploadCountWhenAsked = uploadCount;
        plannedWorkout = await plannedWorkouts.current();
      } while (uploadCount !== uploadCountWhenAsked);
      return serially(async () => {
        if (plannedWorkout) {
          await writePlannedWorkout({ plannedWorkout, awaitingNextPlan: false });
        } else {
          await storage.removeItem(PLANNED_WORKOUT_KEY);
        }
        return plannedWorkoutCopy();
      });
    },

    // For signing out: removes the in-progress and Pending Workouts and the Planned Workout from the phone, so
    // the next person can't see them. A Workout already uploading may still reach the server
    clear: () =>
      serially(async () => {
        await storage.removeItem(IN_PROGRESS_KEY);
        await storage.removeItem(PENDING_KEY);
        await storage.removeItem(PLANNED_WORKOUT_KEY);
        await storage.removeItem(PENDING_CHECK_INS_KEY);
      }),

    // Queues a Check-in for sync() to upload, replacing any still queued for its date, so only the latest goes up.
    // The day's Check-in for Readiness is the phone's own copy, kept apart from this queue
    queueCheckIn: (checkIn: DatedCheckIn) =>
      serially(async () => {
        const parsed = parseOrThrow(DatedCheckIn, checkIn);
        const others = (await readPendingCheckIns()).filter((queued) => queued.date !== parsed.date);
        await writePendingCheckIns([...others, parsed]);
      }),

    // Uploads each Pending Workout, then each queued Check-in, removing it from the phone only once the server has it.
    // A failed upload leaves it pending and moves on to the next; once all have
    // been tried, rejects with the first failure if there was one.
    // Uploads run outside the queue, so logging a Set never waits on the network
    sync: () =>
      (syncing ??= (async () => {
        const failures: unknown[] = [];
        try {
          await uploadPendingWorkouts(failures);
          await uploadPendingCheckIns(failures);
        } finally {
          syncing = null;
        }
        if (failures.length) throw failures[0];
      })()),
  };
}

export type Logbook = ReturnType<typeof createLogbook>;

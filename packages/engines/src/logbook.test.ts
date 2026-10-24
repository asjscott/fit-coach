import type { Workout } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { EXERCISES } from "./data/exercises";
import { createLogbook, LogbookError, type PhoneStorage } from "./logbook";

const exercise = (slug: string) => {
  const found = EXERCISES.find((e) => e.slug === slug);
  if (!found) throw new Error(`No exercise with slug "${slug}"`);
  return found;
};

function memoryStorage(): PhoneStorage {
  const items = new Map<string, string>();
  return {
    getItem: async (key) => items.get(key) ?? null,
    setItem: async (key, value) => void items.set(key, value),
    removeItem: async (key) => void items.delete(key),
  };
}

// Records what reached the server
function fakeUploader() {
  const uploaded: Workout[] = [];
  return { uploaded, upload: async (workout: Workout) => void uploaded.push(workout) };
}

function setup(storage = memoryStorage()) {
  const uploader = fakeUploader();
  const logbook = createLogbook({ storage, uploader, newId: () => crypto.randomUUID() });
  return { logbook, uploader, storage };
}

const at = (time: string) => new Date(`2026-10-24T${time}:00.000Z`);


// A finished Workout with one plank Set, started at the given time
async function finishPlank(logbook: ReturnType<typeof setup>["logbook"], startedAt: string) {
  await logbook.start(at(startedAt));
  const plank = await logbook.addWorkoutExercise(exercise("plank"));
  await logbook.logSet(plank.id, { kind: "timed", seconds: 60 }, at(startedAt));
  return logbook.finish({ startedAt: at(startedAt), endedAt: new Date(at(startedAt).getTime() + 600_000) });
}

describe("Logbook", () => {
  it("uploads a finished Workout once, with its Workout Exercises and Sets in order", async () => {
    const { logbook, uploader } = setup();
    await logbook.start(at("09:00"));
    const squat = await logbook.addWorkoutExercise(exercise("goblet-squat"));
    const plank = await logbook.addWorkoutExercise(exercise("plank"));
    await logbook.logSet(squat.id, { kind: "external", kg: 20, reps: 10 }, at("09:05"));
    await logbook.logSet(squat.id, { kind: "external", kg: 22.5, reps: 8 }, at("09:08"));
    await logbook.logSet(plank.id, { kind: "timed", seconds: 45 }, at("09:12"));

    await logbook.finish({ startedAt: at("09:00"), endedAt: at("09:30") });
    await logbook.sync();
    await logbook.sync();

    expect(uploader.uploaded).toHaveLength(1);
    expect(uploader.uploaded[0]).toMatchObject({
      startedAt: "2026-10-24T09:00:00.000Z",
      endedAt: "2026-10-24T09:30:00.000Z",
      workoutExercises: [
        {
          slug: "goblet-squat",
          loadType: "external",
          sets: [
            { kind: "external", kg: 20, reps: 10, loggedAt: "2026-10-24T09:05:00.000Z" },
            { kind: "external", kg: 22.5, reps: 8, loggedAt: "2026-10-24T09:08:00.000Z" },
          ],
        },
        { slug: "plank", loadType: "timed", sets: [{ kind: "timed", seconds: 45, loggedAt: "2026-10-24T09:12:00.000Z" }] },
      ],
    });
    expect(await logbook.inProgress()).toBeNull();
  });

  it("still has the in-progress Workout when rebuilt over the same storage", async () => {
    const { logbook, storage } = setup();
    await logbook.start(at("09:00"));
    const pushUp = await logbook.addWorkoutExercise(exercise("push-up"));
    await logbook.logSet(pushUp.id, { kind: "bodyweight", reps: 12 }, at("09:05"));

    const rebuilt = setup(storage).logbook;

    expect(await rebuilt.inProgress()).toEqual(await logbook.inProgress());
    expect((await rebuilt.inProgress())?.workoutExercises[0].sets).toEqual([
      { kind: "bodyweight", reps: 12, loggedAt: "2026-10-24T09:05:00.000Z" },
    ]);
  });

  it("refuses to start while a Workout is in progress", async () => {
    const { logbook } = setup();
    const first = await logbook.start(at("09:00"));

    await expect(logbook.start(at("09:10"))).rejects.toThrow("already in progress");
    expect(await logbook.inProgress()).toEqual(first);
  });

  it("keeps the Sets of quick successive calls", async () => {
    const { logbook } = setup();
    await logbook.start(at("09:00"));
    const squat = await logbook.addWorkoutExercise(exercise("goblet-squat"));

    await Promise.all([
      logbook.logSet(squat.id, { kind: "external", kg: 20, reps: 10 }, at("09:05")),
      logbook.logSet(squat.id, { kind: "external", kg: 20, reps: 9 }, at("09:06")),
    ]);

    expect((await logbook.inProgress())?.workoutExercises[0].sets).toHaveLength(2);
  });

  it("keeps a finished Workout on the phone until an upload succeeds", async () => {
    const { logbook, uploader, storage } = setup();
    await logbook.start(at("09:00"));
    const plank = await logbook.addWorkoutExercise(exercise("plank"));
    await logbook.logSet(plank.id, { kind: "timed", seconds: 60 }, at("09:05"));
    uploader.upload = async () => {
      throw new Error("No signal");
    };

    await logbook.finish({ startedAt: at("09:00"), endedAt: at("09:10") });
    await expect(logbook.sync()).rejects.toThrow("No signal");

    expect(await logbook.inProgress()).toBeNull();

    // The app was killed and the signal came back
    const rebuilt = setup(storage);
    await rebuilt.logbook.sync();
    expect(rebuilt.uploader.uploaded).toHaveLength(1);
    expect(rebuilt.uploader.uploaded[0].workoutExercises[0].slug).toBe("plank");
  });

  it("refuses to finish a Workout with no Sets", async () => {
    const { logbook, uploader } = setup();
    await logbook.start(at("09:00"));
    await logbook.addWorkoutExercise(exercise("plank"));

    await expect(logbook.finish({ startedAt: at("09:00"), endedAt: at("09:10") })).rejects.toThrow();

    expect(uploader.uploaded).toEqual([]);
    expect(await logbook.inProgress()).not.toBeNull();
  });

  it("refuses a Set that doesn't match the Workout Exercise's Load Type", async () => {
    const { logbook } = setup();
    await logbook.start(at("09:00"));
    const plank = await logbook.addWorkoutExercise(exercise("plank"));

    await expect(logbook.logSet(plank.id, { kind: "bodyweight", reps: 10 }, at("09:05"))).rejects.toThrow();

    expect((await logbook.inProgress())?.workoutExercises[0].sets).toEqual([]);
  });

  it("refuses a weight that isn't in 0.25 kg steps, saying why", async () => {
    const { logbook } = setup();
    await logbook.start(at("09:00"));
    const squat = await logbook.addWorkoutExercise(exercise("goblet-squat"));

    await expect(logbook.logSet(squat.id, { kind: "external", kg: 20.1, reps: 10 }, at("09:05"))).rejects.toThrow(
      new LogbookError("Use 0.25 kg steps"),
    );
  });

  it("still uploads the other Pending Workouts when one upload fails", async () => {
    const { logbook, uploader } = setup();
    const first = await finishPlank(logbook, "07:00");
    const second = await finishPlank(logbook, "08:00");
    const third = await finishPlank(logbook, "09:00");
    const upload = uploader.upload;
    uploader.upload = async (workout) => {
      if (workout.id === second.id) throw new Error("Server error");
      return upload(workout);
    };

    await expect(logbook.sync()).rejects.toThrow("Server error");

    expect(uploader.uploaded.map((w) => w.id)).toEqual([first.id, third.id]);
    expect((await logbook.pending()).map((w) => w.id)).toEqual([second.id]);
  });

  it("uploads each Pending Workout once when two syncs overlap", async () => {
    const { logbook, uploader } = setup();
    await finishPlank(logbook, "08:00");
    await finishPlank(logbook, "09:00");
    const upload = uploader.upload;
    // A slow connection, so the second sync starts while the first is still uploading
    uploader.upload = async (workout) => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return upload(workout);
    };

    await Promise.all([logbook.sync(), logbook.sync()]);

    expect(uploader.uploaded).toHaveLength(2);
    expect(await logbook.pending()).toEqual([]);
  });

  it("keeps a Workout finished offline pending until the signal is back", async () => {
    const { logbook, uploader } = setup();
    const upload = uploader.upload;
    uploader.upload = async () => {
      throw new Error("No signal");
    };
    const workout = await finishPlank(logbook, "09:00");
    await expect(logbook.sync()).rejects.toThrow("No signal");

    expect(await logbook.pending()).toEqual([workout]);
    expect(uploader.uploaded).toEqual([]);

    uploader.upload = upload;
    await logbook.sync();

    expect(uploader.uploaded).toEqual([workout]);
    expect(await logbook.pending()).toEqual([]);
  });

  it("still has the Pending Workouts when rebuilt over the same storage", async () => {
    const { logbook, uploader, storage } = setup();
    uploader.upload = async () => {
      throw new Error("No signal");
    };
    const workout = await finishPlank(logbook, "09:00");

    expect(await setup(storage).logbook.pending()).toEqual([workout]);
  });

  it("never uploads a deleted Pending Workout", async () => {
    const { logbook, uploader } = setup();
    const kept = await finishPlank(logbook, "08:00");
    const deleted = await finishPlank(logbook, "09:00");

    await logbook.deletePending(deleted.id);
    await logbook.sync();

    expect(uploader.uploaded).toEqual([kept]);
    expect(await logbook.pending()).toEqual([]);
  });

  it("doesn't upload a Pending Workout deleted while a sync is under way", async () => {
    const { logbook, uploader } = setup();
    const first = await finishPlank(logbook, "08:00");
    const second = await finishPlank(logbook, "09:00");
    const upload = uploader.upload;
    uploader.upload = async (workout) => {
      // The user deletes the second one while the first is uploading
      if (workout.id === first.id) await logbook.deletePending(second.id);
      return upload(workout);
    };

    await logbook.sync();

    expect(uploader.uploaded).toEqual([first]);
    expect(await logbook.pending()).toEqual([]);
  });
});

describe("Logbook: correcting the in-progress Workout", () => {
  it("drafts the next Set from the previous Set, and nothing for the first Set", async () => {
    const { logbook } = setup();
    await logbook.start(at("09:00"));
    const squat = await logbook.addWorkoutExercise(exercise("goblet-squat"));

    expect(logbook.nextSetDraft(squat)).toBeNull();

    await logbook.logSet(squat.id, { kind: "external", kg: 20, reps: 10 }, at("09:05"));
    const afterTwo = await logbook.logSet(squat.id, { kind: "external", kg: 22.5, reps: 8 }, at("09:08"));

    expect(logbook.nextSetDraft(afterTwo)).toEqual({ kind: "external", kg: 22.5, reps: 8 });
  });

  it("saves an edited Set, keeping when it was logged", async () => {
    const { logbook, storage } = setup();
    await logbook.start(at("09:00"));
    const squat = await logbook.addWorkoutExercise(exercise("goblet-squat"));
    await logbook.logSet(squat.id, { kind: "external", kg: 20, reps: 10 }, at("09:05"));
    await logbook.logSet(squat.id, { kind: "external", kg: 20, reps: 9 }, at("09:08"));

    await logbook.editSet(squat.id, 0, { kind: "external", kg: 22.5, reps: 10 });

    const rebuilt = setup(storage).logbook;
    expect((await rebuilt.inProgress())?.workoutExercises[0].sets).toEqual([
      { kind: "external", kg: 22.5, reps: 10, loggedAt: "2026-10-24T09:05:00.000Z" },
      { kind: "external", kg: 20, reps: 9, loggedAt: "2026-10-24T09:08:00.000Z" },
    ]);
  });

  it("refuses an edit that makes a Set invalid, keeping the Set as it was", async () => {
    const { logbook } = setup();
    await logbook.start(at("09:00"));
    const squat = await logbook.addWorkoutExercise(exercise("goblet-squat"));
    await logbook.logSet(squat.id, { kind: "external", kg: 20, reps: 10 }, at("09:05"));

    await expect(logbook.editSet(squat.id, 0, { kind: "external", kg: 20, reps: 0 })).rejects.toThrow(LogbookError);

    expect((await logbook.inProgress())?.workoutExercises[0].sets).toEqual([
      { kind: "external", kg: 20, reps: 10, loggedAt: "2026-10-24T09:05:00.000Z" },
    ]);
  });

  it("saves a deleted Set, and drafts the next Set from the Set now last", async () => {
    const { logbook, storage } = setup();
    await logbook.start(at("09:00"));
    const pushUp = await logbook.addWorkoutExercise(exercise("push-up"));
    await logbook.logSet(pushUp.id, { kind: "bodyweight", reps: 12 }, at("09:05"));
    await logbook.logSet(pushUp.id, { kind: "bodyweight", reps: 120 }, at("09:08"));

    await logbook.deleteSet(pushUp.id, 1);

    const rebuilt = setup(storage).logbook;
    const [workoutExercise] = (await rebuilt.inProgress())?.workoutExercises ?? [];
    expect(workoutExercise.sets).toEqual([{ kind: "bodyweight", reps: 12, loggedAt: "2026-10-24T09:05:00.000Z" }]);
    expect(rebuilt.nextSetDraft(workoutExercise)).toEqual({ kind: "bodyweight", reps: 12 });
  });

  it("saves a removed Workout Exercise, with its Sets", async () => {
    const { logbook, storage } = setup();
    await logbook.start(at("09:00"));
    const squat = await logbook.addWorkoutExercise(exercise("goblet-squat"));
    const plank = await logbook.addWorkoutExercise(exercise("plank"));
    await logbook.logSet(squat.id, { kind: "external", kg: 20, reps: 10 }, at("09:05"));

    await logbook.removeWorkoutExercise(squat.id);

    const rebuilt = setup(storage).logbook;
    expect((await rebuilt.inProgress())?.workoutExercises.map((we) => we.id)).toEqual([plank.id]);
  });

  it("saves a reordered Workout, and uploads it in that order", async () => {
    const { logbook, storage } = setup();
    await logbook.start(at("09:00"));
    const squat = await logbook.addWorkoutExercise(exercise("goblet-squat"));
    const pushUp = await logbook.addWorkoutExercise(exercise("push-up"));
    const plank = await logbook.addWorkoutExercise(exercise("plank"));
    await logbook.logSet(squat.id, { kind: "external", kg: 20, reps: 10 }, at("09:05"));
    await logbook.logSet(pushUp.id, { kind: "bodyweight", reps: 12 }, at("09:10"));
    await logbook.logSet(plank.id, { kind: "timed", seconds: 45 }, at("09:15"));

    await logbook.moveWorkoutExercise(plank.id, 0);

    const rebuilt = setup(storage);
    expect((await rebuilt.logbook.inProgress())?.workoutExercises.map((we) => we.slug)).toEqual([
      "plank",
      "goblet-squat",
      "push-up",
    ]);

    await rebuilt.logbook.moveWorkoutExercise(squat.id, 2);
    await rebuilt.logbook.finish({ startedAt: at("09:00"), endedAt: at("09:30") });
    await rebuilt.logbook.sync();
    expect(rebuilt.uploader.uploaded[0].workoutExercises.map((we) => we.slug)).toEqual([
      "plank",
      "push-up",
      "goblet-squat",
    ]);
  });

  it("refuses to move a Workout Exercise outside the Workout", async () => {
    const { logbook } = setup();
    await logbook.start(at("09:00"));
    const squat = await logbook.addWorkoutExercise(exercise("goblet-squat"));
    await logbook.addWorkoutExercise(exercise("plank"));

    await expect(logbook.moveWorkoutExercise(squat.id, 2)).rejects.toThrow(LogbookError);
    await expect(logbook.moveWorkoutExercise(squat.id, -1)).rejects.toThrow(LogbookError);

    expect((await logbook.inProgress())?.workoutExercises.map((we) => we.slug)).toEqual(["goblet-squat", "plank"]);
  });

  it("discards the in-progress Workout without uploading it, so a new one can start", async () => {
    const { logbook, storage } = setup();
    await logbook.start(at("09:00"));
    const plank = await logbook.addWorkoutExercise(exercise("plank"));
    await logbook.logSet(plank.id, { kind: "timed", seconds: 45 }, at("09:05"));

    await logbook.discard();

    const rebuilt = setup(storage);
    expect(await rebuilt.logbook.inProgress()).toBeNull();
    await rebuilt.logbook.sync();
    expect(rebuilt.uploader.uploaded).toEqual([]);
    await expect(rebuilt.logbook.start(at("10:00"))).resolves.toMatchObject({ startedAt: "2026-10-24T10:00:00.000Z" });
  });
});

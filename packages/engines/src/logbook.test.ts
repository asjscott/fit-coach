import type { BodyProfile, EquipmentProfile, PlannedExercise, PreviousSets, UserProfile, Workout } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { EXERCISES } from "./data/exercises";
import { daysWorkout } from "./days-workout";
import { createLogbook, LogbookError, type DeviceStorage, type PreviousSetsSource } from "./logbook";

const exercise = (slug: string) => {
  const found = EXERCISES.find((e) => e.slug === slug);
  if (!found) throw new Error(`No exercise with slug "${slug}"`);
  return found;
};

function memoryStorage(): DeviceStorage {
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

// The server's answer for each Exercise; Exercises not listed have none
function fakePreviousSets(bySlug: Record<string, PreviousSets> = {}): PreviousSetsSource {
  return { forExercise: async (slug) => bySlug[slug] ?? null };
}

// No signal: every request fails
const offline: PreviousSetsSource = {
  forExercise: async () => {
    throw new Error("Network request failed");
  },
};

function setup(storage = memoryStorage(), previousSets = fakePreviousSets()) {
  const uploader = fakeUploader();
  const logbook = createLogbook({ storage, uploader, previousSets, newId: () => crypto.randomUUID() });
  return { logbook, uploader, storage };
}

const at = (time: string) => new Date(`2026-10-24T${time}:00.000Z`);

// A finished Workout with one plank Set, started at the given time
async function finishPlank(logbook: ReturnType<typeof setup>["logbook"], startedAt: string) {
  await logbook.start(at(startedAt));
  const plank = await logbook.addWorkoutExercise(exercise("plank"));
  await logbook.logSet(plank.id, { kind: "timed", seconds: 60 }, at(startedAt));
  const endedAt = new Date(at(startedAt).getTime() + 600_000);
  const result = await logbook.finish({ startedAt: at(startedAt), endedAt, now: endedAt });
  if (result.status !== "pending") throw new Error("Expected a Pending Workout");
  return result.workout;
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

    await logbook.finish({ startedAt: at("09:00"), endedAt: at("09:30"), now: at("09:30") });
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
        {
          slug: "plank",
          loadType: "timed",
          sets: [{ kind: "timed", seconds: 45, loggedAt: "2026-10-24T09:12:00.000Z" }],
        },
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

    await logbook.finish({ startedAt: at("09:00"), endedAt: at("09:10"), now: at("09:10") });
    await expect(logbook.sync()).rejects.toThrow("No signal");

    expect(await logbook.inProgress()).toBeNull();

    // The app was killed and the signal came back
    const rebuilt = setup(storage);
    await rebuilt.logbook.sync();
    expect(rebuilt.uploader.uploaded).toHaveLength(1);
    expect(rebuilt.uploader.uploaded[0].workoutExercises[0].slug).toBe("plank");
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

  describe("finishing", () => {
    it("drops Workout Exercises with no Sets", async () => {
      const { logbook, uploader } = setup();
      await logbook.start(at("09:00"));
      await logbook.addWorkoutExercise(exercise("push-up"));
      const plank = await logbook.addWorkoutExercise(exercise("plank"));
      await logbook.logSet(plank.id, { kind: "timed", seconds: 60 }, at("09:05"));

      await logbook.finish({ startedAt: at("09:00"), endedAt: at("09:10"), now: at("09:10") });
      await logbook.sync();

      expect(uploader.uploaded[0].workoutExercises.map((we) => we.slug)).toEqual(["plank"]);
    });

    it("reports nothing to save when there are no Sets, and saves nothing", async () => {
      const { logbook, uploader } = setup();
      await logbook.start(at("09:00"));
      await logbook.addWorkoutExercise(exercise("plank"));

      const result = await logbook.finish({ startedAt: at("09:00"), endedAt: at("09:10"), now: at("09:10") });
      await logbook.sync();

      expect(result).toEqual({ status: "nothing-to-save" });
      expect(uploader.uploaded).toEqual([]);
      expect(await logbook.inProgress()).not.toBeNull();
    });

    it("keeps start and end times edited for a backfilled Workout", async () => {
      const { logbook, uploader } = setup();
      await logbook.start(at("09:00"));
      const plank = await logbook.addWorkoutExercise(exercise("plank"));
      await logbook.logSet(plank.id, { kind: "timed", seconds: 60 }, at("09:05"));

      await logbook.finish({
        startedAt: new Date("2026-10-23T18:00:00.000Z"),
        endedAt: new Date("2026-10-23T18:45:00.000Z"),
        now: at("09:10"),
      });
      await logbook.sync();

      expect(uploader.uploaded[0]).toMatchObject({
        startedAt: "2026-10-23T18:00:00.000Z",
        endedAt: "2026-10-23T18:45:00.000Z",
      });
    });

    it.each([
      ["an end before the start", at("09:30"), at("09:00"), "The end must be after the start"],
      ["an end in the future", at("09:00"), at("10:01"), "The end can't be in the future"],
    ])("rejects %s and keeps the Workout in progress", async (_, startedAt, endedAt, message) => {
      const { logbook, uploader } = setup();
      await logbook.start(at("09:00"));
      const plank = await logbook.addWorkoutExercise(exercise("plank"));
      await logbook.logSet(plank.id, { kind: "timed", seconds: 60 }, at("09:05"));

      await expect(logbook.finish({ startedAt, endedAt, now: at("10:00") })).rejects.toThrow(new LogbookError(message));
      await logbook.sync();

      expect(uploader.uploaded).toEqual([]);
      expect(await logbook.inProgress()).not.toBeNull();
    });
  });

  describe("forgotten Workouts", () => {
    const after = (time: string, ms: number) => new Date(at(time).getTime() + ms);

    it("is stale only once more than 3 hours have passed since the last Set", async () => {
      const { logbook } = setup();
      await logbook.start(at("09:00"));
      const squat = await logbook.addWorkoutExercise(exercise("goblet-squat"));
      const plank = await logbook.addWorkoutExercise(exercise("plank"));
      await logbook.logSet(plank.id, { kind: "timed", seconds: 60 }, at("09:20"));
      await logbook.logSet(squat.id, { kind: "external", kg: 20, reps: 10 }, at("09:10"));

      expect(await logbook.isStale(at("12:20"))).toBe(false);
      expect(await logbook.isStale(after("12:20", 1))).toBe(true);
    });

    it("measures from the start when there are no Sets", async () => {
      const { logbook } = setup();
      await logbook.start(at("09:00"));
      await logbook.addWorkoutExercise(exercise("plank"));

      expect(await logbook.isStale(at("12:00"))).toBe(false);
      expect(await logbook.isStale(after("12:00", 1))).toBe(true);
    });

    it("finishes at the last Set, using its time as the end", async () => {
      const { logbook, uploader } = setup();
      await logbook.start(at("09:00"));
      await logbook.addWorkoutExercise(exercise("push-up"));
      const plank = await logbook.addWorkoutExercise(exercise("plank"));
      await logbook.logSet(plank.id, { kind: "timed", seconds: 60 }, at("09:05"));
      await logbook.logSet(plank.id, { kind: "timed", seconds: 45 }, at("09:40"));

      const result = await logbook.finishAtLastSet();
      await logbook.sync();

      expect(result.status).toBe("pending");
      expect(uploader.uploaded[0]).toMatchObject({
        startedAt: "2026-10-24T09:00:00.000Z",
        endedAt: "2026-10-24T09:40:00.000Z",
        workoutExercises: [{ slug: "plank" }],
      });
      expect(await logbook.inProgress()).toBeNull();
    });

    it("has nothing to save when finishing at the last Set of a Workout with no Sets", async () => {
      const { logbook, uploader } = setup();
      await logbook.start(at("09:00"));

      expect(await logbook.finishAtLastSet()).toEqual({ status: "nothing-to-save" });
      await logbook.sync();
      expect(uploader.uploaded).toEqual([]);
    });

    it("is never stale with no Workout in progress", async () => {
      const { logbook } = setup();

      expect(await logbook.isStale(at("23:00"))).toBe(false);
    });
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
    await rebuilt.logbook.finish({ startedAt: at("09:00"), endedAt: at("09:30"), now: at("09:30") });
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

describe("Logbook: signing out", () => {
  it("reports how many Pending Workouts would be lost, counting down as they upload", async () => {
    const { logbook, uploader } = setup();
    const upload = uploader.upload;
    uploader.upload = async () => {
      throw new Error("No signal");
    };
    expect(await logbook.pendingCount()).toBe(0);
    await finishPlank(logbook, "08:00");
    await finishPlank(logbook, "09:00");
    await logbook.start(at("10:00"));
    expect(await logbook.pendingCount()).toBe(2);

    await logbook.sync().catch(() => {});
    expect(await logbook.pendingCount()).toBe(2);

    uploader.upload = upload;
    await logbook.sync();
    expect(await logbook.pendingCount()).toBe(0);
  });

  it("clears the in-progress and Pending Workouts from the phone, so none upload", async () => {
    const { logbook, uploader, storage } = setup();
    uploader.upload = async () => {
      throw new Error("No signal");
    };
    await finishPlank(logbook, "08:00");
    await finishPlank(logbook, "09:00");
    await logbook.start(at("10:00"));
    const plank = await logbook.addWorkoutExercise(exercise("plank"));
    await logbook.logSet(plank.id, { kind: "timed", seconds: 45 }, at("10:05"));

    await logbook.clear();

    const rebuilt = setup(storage);
    expect(await rebuilt.logbook.inProgress()).toBeNull();
    expect(await rebuilt.logbook.pending()).toEqual([]);
    await rebuilt.logbook.sync();
    expect(rebuilt.uploader.uploaded).toEqual([]);
  });
});

describe("Logbook: Previous Sets", () => {
  // Goblet squats the server has from Tuesday
  const fromServer: PreviousSets = {
    startedAt: "2026-10-20T09:00:00.000Z",
    endedAt: "2026-10-20T09:45:00.000Z",
    sets: [
      { kind: "external", kg: 18, reps: 10, loggedAt: "2026-10-20T09:10:00.000Z" },
      { kind: "external", kg: 18, reps: 8, loggedAt: "2026-10-20T09:13:00.000Z" },
    ],
  };

  it("saves the server's Previous Sets with the Workout Exercise", async () => {
    const { logbook } = setup(memoryStorage(), fakePreviousSets({ "goblet-squat": fromServer }));
    await logbook.start(at("09:00"));

    const squat = await logbook.addWorkoutExercise(exercise("goblet-squat"));

    expect(squat.previousSets).toEqual(fromServer);
    expect((await logbook.inProgress())?.workoutExercises[0].previousSets).toEqual(fromServer);
  });

  it("still has the Previous Sets when rebuilt over the same storage", async () => {
    const { logbook, storage } = setup(memoryStorage(), fakePreviousSets({ "goblet-squat": fromServer }));
    await logbook.start(at("09:00"));
    await logbook.addWorkoutExercise(exercise("goblet-squat"));

    const rebuilt = setup(storage, offline).logbook;

    expect((await rebuilt.inProgress())?.workoutExercises[0].previousSets).toEqual(fromServer);
  });

  // Finishes a Workout of goblet squats at 08:00 that stays on the phone: the server can't take it
  async function pendingSquats(storage: DeviceStorage) {
    const { logbook } = setup(storage, offline);
    await logbook.start(at("08:00"));
    const squat = await logbook.addWorkoutExercise(exercise("goblet-squat"));
    await logbook.logSet(squat.id, { kind: "external", kg: 20, reps: 6 }, at("08:10"));
    await logbook.finish({ startedAt: at("08:00"), endedAt: at("08:40"), now: at("08:40") });
  }

  const fromPending: PreviousSets = {
    startedAt: "2026-10-24T08:00:00.000Z",
    endedAt: "2026-10-24T08:40:00.000Z",
    sets: [{ kind: "external", kg: 20, reps: 6, loggedAt: "2026-10-24T08:10:00.000Z" }],
  };

  it("takes a Pending Workout newer than the server's", async () => {
    const storage = memoryStorage();
    await pendingSquats(storage);
    const { logbook } = setup(storage, fakePreviousSets({ "goblet-squat": fromServer }));
    await logbook.start(at("09:00"));

    const squat = await logbook.addWorkoutExercise(exercise("goblet-squat"));

    expect(squat.previousSets).toEqual(fromPending);
  });

  it("takes the server's when it's newer than any Pending Workout", async () => {
    const storage = memoryStorage();
    await pendingSquats(storage);
    const newer = { ...fromServer, startedAt: "2026-10-24T08:30:00.000Z", endedAt: "2026-10-24T08:50:00.000Z" };
    const { logbook } = setup(storage, fakePreviousSets({ "goblet-squat": newer }));
    await logbook.start(at("09:00"));

    const squat = await logbook.addWorkoutExercise(exercise("goblet-squat"));

    expect(squat.previousSets).toEqual(newer);
  });

  it("with no signal, takes them from a Pending Workout", async () => {
    const storage = memoryStorage();
    await pendingSquats(storage);
    const { logbook } = setup(storage, offline);
    await logbook.start(at("09:00"));

    const squat = await logbook.addWorkoutExercise(exercise("goblet-squat"));

    expect(squat.previousSets).toEqual(fromPending);
  });

  it("with no signal and no Pending Workout with the Exercise, adds it with no Previous Sets", async () => {
    const { logbook } = setup(memoryStorage(), offline);
    await logbook.start(at("09:00"));

    const squat = await logbook.addWorkoutExercise(exercise("goblet-squat"));

    expect(squat.previousSets).toBeUndefined();
    expect(await logbook.inProgress()).toMatchObject({ workoutExercises: [{ slug: "goblet-squat" }] });
  });

  it("uploads the finished Workout without Previous Sets", async () => {
    const { logbook, uploader } = setup(memoryStorage(), fakePreviousSets({ "goblet-squat": fromServer }));
    await logbook.start(at("09:00"));
    const squat = await logbook.addWorkoutExercise(exercise("goblet-squat"));
    await logbook.logSet(squat.id, { kind: "external", kg: 20, reps: 10 }, at("09:05"));

    await logbook.finish({ startedAt: at("09:00"), endedAt: at("09:30"), now: at("09:30") });
    await logbook.sync();

    expect(uploader.uploaded[0].workoutExercises).toEqual([
      {
        slug: "goblet-squat",
        loadType: "external",
        sets: [{ kind: "external", kg: 20, reps: 10, loggedAt: "2026-10-24T09:05:00.000Z" }],
      },
    ]);
  });
});

describe("Logbook: Assessment Workouts", () => {
  // Dumbbells only, a pair of each of these
  const dumbbellsOnly: EquipmentProfile = {
    id: "home",
    name: "Home",
    location: "home",
    isPrimary: true,
    tags: ["dumbbells"],
    loads: { dumbbells: { kind: "fixed", weightsKg: [8, 10, 12, 14, 16, 20] } },
  };
  const user = { injuries: [], bodyProfile: { weightKg: 80, gender: "male" } } satisfies Pick<
    UserProfile,
    "injuries"
  > & { bodyProfile: BodyProfile };

  it("adds the tests for A in order, goblet squat first for dumbbells only and the plank last", async () => {
    const { logbook } = setup();

    const workout = await logbook.startAssessment({ part: "A", equipmentProfile: dumbbellsOnly, ...user }, at("09:00"));

    expect(workout.assessment).toBe("A");
    expect(workout.workoutExercises.map((we) => we.slug)).toEqual([
      "goblet-squat",
      "dumbbell-romanian-deadlift",
      "plank",
    ]);
    expect(await logbook.inProgress()).toEqual(workout);
  });

  it("skips tests flagged against the user's injuries, leaving out a Pattern with none safe", async () => {
    const { logbook } = setup();
    const bodyweightOnly: EquipmentProfile = { ...dumbbellsOnly, tags: [], loads: {} };

    // The dumbbell Romanian deadlift is flagged for a lower back injury; every push, push-up included, for a wrist one
    const a = await logbook.startAssessment(
      { part: "A", equipmentProfile: dumbbellsOnly, ...user, injuries: ["lower_back"] },
      at("09:00"),
    );
    await logbook.discard();
    const b = await logbook.startAssessment(
      { part: "B", equipmentProfile: { ...bodyweightOnly, tags: ["table"] }, ...user, injuries: ["wrist"] },
      at("10:00"),
    );

    expect(a.workoutExercises.map((we) => we.slug)).toEqual(["goblet-squat", "single-leg-glute-bridge", "plank"]);
    expect(b.workoutExercises.map((we) => we.slug)).toEqual(["inverted-row"]);
  });

  it("refuses to add, remove or reorder its Exercises", async () => {
    const { logbook } = setup();
    const workout = await logbook.startAssessment({ part: "A", equipmentProfile: dumbbellsOnly, ...user }, at("09:00"));
    const [squat] = workout.workoutExercises;

    await expect(logbook.addWorkoutExercise(exercise("plank"))).rejects.toThrow(LogbookError);
    await expect(logbook.removeWorkoutExercise(squat.id)).rejects.toThrow(LogbookError);
    await expect(logbook.moveWorkoutExercise(squat.id, 1)).rejects.toThrow(LogbookError);
    expect(await logbook.inProgress()).toEqual(workout);
  });

  it("refuses a weighted test Set without an RPE", async () => {
    const { logbook } = setup();
    const workout = await logbook.startAssessment({ part: "A", equipmentProfile: dumbbellsOnly, ...user }, at("09:00"));
    const [squat] = workout.workoutExercises;

    await expect(logbook.logSet(squat.id, { kind: "external", kg: 10, reps: 5 }, at("09:05"))).rejects.toThrow(
      "Rate how hard the Set felt",
    );
    await logbook.logSet(squat.id, { kind: "external", kg: 10, reps: 5, rpe: 7 }, at("09:05"));
    await expect(logbook.editSet(squat.id, 0, { kind: "external", kg: 10, reps: 5 })).rejects.toThrow(LogbookError);
    expect((await logbook.inProgress())?.workoutExercises[0].sets).toEqual([
      { kind: "external", kg: 10, reps: 5, rpe: 7, loggedAt: "2026-10-24T09:05:00.000Z" },
    ]);
  });

  it("suggests each next load from the actual dumbbells until a Set at RPE 9 marks the test done", async () => {
    const { logbook } = setup();
    const workout = await logbook.startAssessment({ part: "A", equipmentProfile: dumbbellsOnly, ...user }, at("09:00"));
    const squatId = workout.workoutExercises[0].id;
    const logAndSuggest = async (kg: number, rpe: number) => {
      const squat = await logbook.logSet(squatId, { kind: "external", kg, reps: 5, rpe }, at("09:05"));
      return logbook.protocolState(workout, squat, dumbbellsOnly);
    };

    // An easy Set jumps further; the suggestion is always a dumbbell the user has
    expect(await logAndSuggest(8, 6)).toEqual({ status: "working-up", suggestedKg: 10 });
    expect(await logAndSuggest(10, 7)).toEqual({ status: "working-up", suggestedKg: 12 });
    expect(await logAndSuggest(12, 8)).toEqual({ status: "working-up", suggestedKg: 14 });
    expect(await logAndSuggest(14, 8)).toEqual({ status: "working-up", suggestedKg: 16 });
    expect(await logAndSuggest(16, 9)).toEqual({ status: "done" });
  });

  it("refuses another Set once a weighted test has its top Set, until that Set is corrected", async () => {
    const { logbook } = setup();
    const workout = await logbook.startAssessment({ part: "A", equipmentProfile: dumbbellsOnly, ...user }, at("09:00"));
    const squatId = workout.workoutExercises[0].id;
    await logbook.logSet(squatId, { kind: "external", kg: 16, reps: 5, rpe: 9 }, at("09:05"));

    await expect(logbook.logSet(squatId, { kind: "external", kg: 20, reps: 5, rpe: 9 }, at("09:06"))).rejects.toThrow(
      "This test is done",
    );
    await logbook.editSet(squatId, 0, { kind: "external", kg: 16, reps: 5, rpe: 8 });
    await logbook.logSet(squatId, { kind: "external", kg: 20, reps: 5, rpe: 9 }, at("09:07"));
    expect((await logbook.inProgress())?.workoutExercises[0].sets).toHaveLength(2);
  });

  it("ends the test as load-limited when the heaviest dumbbell passes 12 reps short of RPE 9", async () => {
    const { logbook } = setup();
    const workout = await logbook.startAssessment({ part: "A", equipmentProfile: dumbbellsOnly, ...user }, at("09:00"));
    const squatId = workout.workoutExercises[0].id;
    const log = async (kg: number, reps: number, rpe: number) =>
      logbook.protocolState(
        workout,
        await logbook.logSet(squatId, { kind: "external", kg, reps, rpe }, at("09:05")),
        dumbbellsOnly,
      );

    // At the heaviest dumbbell it says so, and suggests the same again
    expect(await log(16, 5, 6)).toEqual({ status: "working-up", suggestedKg: 20 });
    expect(await log(20, 5, 6)).toEqual({ status: "at-heaviest", suggestedKg: 20 });
    expect(await log(20, 13, 8)).toEqual({ status: "load-limited" });
  });

  it("reports the next test as the first one without a result, skipping done and load-limited tests", async () => {
    const { logbook } = setup();
    const started = await logbook.startAssessment({ part: "A", equipmentProfile: dumbbellsOnly, ...user }, at("09:00"));
    const [squat, hinge, core] = started.workoutExercises;
    const progress = async () => logbook.testProgress((await logbook.inProgress())!, dumbbellsOnly);

    expect(await progress()).toEqual({ nextTestId: squat.id, allDone: false });
    // The hinge is done out of order; the squat is still next
    await logbook.logSet(hinge.id, { kind: "external", kg: 16, reps: 5, rpe: 9 }, at("09:05"));
    expect(await progress()).toEqual({ nextTestId: squat.id, allDone: false });
    // Past 12 reps at the heaviest dumbbell ends the squat as load-limited
    await logbook.logSet(squat.id, { kind: "external", kg: 20, reps: 13, rpe: 8 }, at("09:10"));
    expect(await progress()).toEqual({ nextTestId: core.id, allDone: false });
    await logbook.logSet(core.id, { kind: "timed", seconds: 60 }, at("09:15"));
    expect(await progress()).toEqual({ nextTestId: undefined, allDone: true });
  });

  it("suggests a heavier dumbbell when a lighter one passes 12 reps short of RPE 9", async () => {
    const { logbook } = setup();
    const workout = await logbook.startAssessment({ part: "A", equipmentProfile: dumbbellsOnly, ...user }, at("09:00"));
    const squat = await logbook.logSet(
      workout.workoutExercises[0].id,
      { kind: "external", kg: 16, reps: 13, rpe: 8 },
      at("09:05"),
    );

    expect(logbook.protocolState(workout, squat, dumbbellsOnly)).toEqual({ status: "working-up", suggestedKg: 20 });
  });

  it("keeps working up when a Set stops at 12 reps or fewer short of RPE 9", async () => {
    const { logbook } = setup();
    const workout = await logbook.startAssessment({ part: "A", equipmentProfile: dumbbellsOnly, ...user }, at("09:00"));
    const squat = await logbook.logSet(
      workout.workoutExercises[0].id,
      { kind: "external", kg: 20, reps: 12, rpe: 8 },
      at("09:05"),
    );

    expect(logbook.protocolState(workout, squat, dumbbellsOnly)).toEqual({ status: "at-heaviest", suggestedKg: 20 });
  });

  it("suggests a conservative first load the dumbbells actually have", async () => {
    const { logbook } = setup();
    const workout = await logbook.startAssessment({ part: "A", equipmentProfile: dumbbellsOnly, ...user }, at("09:00"));
    const [squat, hinge] = workout.workoutExercises.map((we) => logbook.protocolState(workout, we, dumbbellsOnly));

    // An 80 kg man likely has a goblet squat maximum of about 32 kg and a dumbbell Romanian deadlift of about 30 kg
    // per dumbbell
    for (const state of [squat, hinge]) {
      expect(state.status).toBe("working-up");
      const kg = state.status === "working-up" ? state.suggestedKg : null;
      expect([8, 10, 12, 14, 16, 20]).toContain(kg);
      expect(kg).toBeLessThan(25);
    }
  });

  it("suggests a lighter first load for a lighter user", async () => {
    const firstLoad = async (profile: BodyProfile) => {
      const { logbook } = setup();
      const workout = await logbook.startAssessment(
        { part: "A", equipmentProfile: dumbbellsOnly, injuries: [], bodyProfile: profile },
        at("09:00"),
      );
      const state = logbook.protocolState(workout, workout.workoutExercises[0], dumbbellsOnly);
      return state.status === "working-up" ? state.suggestedKg : null;
    };

    expect(await firstLoad({ weightKg: 55, gender: "female" })).toBeLessThan((await firstLoad(user.bodyProfile)) ?? 0);
  });

  it("keeps suggesting from the body weight and gender it started with", async () => {
    const { logbook } = setup();
    await logbook.startAssessment({ part: "A", equipmentProfile: dumbbellsOnly, ...user }, at("09:00"));

    // The screen reads the In-progress Workout back, whatever the profile says by now
    const workout = await logbook.inProgress();
    if (!workout) throw new Error("No In-progress Workout");
    expect(workout.bodyProfile).toEqual({ weightKg: 80, gender: "male" });
    expect(logbook.protocolState(workout, workout.workoutExercises[0], dumbbellsOnly)).toEqual({
      status: "working-up",
      suggestedKg: 16,
    });
  });

  it("starts a barbell test no lighter than the bar", async () => {
    const homeGym: EquipmentProfile = {
      ...dumbbellsOnly,
      tags: ["barbell", "plates", "power_rack", "flat_bench"],
      loads: { barbell: { barKg: 20, platesKg: [5, 10, 20] } },
    };
    const { logbook } = setup();
    const workout = await logbook.startAssessment(
      { part: "B", equipmentProfile: homeGym, injuries: [], bodyProfile: { weightKg: 45, gender: "female" } },
      at("09:00"),
    );

    expect(workout.workoutExercises[0].slug).toBe("barbell-bench-press");
    expect(logbook.protocolState(workout, workout.workoutExercises[0], homeGym)).toEqual({
      status: "working-up",
      suggestedKg: 20,
    });
  });

  it("steps a barbell test through bar-plus-plate-pair loads", async () => {
    const homeGym: EquipmentProfile = {
      ...dumbbellsOnly,
      tags: ["barbell", "plates", "power_rack"],
      loads: { barbell: { barKg: 20, platesKg: [5, 10, 20] } },
    };
    const { logbook } = setup();
    const workout = await logbook.startAssessment({ part: "A", equipmentProfile: homeGym, ...user }, at("09:00"));
    const squat = await logbook.logSet(
      workout.workoutExercises[0].id,
      { kind: "external", kg: 60, reps: 5, rpe: 8 },
      at("09:05"),
    );

    expect(squat.slug).toBe("back-squat");
    // The smallest pair is 2 x 5 kg, so the next load up is 70
    expect(logbook.protocolState(workout, squat, homeGym)).toEqual({ status: "working-up", suggestedKg: 70 });
  });

  it("drafts the next Set without the last Set's RPE, so each Set is rated afresh", async () => {
    const { logbook } = setup();
    const { workoutExercises } = await logbook.startAssessment(
      { part: "A", equipmentProfile: dumbbellsOnly, ...user },
      at("09:00"),
    );
    const squat = await logbook.logSet(
      workoutExercises[0].id,
      { kind: "external", kg: 10, reps: 5, rpe: 7 },
      at("09:05"),
    );

    expect(logbook.nextSetDraft(squat)).toEqual({ kind: "external", kg: 10, reps: 5 });
  });

  it("drafts a weighted test's next Set at the suggested load, for 5 reps", async () => {
    const { logbook } = setup();
    const workout = await logbook.startAssessment({ part: "A", equipmentProfile: dumbbellsOnly, ...user }, at("09:00"));
    const squat = await logbook.logSet(
      workout.workoutExercises[0].id,
      { kind: "external", kg: 10, reps: 6, rpe: 7 },
      at("09:05"),
    );

    const protocol = logbook.protocolState(workout, squat, dumbbellsOnly);
    expect(logbook.nextSetDraft(squat, protocol)).toEqual({ kind: "external", kg: 12, reps: 5 });
  });

  describe("with no equipment", () => {
    const bodyweightOnly: EquipmentProfile = { ...dumbbellsOnly, tags: [], loads: {} };

    it("adds bodyweight tests and the plank", async () => {
      const { logbook } = setup();

      const a = await logbook.startAssessment({ part: "A", equipmentProfile: bodyweightOnly, ...user }, at("09:00"));

      expect(a.workoutExercises.map((we) => we.slug)).toEqual(["bodyweight-squat", "single-leg-glute-bridge", "plank"]);
    });

    it("asks for one Set of as many reps as possible, unrated, and is done after it", async () => {
      const { logbook } = setup();
      const workout = await logbook.startAssessment(
        { part: "B", equipmentProfile: bodyweightOnly, ...user },
        at("09:00"),
      );
      const [pushUp] = workout.workoutExercises;

      expect(pushUp.slug).toBe("push-up");
      expect(logbook.protocolState(workout, pushUp, bodyweightOnly)).toEqual({ status: "one-set" });
      const logged = await logbook.logSet(pushUp.id, { kind: "bodyweight", reps: 18 }, at("09:05"));
      expect(logged.sets).toEqual([{ kind: "bodyweight", reps: 18, loggedAt: "2026-10-24T09:05:00.000Z" }]);
      expect(logbook.protocolState(workout, logged, bodyweightOnly)).toEqual({ status: "done" });
    });

    it("refuses a second Set on a bodyweight test", async () => {
      const { logbook } = setup();
      const workout = await logbook.startAssessment(
        { part: "B", equipmentProfile: bodyweightOnly, ...user },
        at("09:00"),
      );
      const [pushUp] = workout.workoutExercises;
      await logbook.logSet(pushUp.id, { kind: "bodyweight", reps: 18 }, at("09:05"));

      await expect(logbook.logSet(pushUp.id, { kind: "bodyweight", reps: 20 }, at("09:06"))).rejects.toThrow(
        "This test is done",
      );
      expect((await logbook.inProgress())?.workoutExercises[0].sets).toHaveLength(1);
    });

    it("logs the plank's Set in seconds held, unrated", async () => {
      const { logbook } = setup();
      const workout = await logbook.startAssessment(
        { part: "A", equipmentProfile: bodyweightOnly, ...user },
        at("09:00"),
      );
      const plank = workout.workoutExercises[2];

      expect(logbook.protocolState(workout, plank, bodyweightOnly)).toEqual({ status: "one-set" });
      const logged = await logbook.logSet(plank.id, { kind: "timed", seconds: 75 }, at("09:20"));
      expect(logged.sets).toEqual([{ kind: "timed", seconds: 75, loggedAt: "2026-10-24T09:20:00.000Z" }]);
      expect(logbook.protocolState(workout, logged, bodyweightOnly)).toEqual({ status: "done" });
    });
  });

  it("finishes as a Pending Workout carrying which Assessment Workout it is, without untouched tests", async () => {
    const { logbook, uploader } = setup();
    const { workoutExercises } = await logbook.startAssessment(
      { part: "B", equipmentProfile: dumbbellsOnly, ...user },
      at("09:00"),
    );
    await logbook.logSet(workoutExercises[0].id, { kind: "external", kg: 14, reps: 5, rpe: 9 }, at("09:05"));

    const result = await logbook.finish({ startedAt: at("09:00"), endedAt: at("09:30"), now: at("09:30") });
    await logbook.sync();

    expect(result).toMatchObject({ status: "pending", workout: { assessment: "B" } });
    expect(uploader.uploaded[0]).toMatchObject({
      assessment: "B",
      workoutExercises: [{ slug: "dumbbell-floor-press", sets: [{ kg: 14, reps: 5, rpe: 9 }] }],
    });
  });
});

describe("Logbook: Planned Workouts", () => {
  const PLAN_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
  const gobletSquat: PlannedExercise = { slug: "goblet-squat", sets: 3, target: { unit: "kg", kg: 20, reps: 8 } };
  const pushUp: PlannedExercise = { slug: "push-up", sets: 2, target: { unit: "reps", reps: 12 } };
  const plank: PlannedExercise = { slug: "plank", sets: 3, target: { unit: "seconds", seconds: 40 } };
  const plan = (...plannedExercises: PlannedExercise[]) => ({ id: PLAN_ID, plannedExercises });

  it("starts filled with the plan's Exercises in order, each with its target Sets and none logged", async () => {
    const { logbook } = setup();

    const workout = await logbook.startPlannedWorkout(plan(gobletSquat, plank), at("09:00"));

    expect(workout).toMatchObject({
      startedAt: "2026-10-24T09:00:00.000Z",
      plannedWorkoutId: PLAN_ID,
      workoutExercises: [
        { slug: "goblet-squat", loadType: "external", sets: [], planned: { sets: 3, target: gobletSquat.target } },
        { slug: "plank", loadType: "timed", sets: [], planned: { sets: 3, target: plank.target } },
      ],
    });
    expect(await logbook.inProgress()).toEqual(workout);
  });

  it("starts the day's Workout at the chosen Workout Length, linked to the whole plan", async () => {
    const { logbook } = setup();
    // 1500 s at Short: 480 s of goblet squat, 300 s of plank and 360 s of push-up leave 360 s, so 3 overhead press Sets
    const stored = plan(
      { ...gobletSquat, sets: 4 },
      { ...plank, sets: 4 },
      { ...pushUp, sets: 4 },
      { ...pushUp, slug: "dumbbell-overhead-press", sets: 4 },
    );
    const { plannedExercises } = daysWorkout(stored, { workoutLength: "short" });

    const workout = await logbook.startPlannedWorkout({ id: PLAN_ID, plannedExercises }, at("09:00"));

    expect(workout.plannedWorkoutId).toBe(PLAN_ID);
    expect(workout.workoutExercises.map(({ slug, planned }) => [slug, planned?.sets])).toEqual([
      ["goblet-squat", 4],
      ["push-up", 4],
      ["dumbbell-overhead-press", 3],
      ["plank", 4],
    ]);
  });

  it("refuses to start while a Workout is in progress", async () => {
    const { logbook } = setup();
    await logbook.start(at("09:00"));

    await expect(logbook.startPlannedWorkout(plan(gobletSquat), at("09:05"))).rejects.toThrow(LogbookError);
  });

  it("starts with no signal, with Previous Sets from Pending Workouts", async () => {
    const { logbook } = setup(memoryStorage(), offline);
    await finishPlank(logbook, "08:00");

    const workout = await logbook.startPlannedWorkout(plan(plank), at("09:00"));

    expect(workout.workoutExercises[0].previousSets?.sets).toEqual([
      { kind: "timed", seconds: 60, loggedAt: "2026-10-24T08:00:00.000Z" },
    ]);
  });

  it("uploads with its link through added, removed and swapped Exercises", async () => {
    const { logbook, uploader } = setup();
    const { workoutExercises } = await logbook.startPlannedWorkout(plan(gobletSquat, plank), at("09:00"));
    const [squat, plannedPlank] = workoutExercises;

    await logbook.removeWorkoutExercise(plannedPlank.id);
    const swapped = await logbook.addWorkoutExercise(exercise("side-plank"));
    const added = await logbook.addWorkoutExercise(exercise("push-up"));
    await logbook.moveWorkoutExercise(added.id, 0);
    await logbook.logSet(squat.id, { kind: "external", kg: 20, reps: 8 }, at("09:05"));
    await logbook.logSet(swapped.id, { kind: "timed", seconds: 30 }, at("09:10"));
    await logbook.logSet(added.id, { kind: "bodyweight", reps: 10 }, at("09:15"));
    await logbook.finish({ startedAt: at("09:00"), endedAt: at("09:30"), now: at("09:30") });
    await logbook.sync();

    expect(uploader.uploaded).toHaveLength(1);
    expect(uploader.uploaded[0].plannedWorkoutId).toBe(PLAN_ID);
    expect(uploader.uploaded[0].workoutExercises.map(({ slug }) => slug)).toEqual([
      "push-up",
      "goblet-squat",
      "side-plank",
    ]);
  });

  it("keeps its link when a forgotten Workout finishes at its last Set", async () => {
    const { logbook } = setup();
    const { workoutExercises } = await logbook.startPlannedWorkout(plan(gobletSquat), at("09:00"));
    await logbook.logSet(workoutExercises[0].id, { kind: "external", kg: 20, reps: 8 }, at("09:05"));

    await logbook.finishAtLastSet();

    expect((await logbook.pending())[0].plannedWorkoutId).toBe(PLAN_ID);
  });

  it("uploads what was logged, not what was planned", async () => {
    const { logbook, uploader } = setup();
    const { workoutExercises } = await logbook.startPlannedWorkout(plan(gobletSquat, plank), at("09:00"));
    await logbook.logSet(workoutExercises[0].id, { kind: "external", kg: 17.5, reps: 8 }, at("09:05"));

    await logbook.finish({ startedAt: at("09:00"), endedAt: at("09:30"), now: at("09:30") });
    await logbook.sync();

    expect(uploader.uploaded[0].workoutExercises).toEqual([
      {
        slug: "goblet-squat",
        loadType: "external",
        sets: [{ kind: "external", kg: 17.5, reps: 8, loggedAt: "2026-10-24T09:05:00.000Z" }],
      },
    ]);
  });

  it("leaves a Manual Workout with no link", async () => {
    const { logbook, uploader } = setup();
    await finishPlank(logbook, "09:00");
    await logbook.sync();

    expect(uploader.uploaded[0]).not.toHaveProperty("plannedWorkoutId");
  });

  it("logs an Exercise the phone's library doesn't know yet", async () => {
    const { logbook } = setup();
    const unknown: PlannedExercise = { slug: "added-in-a-later-version", sets: 3, target: { unit: "reps", reps: 10 } };

    const { workoutExercises } = await logbook.startPlannedWorkout(plan(unknown), at("09:00"));
    await logbook.logSet(workoutExercises[0].id, { kind: "bodyweight", reps: 10 }, at("09:05"));

    expect(workoutExercises[0].loadType).toBe("bodyweight");
  });

  describe("the first Set's draft", () => {
    const draftFor = async (plannedExercise: PlannedExercise) => {
      const { logbook } = setup();
      const { workoutExercises } = await logbook.startPlannedWorkout(plan(plannedExercise), at("09:00"));
      return logbook.nextSetDraft(workoutExercises[0]);
    };

    it("starts from the target", async () => {
      expect(await draftFor(gobletSquat)).toEqual({ kind: "external", kg: 20, reps: 8 });
      expect(await draftFor(pushUp)).toEqual({ kind: "bodyweight", reps: 12 });
      expect(await draftFor(plank)).toEqual({ kind: "timed", seconds: 40 });
    });

    it("rounds a load to the 0.25 kg steps a Set can log, which a 25 lb dumbbell isn't on", async () => {
      const target = { unit: "kg", kg: 11.34, reps: 8 } as const;
      expect(await draftFor({ ...gobletSquat, target })).toEqual({ kind: "external", kg: 11.25, reps: 8 });
    });

    it("gives a band level no weight to start from, on an Exercise that logs kg", async () => {
      const target = { unit: "band", level: "medium", reps: 12 } as const;
      expect(await draftFor({ slug: "dumbbell-lateral-raise", sets: 3, target })).toBeNull();
    });

    it("gives reps to an Exercise that logs reps, whatever band it's done with", async () => {
      const target = { unit: "band", level: "light", reps: 12 } as const;
      expect(await draftFor({ ...pushUp, target })).toEqual({ kind: "bodyweight", reps: 12 });
    });

    it("follows the last Set once one is logged, so a lighter load carries on", async () => {
      const { logbook } = setup();
      const { workoutExercises } = await logbook.startPlannedWorkout(plan(gobletSquat), at("09:00"));
      const lighter = await logbook.logSet(
        workoutExercises[0].id,
        { kind: "external", kg: 17.5, reps: 8 },
        at("09:05"),
      );

      expect(logbook.nextSetDraft(lighter)).toEqual({ kind: "external", kg: 17.5, reps: 8 });
    });

    it("starts empty on an Exercise added to the Workout", async () => {
      const { logbook } = setup();
      await logbook.startPlannedWorkout(plan(gobletSquat), at("09:00"));
      const added = await logbook.addWorkoutExercise(exercise("push-up"));

      expect(logbook.nextSetDraft(added)).toBeNull();
    });
  });
});

describe("Logbook: the next load for the kg stepper", () => {
  const home: EquipmentProfile = {
    id: "home",
    name: "Home",
    location: "home",
    isPrimary: true,
    tags: ["dumbbells"],
    loads: { dumbbells: { kind: "fixed", weightsKg: [8, 10, 12.5, 16, 20] } },
  };

  it("steps through the dumbbells the primary Equipment Profile has", () => {
    const { logbook } = setup();

    expect(logbook.nextLoadKg("goblet-squat", 12.5, 1, home)).toBe(16);
    expect(logbook.nextLoadKg("goblet-squat", 12.5, -1, home)).toBe(10);
  });

  it("steps through the same dumbbells in an Assessment Workout's test", async () => {
    const { logbook } = setup();
    const workout = await logbook.startAssessment(
      { part: "A", equipmentProfile: home, injuries: [], bodyProfile: { weightKg: 80, gender: "male" } },
      at("09:00"),
    );
    const test = workout.workoutExercises[0].slug;

    expect(test).toBe("goblet-squat");
    expect(logbook.nextLoadKg(test, 10, 1, home)).toBe(12.5);
    expect(logbook.nextLoadKg(test, 10, -1, home)).toBe(8);
  });

  it("steps through bar plus plate pairs", () => {
    const { logbook } = setup();
    const gym: EquipmentProfile = {
      ...home,
      tags: ["barbell", "plates", "squat_rack"],
      loads: { barbell: { barKg: 20, platesKg: [5, 10] } },
    };

    // A pair of 5s, a pair of 10s, then a 10 and a 5 each side
    expect(logbook.nextLoadKg("back-squat", 20, 1, gym)).toBe(30);
    expect(logbook.nextLoadKg("back-squat", 30, 1, gym)).toBe(40);
    expect(logbook.nextLoadKg("back-squat", 50, -1, gym)).toBe(40);
  });

  it("goes from a typed value to the nearest load below or above it", () => {
    const { logbook } = setup();

    expect(logbook.nextLoadKg("goblet-squat", 13.25, 1, home)).toBe(16);
    expect(logbook.nextLoadKg("goblet-squat", 13.25, -1, home)).toBe(12.5);
  });

  it("stays put at the heaviest load and at the lightest", () => {
    const { logbook } = setup();

    expect(logbook.nextLoadKg("goblet-squat", 20, 1, home)).toBe(20);
    expect(logbook.nextLoadKg("goblet-squat", 8, -1, home)).toBe(8);
  });

  it("steps by 2 kg, never below 0, when the primary Equipment Profile has no loads for the Exercise", () => {
    const { logbook } = setup();
    const bodyweightOnly: EquipmentProfile = { ...home, tags: [], loads: {} };

    expect(logbook.nextLoadKg("goblet-squat", 12.5, 1, bodyweightOnly)).toBe(14.5);
    expect(logbook.nextLoadKg("goblet-squat", 12.5, -1, undefined)).toBe(10.5);
    expect(logbook.nextLoadKg("not-in-the-library", 1, -1, home)).toBe(0);
  });
});

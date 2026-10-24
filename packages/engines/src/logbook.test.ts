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

    it("can be discarded instead, saving nothing", async () => {
      const { logbook, uploader } = setup();
      await logbook.start(at("09:00"));
      const plank = await logbook.addWorkoutExercise(exercise("plank"));
      await logbook.logSet(plank.id, { kind: "timed", seconds: 60 }, at("09:05"));

      await logbook.discard();
      await logbook.sync();

      expect(await logbook.inProgress()).toBeNull();
      expect(uploader.uploaded).toEqual([]);
    });

    it("is never stale with no Workout in progress", async () => {
      const { logbook } = setup();

      expect(await logbook.isStale(at("23:00"))).toBe(false);
    });
  });
});

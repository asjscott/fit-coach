import { createLogbook, type DeviceStorage } from "@fit/engines";
import type { Pr } from "@fit/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { celebrationOf, FINISH_WINDOW_MS, finishCelebration } from "./finish-celebration";
import { libraryExercise } from "./library";

const pr: Pr = { slug: "goblet-squat", measure: "e1rm", best: 21.33, previous: 18.67 };

// Settles only when told to, like an upload waiting on Clerk's token with no signal
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

// Finish celebrates a just-finished Workout's PRs in its toast only while the user is still there to see it (#142)
describe("Finish's celebration of a Workout's PRs", () => {
  it("takes the PRs of an upload that finishes while Finish is still waiting", async () => {
    const takePrs = vi.fn(async () => [pr]);
    const { uploaded, prs } = celebrationOf({
      upload: Promise.resolve(true),
      takePrs,
      finishWindow: new AbortController().signal,
    });

    expect(await uploaded).toBe(true);
    expect(await prs).toEqual([pr]);
    expect(takePrs).toHaveBeenCalledOnce();
  });

  it("takes no PRs when the Workout stays Pending", async () => {
    const takePrs = vi.fn(async () => [pr]);
    const { uploaded, prs } = celebrationOf({
      upload: Promise.resolve(false),
      takePrs,
      finishWindow: new AbortController().signal,
    });

    expect(await uploaded).toBe(false);
    expect(await prs).toEqual([]);
    expect(takePrs).not.toHaveBeenCalled();
  });

  // The late upload: saved with no signal, the upload waits, and the user leaves before it gets through. Its PRs
  // must be left unseen for Today's note, not spent on a toast nobody sees
  it("leaves the PRs of a late upload unseen, for Today's note", async () => {
    const takePrs = vi.fn(async () => [pr]);
    const upload = deferred<boolean>();
    const finishWindow = new AbortController();
    const { uploaded, prs } = celebrationOf({ upload: upload.promise, takePrs, finishWindow: finishWindow.signal });

    finishWindow.abort();
    upload.resolve(true);

    expect(await uploaded).toBe(false);
    expect(await prs).toEqual([]);
    expect(takePrs).not.toHaveBeenCalled();
  });

  it("treats a failed upload as Pending", async () => {
    const takePrs = vi.fn(async () => [pr]);
    const { uploaded, prs } = celebrationOf({
      upload: Promise.reject(new Error("offline")),
      takePrs,
      finishWindow: new AbortController().signal,
    });

    expect(await uploaded).toBe(false);
    expect(await prs).toEqual([]);
  });
});

function memoryStorage(): DeviceStorage {
  const items = new Map<string, string>();
  return {
    getItem: async (key) => items.get(key) ?? null,
    setItem: async (key, value) => void items.set(key, value),
    removeItem: async (key) => void items.delete(key),
  };
}

// React Native's AppState, moved between foreground and background by the test
function fakeAppState() {
  const listeners = new Set<(state: string) => void>();
  return {
    addEventListener: (_type: "change", listener: (state: string) => void) => {
      listeners.add(listener);
      return { remove: () => void listeners.delete(listener) };
    },
    goTo: (state: string) => listeners.forEach((listener) => listener(state)),
  };
}

// A Logbook holding a just-finished plank Workout, whose upload reaches the server only when the test says
async function justFinished() {
  const reachesServer = deferred<Pr[]>();
  const logbook = createLogbook({
    storage: memoryStorage(),
    uploader: { upload: () => reachesServer.promise, uploadCheckIn: async () => {} },
    previousSets: { forExercise: async () => null },
    plannedWorkouts: { current: async () => null },
    newId: () => crypto.randomUUID(),
  });
  const startedAt = new Date("2026-11-16T09:00:00.000Z");
  const endedAt = new Date("2026-11-16T09:10:00.000Z");
  await logbook.start(startedAt);
  const plank = await logbook.addWorkoutExercise(libraryExercise("plank")!);
  await logbook.logSet(plank.id, { kind: "timed", seconds: 60 }, startedAt);
  const result = await logbook.finish({ startedAt, endedAt, now: endedAt });
  if (result.status !== "pending") throw new Error("Expected a Pending Workout");
  const syncing = logbook.sync();
  return { logbook, workoutId: result.workout.id, syncing, reachesServer };
}

// The Finish window over a real Logbook: Today's note reads the Logbook's unseenPrs (#142)
describe("the Finish window on a just-finished Workout's upload", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] }));
  afterEach(() => vi.useRealTimers());

  it("celebrates the PRs of an upload inside the window, leaving none unseen for Today", async () => {
    const { logbook, workoutId, syncing, reachesServer } = await justFinished();
    const { uploaded, prs } = finishCelebration({ logbook, workoutId, syncing, appState: fakeAppState() });

    reachesServer.resolve([pr]);

    expect(await uploaded).toBe(true);
    expect(await prs).toEqual([pr]);
    expect(await logbook.unseenPrs()).toEqual([]);
  });

  it("leaves the PRs of an upload that lands after the window's time is up unseen, for Today's note", async () => {
    const { logbook, workoutId, syncing, reachesServer } = await justFinished();
    const { uploaded, prs } = finishCelebration({ logbook, workoutId, syncing, appState: fakeAppState() });

    vi.advanceTimersByTime(FINISH_WINDOW_MS);
    reachesServer.resolve([pr]);
    await syncing;

    expect(await uploaded).toBe(false);
    expect(await prs).toEqual([]);
    expect(await logbook.unseenPrs()).toEqual([expect.objectContaining({ workoutId, prs: [pr] })]);
  });

  it("leaves the PRs unseen when the app leaves the foreground before the upload lands", async () => {
    const { logbook, workoutId, syncing, reachesServer } = await justFinished();
    const appState = fakeAppState();
    const { uploaded, prs } = finishCelebration({ logbook, workoutId, syncing, appState });

    appState.goTo("background");
    reachesServer.resolve([pr]);
    await syncing;

    expect(await uploaded).toBe(false);
    expect(await prs).toEqual([]);
    expect(await logbook.unseenPrs()).toEqual([expect.objectContaining({ workoutId, prs: [pr] })]);
  });
});

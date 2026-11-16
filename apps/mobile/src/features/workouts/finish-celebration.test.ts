import type { Pr } from "@fit/shared";
import { describe, expect, it, vi } from "vitest";
import { celebrationOf } from "./finish-celebration";

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

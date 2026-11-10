import { describe, expect, it, vi } from "vitest";
import { untilAborted, withinMs } from "./until-aborted";

const never = new Promise<string>(() => {});

describe("untilAborted", () => {
  it("gives up on a promise that never settles once the signal aborts", async () => {
    const controller = new AbortController();
    const waiting = untilAborted(never, controller.signal);
    controller.abort(new Error("timed out"));
    await expect(waiting).rejects.toThrow("timed out");
  });

  it("gives up at once on a signal that has already aborted", async () => {
    const controller = new AbortController();
    controller.abort(new Error("timed out"));
    await expect(untilAborted(never, controller.signal)).rejects.toThrow("timed out");
  });

  it("passes on the value when it comes first", async () => {
    const controller = new AbortController();
    await expect(untilAborted(Promise.resolve("token"), controller.signal)).resolves.toBe("token");
  });

  it("passes on the error when it comes first", async () => {
    const controller = new AbortController();
    await expect(untilAborted(Promise.reject(new Error("offline")), controller.signal)).rejects.toThrow("offline");
  });

  it("waits as long as it takes with no signal", async () => {
    await expect(untilAborted(Promise.resolve("token"))).resolves.toBe("token");
  });
});

describe("withinMs", () => {
  it("gives up on a promise that never settles", async () => {
    vi.useFakeTimers();
    try {
      const waiting = withinMs(never, 10_000);
      vi.advanceTimersByTime(10_000);
      await expect(waiting).rejects.toThrow("Gave up after 10000 ms");
    } finally {
      vi.useRealTimers();
    }
  });

  it("passes on the value when it comes in time", async () => {
    await expect(withinMs(Promise.resolve("token"), 10_000)).resolves.toBe("token");
  });
});

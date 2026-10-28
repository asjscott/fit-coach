import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startRepeating } from "./hold-to-repeat";

describe("startRepeating", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("steps at once, keeps stepping while held, and stops on release", () => {
    const step = vi.fn();
    const stop = startRepeating(step);
    expect(step).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);
    const held = step.mock.calls.length;
    expect(held).toBeGreaterThan(2);

    stop();
    vi.advanceTimersByTime(5000);
    expect(step).toHaveBeenCalledTimes(held);
  });

  it("waits 200 ms for the second step, then each wait is a fifth shorter", () => {
    const step = vi.fn();
    startRepeating(step);
    const stepsAt = (ms: number) => {
      vi.advanceTimersByTime(ms);
      return step.mock.calls.length;
    };
    expect(stepsAt(199)).toBe(1);
    expect(stepsAt(1)).toBe(2); // 200 ms
    expect(stepsAt(159)).toBe(2);
    expect(stepsAt(1)).toBe(3); // 360 ms
    expect(stepsAt(127)).toBe(3);
    expect(stepsAt(1)).toBe(4); // 488 ms
  });

  it("speeds up to 20 steps a second and stays there", () => {
    const step = vi.fn();
    startRepeating(step);
    vi.advanceTimersByTime(5000);
    const before = step.mock.calls.length;
    vi.advanceTimersByTime(1000);
    expect(step.mock.calls.length - before).toBe(20);
  });
});

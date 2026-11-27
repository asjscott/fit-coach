import { describe, expect, it, vi } from "vitest";
import { onComingToFront } from "./coming-to-front";
import type { AppStateEvents } from "./finish-celebration";

// React Native's AppState, told by the test when the app changes state
function fakeAppState() {
  const listeners = new Set<(state: string) => void>();
  const appState: AppStateEvents = {
    addEventListener: (_type, listener) => {
      listeners.add(listener);
      return { remove: () => listeners.delete(listener) };
    },
  };
  return { appState, change: (state: string) => listeners.forEach((listener) => listener(state)) };
}

// Today and the other screens reload what they show from the server when the app comes back to the front, so a server
// that answers again shows without a restart or a tab switch (NA1, #170, #174)
describe("Coming back to the front", () => {
  it("reloads when the app comes back to the front", () => {
    const { appState, change } = fakeAppState();
    const reload = vi.fn();
    onComingToFront(appState, reload);

    change("background");
    change("active");

    expect(reload).toHaveBeenCalledOnce();
  });

  it("doesn't reload on leaving the front", () => {
    const { appState, change } = fakeAppState();
    const reload = vi.fn();
    onComingToFront(appState, reload);

    change("inactive");
    change("background");

    expect(reload).not.toHaveBeenCalled();
  });

  it("stops reloading once stopped, as when the screen is no longer in front", () => {
    const { appState, change } = fakeAppState();
    const reload = vi.fn();
    const stop = onComingToFront(appState, reload);

    stop();
    change("active");

    expect(reload).not.toHaveBeenCalled();
  });
});

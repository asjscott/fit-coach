import type { AppStateEvents } from "./finish-celebration";

// Runs `run` each time the app comes back to the front, until the returned stop is called
export function onComingToFront(appState: AppStateEvents, run: () => void): () => void {
  const listening = appState.addEventListener("change", (state) => {
    if (state === "active") run();
  });
  return () => listening.remove();
}

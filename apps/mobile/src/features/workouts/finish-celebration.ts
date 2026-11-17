import type { Logbook } from "@fit/engines";
import type { Pr } from "@fit/shared";
import { untilAborted } from "../../api/until-aborted";

// How long after Save workout Finish waits on the upload for its toast. An online upload is done well within it
export const FINISH_WINDOW_MS = 10_000;

// A just-finished Workout's upload as Finish's toast sees it. Finish celebrates the PRs only of an upload that gets
// through within finishWindow, which ends when the user can no longer be looking (the time is up, or the app has left
// the foreground). An upload after that is a late upload, whose PRs stay unseen for Today's note (#142).
// upload: whether the Workout left the phone. takePrs: its PRs, marked seen. uploaded is false for a late upload
export function celebrationOf({
  upload,
  takePrs,
  finishWindow,
}: {
  upload: Promise<boolean>;
  takePrs: () => Promise<Pr[]>;
  finishWindow: AbortSignal;
}): { uploaded: Promise<boolean>; prs: Promise<Pr[]> } {
  const uploaded = untilAborted(upload, finishWindow).catch(() => false);
  const prs = uploaded.then((ok) => (ok ? takePrs() : []));
  return { uploaded, prs };
}

// Where the Finish window hears the app leave the foreground: React Native's AppState
export type AppStateEvents = {
  addEventListener: (type: "change", listener: (state: string) => void) => { remove: () => void };
};

// Finish's celebration of the Workout it just saved, over the Finish window: FINISH_WINDOW_MS from Save workout, or
// until the app leaves the foreground. syncing is the upload started for it; the PRs are taken from the Logbook only
// if this Workout left the phone inside the window, else they stay in its unseenPrs for Today's note (#142)
export function finishCelebration({
  logbook,
  workoutId,
  syncing,
  appState,
}: {
  logbook: Pick<Logbook, "pending" | "unseenPrs" | "markPrsSeen">;
  workoutId: string;
  syncing: Promise<unknown>;
  appState: AppStateEvents;
}): { uploaded: Promise<boolean>; prs: Promise<Pr[]> } {
  const finishWindow = new AbortController();
  const timer = setTimeout(() => finishWindow.abort(), FINISH_WINDOW_MS);
  const away = appState.addEventListener("change", (state) => {
    if (state !== "active") finishWindow.abort();
  });
  const celebration = celebrationOf({
    upload: syncing.then(async () => !(await logbook.pending()).some((p) => p.id === workoutId)),
    takePrs: async () => {
      const found = (await logbook.unseenPrs()).find((unseen) => unseen.workoutId === workoutId)?.prs ?? [];
      await logbook.markPrsSeen([workoutId]);
      return found;
    },
    finishWindow: finishWindow.signal,
  });
  celebration.uploaded.then(() => {
    clearTimeout(timer);
    away.remove();
  });
  return celebration;
}

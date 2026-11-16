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

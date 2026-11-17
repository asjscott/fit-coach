import type { UnseenPrs } from "@fit/engines";
import { useCallback, useEffect, useState } from "react";
import { useLogbook } from "@/features/workouts/logbook-provider";

// PRs from a late upload (#130), shown once on Today: they're marked seen as soon as they're shown, and stay on screen
// until dismissed or the app restarts. After that they're only in History
export function usePrNote() {
  const { unseenPrs, markPrsSeen } = useLogbook();
  const [shown, setShown] = useState<UnseenPrs[]>([]);

  useEffect(() => {
    if (!unseenPrs.length) return;
    setShown((current) => [
      ...current,
      ...unseenPrs.filter((unseen) => !current.some((s) => s.workoutId === unseen.workoutId)),
    ]);
    markPrsSeen(unseenPrs.map((unseen) => unseen.workoutId)).catch(() => {});
  }, [unseenPrs, markPrsSeen]);

  const dismiss = useCallback(() => setShown([]), []);
  return { shown, dismiss };
}

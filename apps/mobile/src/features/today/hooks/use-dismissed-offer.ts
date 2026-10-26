import { useCallback, useEffect, useState } from "react";
import { deviceStorage } from "@/features/workouts/device-storage";

const KEY = "today.dismissedAssessmentOffer";

// The key of the Assessment offer the user dismissed on Today, kept on the phone: undefined until it's read, null when
// none. Dismissing remembers only the latest, since a new offer replaces the old one
export function useDismissedOffer() {
  const [dismissed, setDismissed] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    deviceStorage.getItem(KEY).then(setDismissed, () => setDismissed(null));
  }, []);

  const dismiss = useCallback((key: string) => {
    setDismissed(key);
    deviceStorage.setItem(KEY, key).catch(() => {});
  }, []);

  return { dismissed, dismiss };
}

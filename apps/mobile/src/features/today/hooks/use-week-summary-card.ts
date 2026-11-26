import { WeekSummary } from "@fit/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useApi } from "@/api";
import { useCurrentUser, useTimeZone } from "@/features/user/current-user-provider";
import { weekSummaryToAsk } from "../week-summary-card";

// The Week Summary card on Today (spec #206 stories 35 to 40): the week just ended, shown once across both phones.
// Each time the app comes to the front, from 6 pm on Sunday on, Today asks for the latest until it knows it's been
// seen. An unseen one shows for the rest of that visit, until the app goes to the background, and is marked seen
// once it's on screen. Offline the ask fails, so nothing shows and nothing is sent, and the week stays unseen
export function useWeekSummaryCard(): WeekSummary | null {
  const api = useApi();
  const { user } = useCurrentUser();
  const timeZone = useTimeZone();
  const onboardedAt = user?.onboardedAt;
  const [shown, setShown] = useState<WeekSummary | null>(null);
  // The latest week this phone knows has been seen. In memory only, so a cold start asks once more
  const seenMonday = useRef<string | null>(null);
  const asking = useRef(false);

  const ask = useCallback(async () => {
    if (!onboardedAt || asking.current) return;
    if (!weekSummaryToAsk({ now: new Date(), timeZone, onboardedAt, seenMonday: seenMonday.current })) return;
    asking.current = true;
    try {
      const latest = WeekSummary.parse(await api("/week-summaries/latest"));
      if (latest.seen) seenMonday.current = latest.monday;
      else setShown(latest);
    } catch {
      // Offline, or no Week Summary yet: nothing to show
    } finally {
      asking.current = false;
    }
  }, [api, onboardedAt, timeZone]);

  // On opening, and each time the app comes back to the front. Going to the background ends the visit
  useEffect(() => {
    void ask();
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") void ask();
      if (state === "background") setShown(null);
    });
    return () => appState.remove();
  }, [ask]);

  // Shown, so seen, on this phone and the other. A PUT that fails leaves it unseen, to show again next time
  useEffect(() => {
    if (!shown) return;
    const { monday } = shown;
    api(`/week-summaries/${monday}/seen`, { method: "PUT" }).then(
      () => {
        seenMonday.current = monday;
      },
      () => {},
    );
  }, [api, shown]);

  return shown;
}

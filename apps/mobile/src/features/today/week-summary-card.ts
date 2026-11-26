import { latestWeekSummaryMonday, mondayOf, RANGE_STATE_WORDS } from "@fit/engines";
import type { WeekAverage, WeekSummary } from "@fit/shared";
import { wholeNumber } from "../nutrition/format";
import { RANGE_STATE_TONES } from "./week-summary-screen";

// The Monday of the week whose Week Summary Today should ask for, or null. It's the week just ended (from 6 pm on its
// Sunday, in the user's timezone) until the phone knows it's been seen, here or on the other phone. A week before the
// user onboarded has none
export function weekSummaryToAsk({
  now,
  timeZone,
  onboardedAt,
  seenMonday,
}: {
  now: Date;
  timeZone: string;
  onboardedAt: string;
  // The latest week this phone knows has been seen, or null
  seenMonday: string | null;
}): string | null {
  const latest = latestWeekSummaryMonday(now, timeZone);
  if (latest < mondayOf(new Date(onboardedAt), timeZone)) return null;
  if (seenMonday && seenMonday >= latest) return null;
  return latest;
}

// The Monday of the week "Last week" in This week opens, or null: the latest Week Summary's, which moves on to the week
// ending at 6 pm on Sunday, so that week stays a tap away once its card has gone. The week the user onboarded has none
// before its own is due
export function lastWeekLink({ now, timeZone, onboardedAt }: { now: Date; timeZone: string; onboardedAt: string }) {
  const latest = latestWeekSummaryMonday(now, timeZone);
  if (latest < mondayOf(new Date(onboardedAt), timeZone)) return null;
  return latest;
}

export type WeekSummaryBar = {
  label: string;
  value: string;
  // How full the bar is, 0 to 1
  fill: number;
  tone: "success" | "accent" | "warning" | "danger";
};

const share = (done: number, of: number) => (of > 0 ? Math.min(done, of) / of : 0);

function averageBar(label: string, average: WeekAverage, unit: string): WeekSummaryBar {
  return {
    label,
    value: `${wholeNumber(average.average)}${unit} avg · ${RANGE_STATE_WORDS[average.state]}`,
    fill: share(average.average, average.min),
    tone: RANGE_STATE_TONES[average.state],
  };
}

// The Week Summary card's bars (prototype variant C), in order: Workouts done against planned, average kcal and
// protein against their ranges, and the Weekly Budget met. A part the week has no data for has no bar
export function weekSummaryBars({ workouts, kcal, protein, weeklyBudget, deload }: WeekSummary): WeekSummaryBar[] {
  const bars: WeekSummaryBar[] = [
    {
      label: "Workouts",
      value: `${workouts.done} of ${workouts.planned}`,
      fill: share(workouts.done, workouts.planned),
      tone: workouts.done >= workouts.planned ? "success" : "accent",
    },
  ];
  if (kcal) bars.push(averageBar("Calories", kcal, ""));
  if (protein) bars.push(averageBar("Protein", protein, " g"));
  // A deload week is lighter on purpose, so it isn't measured against the budget
  if (weeklyBudget && deload) {
    bars.push({ label: "Weekly Budget", value: "Deload: lighter on purpose", fill: 1, tone: "success" });
  } else if (weeklyBudget) {
    const { met, muscles } = weeklyBudget;
    bars.push({
      label: "Weekly Budget",
      value: `${met} of ${muscles} Muscles met`,
      fill: share(met, muscles),
      tone: "accent",
    });
  }
  return bars;
}

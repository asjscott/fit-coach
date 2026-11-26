import { weekDates } from "@fit/engines";
import { inUnitToStep, type WeekAverage, type WeekSummary, type WeightUnit } from "@fit/shared";
import { muscleLabel } from "../exercises/labels";
import { wholeNumber } from "../nutrition/format";
import { prLabel, setTargetLabel } from "../workouts/format";
import { exerciseName } from "../workouts/library";

// The Week Summary screen's parts (prototype variant B, "Scorecard"). A part the week has no data for is left out

export type Tone = "text" | "success" | "accent" | "warning" | "danger";

export type WeekSummaryTile = { big: string; label: string; tone: Tone };

const STATE_WORDS: Record<WeekAverage["state"], string> = { below: "under", in: "in range", over: "over" };
const STATE_TONES: Record<WeekAverage["state"], Tone> = { below: "warning", in: "success", over: "danger" };

// A signed number to a tenth, with a real minus: "−0.4", "+2"
const signed = (value: number) => `${value < 0 ? "−" : value > 0 ? "+" : ""}${Math.abs(value).toLocaleString()}`;

function readinessLabel({ average, previous }: NonNullable<WeekSummary["readiness"]>) {
  if (previous === undefined) return "Readiness";
  const change = Math.round((average - previous) * 10) / 10;
  if (!change) return "Readiness · same as the week before";
  return `Readiness · ${change > 0 ? "↑" : "↓"} ${Math.abs(change).toLocaleString()}`;
}

// The tiles, in order: Workouts, the Weekly Streak, kcal and protein a day, the Weigh-in change and Readiness
export function weekSummaryTiles(summary: WeekSummary, unit: WeightUnit): WeekSummaryTile[] {
  const { workouts, streak, kcal, protein, weighIn, readiness } = summary;
  const tiles: WeekSummaryTile[] = [
    {
      big: `${workouts.done}/${workouts.planned}`,
      label: "Workouts",
      tone: workouts.done >= workouts.planned ? "success" : "accent",
    },
  ];
  if (streak) tiles.push({ big: `🔥 ${streak}`, label: "Week streak", tone: "text" });
  if (kcal) {
    tiles.push({
      big: wholeNumber(kcal.average),
      label: `kcal a day · ${STATE_WORDS[kcal.state]}`,
      tone: STATE_TONES[kcal.state],
    });
  }
  if (protein) {
    tiles.push({
      big: `${wholeNumber(protein.average)} g`,
      label: `protein a day · ${STATE_WORDS[protein.state]}`,
      tone: STATE_TONES[protein.state],
    });
  }
  if (weighIn) {
    const change = inUnitToStep(weighIn.changeKg, unit, 0.1);
    tiles.push({ big: `${signed(change)} ${unit}`, label: "since last Weigh-in", tone: "text" });
  }
  if (readiness) {
    tiles.push({ big: readiness.average.toLocaleString(), label: readinessLabel(readiness), tone: "text" });
  }
  return tiles;
}

// The Weekly Budget's card: how many Muscles met it and the ones short, or on a deload week that it's lighter on
// purpose. Null with no Workouts
export function budgetPart({ weeklyBudget, deload }: WeekSummary): { title: string; short: string[] } | null {
  if (!weeklyBudget) return null;
  if (deload) return { title: "Deload: lighter on purpose", short: [] };
  const { met, muscles, short } = weeklyBudget;
  return {
    title: `Weekly Budget · ${met} of ${muscles} met`,
    short: short.map(({ muscle, sets, budget }) => `${muscleLabel(muscle)} ${sets.toLocaleString()}/${budget}`),
  };
}

// A PR reads as its name over what it beat; a move as the Exercise beside its new level
export type ProgressRow = { kind: "pr" | "move"; left: string; right: string; tone: Tone };

// The week's PRs, then the Exercises whose Working Level moved, with the level now. A level moves down only after a
// second Miss in a row
export function progressRows({ prs = [], moves = [] }: WeekSummary, unit: WeightUnit): ProgressRow[] {
  return [
    ...prs.map((pr): ProgressRow => ({
      kind: "pr",
      left: `⭐ PR · ${exerciseName(pr.slug)}`,
      right: prLabel(pr, unit),
      tone: "text",
    })),
    ...moves.map(({ slug, direction, level }): ProgressRow => {
      const to = setTargetLabel(level, unit);
      return direction === "up"
        ? { kind: "move", left: exerciseName(slug), right: `↑ ${to}`, tone: "success" }
        : { kind: "move", left: exerciseName(slug), right: `↓ back to ${to}, missed twice`, tone: "warning" };
    }),
  ];
}

export type DayBar = {
  day: string;
  date: string;
  // Null for a day with no food logged
  kcal: number | null;
  tone: Tone | null;
  // Against the week's highest day, 0 to 1
  fill: number;
};

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_TONES: Record<WeekAverage["state"], Tone> = { below: "accent", in: "success", over: "danger" };

// A bar for each day of the week, Monday to Sunday, coloured by its kcal against its range. Empty with no food logged
export function dayBars({ monday, kcal }: WeekSummary): DayBar[] {
  if (!kcal?.days.length) return [];
  const highest = Math.max(...kcal.days.map((day) => day.kcal), 1);
  return weekDates(monday).map((date, i) => {
    const logged = kcal.days.find((day) => day.date === date);
    return {
      day: DAY_LETTERS[i],
      date,
      kcal: logged?.kcal ?? null,
      tone: logged ? DAY_TONES[logged.state] : null,
      fill: logged ? logged.kcal / highest : 0,
    };
  });
}

import { type HistoryDay, historyDays, type NutritionMeasure, rangeBand, weekAverage } from "@fit/engines";
import type { NutritionWeek } from "@fit/shared";
import { weekdayLabel, weekLabel } from "../workouts/format";
import { wholeNumber } from "./format";
import { onPhone } from "./weigh-in";

const UNITS: Record<NutritionMeasure, string> = { kcal: "kcal", protein: "g protein" };
// As the day's ring would be, its red second lap being red here
const COLORS = { below: "accent", in: "success", over: "danger" } as const;
const AXIS_STEPS = [1, 2, 2.5, 5, 10];
// The most steps from 0 to the top of the axis
const MAX_STEPS = 4;
// How near the average's number, as a share of the chart, an axis number would be drawn over
const TOO_NEAR = 0.16;

export type HistoryBar = {
  date: string;
  // Null for an empty slot
  color: "accent" | "success" | "danger" | null;
  // 0 to 1 of the axis, as every place on the chart is
  height: number;
  isToday: boolean;
  // "Tuesday", or "Today"
  title: string;
  // "2,406 kcal"
  amount: string;
  // "114 below its range of 2,520 to 2,780"
  detail: string;
  // The whole day in words, for screen readers
  label: string;
};

function barOf(day: HistoryDay, measure: NutritionMeasure, top: number): HistoryBar {
  const { date, when, range } = day;
  const isToday = when === "today";
  const title = isToday ? "Today" : weekdayLabel(onPhone(date));
  const bounds = `${wholeNumber(range.min)} to ${wholeNumber(range.max)}`;
  if (!day.logged) {
    const amount = when === "toCome" ? "Still to come" : isToday ? "Nothing logged yet" : "Nothing logged";
    const label = `${title}: ${amount[0].toLowerCase()}${amount.slice(1)}`;
    return { date, color: null, height: 0, isToday, title, amount, detail: `Its range is ${bounds}`, label };
  }
  const amount = `${wholeNumber(day.amount)} ${UNITS[measure]}${isToday ? " so far" : ""}`;
  const state = day.state === "in" ? "in" : `${wholeNumber(day.by)} ${day.state}`;
  const detail = `${state} its range of ${bounds}`;
  return {
    date,
    color: COLORS[day.state],
    height: day.amount / top,
    isToday,
    title,
    amount,
    detail,
    label: `${title}: ${amount}, ${detail}`,
  };
}

// The round step that takes at most MAX_STEPS of it to get from 0 to the largest amount
function axisStep(largest: number): number {
  const power = 10 ** Math.floor(Math.log10(Math.max(largest, 1) / MAX_STEPS));
  return power * (AXIS_STEPS.find((step) => step * power * MAX_STEPS >= largest) ?? 10);
}

// Where Nutrition History's chart draws everything for a week, as shares of its width and height, with its words
// (spec #188 stories 20 to 29)
export function historyChart(week: NutritionWeek, measure: NutritionMeasure) {
  const days = historyDays(week, measure);
  const largest = Math.max(...days.map((day) => Math.max(day.range.max, day.logged ? day.amount : 0)));
  const step = axisStep(largest);
  const steps = Math.max(1, Math.ceil(largest / step));
  const top = steps * step;
  const mean = weekAverage(days);
  const number = mean === null ? "" : wholeNumber(mean);

  return {
    bars: days.map((day) => barOf(day, measure, top)),
    band: rangeBand(days).map(({ from, days: count, range }) => ({
      left: from / days.length,
      width: count / days.length,
      bottom: range.min / top,
      height: (range.max - range.min) / top,
    })),
    ticks: Array.from({ length: steps + 1 }, (_, i) => ({
      at: i / steps,
      label: mean !== null && Math.abs(mean / top - i / steps) < TOO_NEAR ? "" : wholeNumber(i * step),
    })),
    average: mean === null ? null : { at: mean / top, number, label: `Daily average ${number} ${UNITS[measure]}` },
    nothingToAverage: days.some((day) => day.when !== "past") ? "No days to average yet" : "No days to average",
  };
}

// "This week", "Last week", then the week's dates, as in History
export const historyWeekLabel = ({ days, today }: NutritionWeek) => weekLabel(onPhone(days[0].date), onPhone(today));

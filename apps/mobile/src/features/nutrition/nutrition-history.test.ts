import type { NutritionWeek } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { nutritionHistoryChart, nutritionHistoryWeekLabel } from "./nutrition-history";

// Ranges of 2,520 to 2,780 kcal and 144 to 192 g of protein
const targets = { kcal: 2650, proteinG: 160 };

// Monday 16 to Sunday 22 November 2026: a [kcal, protein] for each day logged, null for one that isn't
const week = (logged: ([number, number] | null)[], today = "2026-11-25"): NutritionWeek => ({
  today,
  firstLoggedDate: "2026-11-16",
  days: Array.from({ length: 7 }, (_, i) => ({
    date: `2026-11-${16 + i}`,
    totals: { kcal: logged[i]?.[0] ?? 0, proteinG: logged[i]?.[1] ?? 0 },
    targets,
    logged: !!logged[i],
  })),
});

const labels = (w: NutritionWeek, measure: "kcal" | "protein") =>
  nutritionHistoryChart(w, measure).bars.map((bar) => bar.label);

describe("nutritionHistoryChart bars", () => {
  // Spec #188 story 24: the ring's colours, red when the ring would have its red lap
  it("take the colour of their ring", () => {
    const { bars } = nutritionHistoryChart(week([[2519, 0], [2520, 0], [2780, 0], [2781, 0], null]), "kcal");

    expect(bars.map((bar) => bar.color)).toEqual(["accent", "success", "success", "danger", null, null, null]);
  });

  it("are as tall as their amount, on an axis from 0 that fits the tallest", () => {
    const { bars, ticks } = nutritionHistoryChart(week([[1500, 0], [3000, 0], [0, 0], null]), "kcal");

    expect(ticks.map((tick) => tick.label)).toEqual(["0", "1,000", "2,000", "3,000"]);
    expect(bars.map((bar) => bar.height)).toEqual([0.5, 1, 0, 0, 0, 0, 0]);
  });

  it("fit a week far over its range", () => {
    const { bars, ticks } = nutritionHistoryChart(week([[8100, 0]]), "kcal");

    expect(ticks.at(-1)).toEqual({ label: "10,000", at: 1 });
    expect(bars[0].height).toBeCloseTo(0.81);
  });

  // Story 24 and 26: the state in words
  it("say the day, its amount and its state against its range", () => {
    expect(
      labels(
        week([
          [2000, 100],
          [2406, 150.4],
          [2650, 192],
          [3030, 200],
        ]),
        "kcal",
      ).slice(0, 4),
    ).toEqual([
      "Monday: 2,000 kcal, 520 below its range of 2,520 to 2,780",
      "Tuesday: 2,406 kcal, 114 below its range of 2,520 to 2,780",
      "Wednesday: 2,650 kcal, in its range of 2,520 to 2,780",
      "Thursday: 3,030 kcal, 250 over its range of 2,520 to 2,780",
    ]);
    expect(
      labels(
        week([
          [2000, 100],
          [2406, 150.4],
          [2650, 192],
          [3030, 200],
        ]),
        "protein",
      ).slice(0, 4),
    ).toEqual([
      "Monday: 100 g protein, 44 below its range of 144 to 192",
      "Tuesday: 150 g protein, in its range of 144 to 192",
      "Wednesday: 192 g protein, in its range of 144 to 192",
      "Thursday: 200 g protein, 8 over its range of 144 to 192",
    ]);
  });

  it("say what isn't logged, today so far, and the days to come", () => {
    expect(labels(week([null, [2000, 100]], "2026-11-17"), "kcal").slice(0, 3)).toEqual([
      "Monday: nothing logged",
      "Today: 2,000 kcal so far, 520 below its range of 2,520 to 2,780",
      "Wednesday: still to come",
    ]);
    expect(labels(week([], "2026-11-17"), "kcal")[1]).toBe("Today: nothing logged yet");
  });

  it("give the same words in parts, to show when a bar is tapped", () => {
    const { bars } = nutritionHistoryChart(week([[3030, 100], null]), "kcal");

    expect(bars[0]).toMatchObject({
      title: "Monday",
      amount: "3,030 kcal",
      detail: "250 over its range of 2,520 to 2,780",
    });
    expect(bars[1]).toMatchObject({
      title: "Tuesday",
      amount: "Nothing logged",
      detail: "Its range is 2,520 to 2,780",
    });
  });
});

describe("nutritionHistoryChart band", () => {
  it("lies across the days that share a range", () => {
    const { band, ticks } = nutritionHistoryChart(week([[2000, 0]]), "kcal");

    expect(ticks.at(-1)?.label).toBe("3,000");
    expect(band).toEqual([{ left: 0, width: 1, bottom: 2520 / 3000, height: expect.closeTo(260 / 3000) }]);
  });

  it("steps on a day the target changed", () => {
    const changed = week([]);
    changed.days[5].targets = changed.days[6].targets = { kcal: 2000, proteinG: 160 };

    const [before, after] = nutritionHistoryChart(changed, "kcal").band;

    expect(before).toMatchObject({ left: 0, width: expect.closeTo(5 / 7) });
    expect(after).toMatchObject({ left: expect.closeTo(5 / 7), width: expect.closeTo(2 / 7) });
    // 1,900 kcal
    expect(after.bottom).toBeCloseTo(1900 / 3000);
  });
});

describe("nutritionHistoryChart average", () => {
  // Story 22
  it("is a line with its number", () => {
    const { average } = nutritionHistoryChart(week([[2000, 0], [1000, 0], null]), "kcal");

    expect(average).toEqual({ at: 0.5, number: "1,500", label: "Daily average 1,500 kcal" });
  });

  it("hides the axis numbers it would be drawn over", () => {
    const { ticks } = nutritionHistoryChart(
      week([
        [2000, 0],
        [2100, 0],
      ]),
      "kcal",
    );

    expect(ticks.map((tick) => tick.label)).toEqual(["0", "1,000", "", "3,000"]);
  });

  // Story 29
  it("is none, and says so, with nothing to average", () => {
    expect(nutritionHistoryChart(week([]), "kcal")).toMatchObject({
      average: null,
      nothingToAverage: "No days to average",
    });
    expect(nutritionHistoryChart(week([[2000, 0]], "2026-11-16"), "kcal")).toMatchObject({
      average: null,
      nothingToAverage: "No days to average yet",
    });
  });
});

describe("nutritionHistoryWeekLabel", () => {
  it.each([
    ["2026-11-22", "This week"],
    ["2026-11-23", "Last week"],
  ])("on %s is %s", (today, label) => {
    expect(nutritionHistoryWeekLabel(week([], today))).toBe(label);
  });

  it("is the week's dates further back", () => {
    expect(nutritionHistoryWeekLabel(week([], "2026-12-25"))).toMatch(/16.*22/);
  });
});

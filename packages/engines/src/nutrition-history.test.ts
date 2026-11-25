import type { NutritionWeek } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { historyDays, rangeBand, weekAverage, weeksAround } from "./nutrition-history";

// Ranges of 2,520 to 2,780 kcal and 144 to 192 g of protein
const targets = { kcal: 2650, proteinG: 160 };
const DATES = ["16", "17", "18", "19", "20", "21", "22"].map((day) => `2026-11-${day}`);

// Monday 16 to Sunday 22 November 2026: a [kcal, protein] for each day logged, null for one that isn't
const week = (
  logged: ([number, number] | null)[],
  {
    today = "2026-11-25",
    firstLoggedDate = "2026-11-16" as string | null,
    newTargets = {} as Record<number, object>,
  } = {},
): NutritionWeek => ({
  today,
  firstLoggedDate,
  days: DATES.map((date, i) => ({
    date,
    totals: { kcal: logged[i]?.[0] ?? 0, proteinG: logged[i]?.[1] ?? 0 },
    targets: { ...targets, ...newTargets[i] },
    logged: !!logged[i],
  })),
});

describe("historyDays", () => {
  // Spec #188 story 24: as the day's ring would be
  it("reads each logged day against its own range", () => {
    const days = historyDays(
      week([[2000, 150], [2650, 100], [3030, 200], null], { newTargets: { 2: { kcal: 3000, proteinG: 100 } } }),
      "kcal",
    );

    expect(days.slice(0, 4)).toEqual([
      {
        date: "2026-11-16",
        when: "past",
        logged: true,
        amount: 2000,
        range: { min: 2520, max: 2780 },
        state: "below",
        by: 520,
      },
      {
        date: "2026-11-17",
        when: "past",
        logged: true,
        amount: 2650,
        range: { min: 2520, max: 2780 },
        state: "in",
        by: 0,
      },
      {
        date: "2026-11-18",
        when: "past",
        logged: true,
        amount: 3030,
        range: { min: 2850, max: 3150 },
        state: "in",
        by: 0,
      },
      { date: "2026-11-19", when: "past", logged: false, range: { min: 2520, max: 2780 } },
    ]);
  });

  it("reads protein against protein's range", () => {
    const [below, over] = historyDays(
      week([
        [2000, 143],
        [2650, 200.4],
      ]),
      "protein",
    );

    expect(below).toMatchObject({ amount: 143, range: { min: 144, max: 192 }, state: "below", by: 1 });
    expect(over).toMatchObject({ amount: 200.4, state: "over", by: 8 });
  });

  it("counts a day logged with nothing in it as logged", () => {
    expect(historyDays(week([[0, 0]]), "kcal")[0]).toMatchObject({ logged: true, amount: 0, state: "below" });
  });

  it("tells today and the days to come apart from the past", () => {
    expect(historyDays(week([], { today: "2026-11-18" }), "kcal").map((day) => day.when)).toEqual([
      "past",
      "past",
      "today",
      "toCome",
      "toCome",
      "toCome",
      "toCome",
    ]);
  });
});

describe("weekAverage", () => {
  // Spec #188 stories 27 and 28
  it("is over the logged days, leaving out those with nothing logged, and today", () => {
    const logged = week([[2000, 100], null, [3000, 150], [400, 20]], { today: "2026-11-19" });

    expect(weekAverage(historyDays(logged, "kcal"))).toBe(2500);
    expect(weekAverage(historyDays(logged, "protein"))).toBe(125);
  });

  it("counts every logged day of a week that's over, and one logged with no kcal", () => {
    expect(
      weekAverage(
        historyDays(
          week([
            [2000, 100],
            [0, 0],
            [1000, 50],
            [1000, 50],
          ]),
          "kcal",
        ),
      ),
    ).toBe(1000);
  });

  // Story 29
  it("is null with nothing logged but today", () => {
    expect(weekAverage(historyDays(week([]), "kcal"))).toBeNull();
    expect(weekAverage(historyDays(week([[400, 20]], { today: "2026-11-16" }), "kcal"))).toBeNull();
  });
});

describe("rangeBand", () => {
  it("is one step across a week whose target didn't change", () => {
    expect(rangeBand(historyDays(week([]), "kcal"))).toEqual([{ from: 0, days: 7, range: { min: 2520, max: 2780 } }]);
  });

  // Story 23
  it("steps on a day the target changed", () => {
    const changed = { kcal: 3000, proteinG: 160 };
    const days = week([], { newTargets: { 3: changed, 4: changed } });

    expect(rangeBand(historyDays(days, "kcal"))).toEqual([
      { from: 0, days: 3, range: { min: 2520, max: 2780 } },
      { from: 3, days: 2, range: { min: 2850, max: 3150 } },
      { from: 5, days: 2, range: { min: 2520, max: 2780 } },
    ]);
    expect(rangeBand(historyDays(days, "protein"))).toHaveLength(1);
  });
});

describe("weeksAround", () => {
  // Spec #188 story 25: back to the first logged week, and no later than this one
  it.each([
    ["a week between them", "2026-11-25", "2026-11-15", "2026-11-09", "2026-11-23"],
    ["the first logged week", "2026-11-25", "2026-11-22", null, "2026-11-23"],
    ["this week", "2026-11-22", "2026-10-01", "2026-11-09", null],
    ["nothing logged", "2026-11-18", null, null, null],
  ])("gives the weeks either side of %s", (_, today, firstLoggedDate, earlier, later) => {
    expect(weeksAround(week([], { today, firstLoggedDate }))).toEqual({ earlier, later });
  });
});

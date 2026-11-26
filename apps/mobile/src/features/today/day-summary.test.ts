import type { Set } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { daySummary, foodRows, tomorrowCard, tomorrowLine, workoutRow, type DaySummaryInput } from "./day-summary";

const targets = { kcal: 2980, proteinG: 160, fatG: 90, carbsG: 330, fibreG: 30, waterMl: 2500 };
const totals = { kcal: 2900, proteinG: 170, fatG: 80, carbsG: 300, fibreG: 25 };
const entry = { id: "e1" } as never;
const loggedDay = {
  targets,
  totals,
  meals: [
    { meal: "breakfast" as const, entries: [entry] },
    { meal: "lunch" as const, entries: [] },
  ],
};

const input = (overrides: Partial<DaySummaryInput>): DaySummaryInput => ({
  now: new Date(),
  timeZone: "UTC",
  workouts: [],
  day: loggedDay,
  restDayToday: null,
  daysPerWeek: 3,
  plannedWorkout: null,
  ...overrides,
});

describe("daySummary: when it shows", () => {
  // Toronto: 6 pm is 22:00Z in summer time and 23:00Z in winter time
  const timeZone = "America/Toronto";
  const at = (iso: string) => daySummary(input({ now: new Date(iso), timeZone }));

  it("shows from 6 pm to just before 10 pm in the user's timezone", () => {
    expect(at("2026-07-15T21:59:00Z")).toBeNull();
    expect(at("2026-07-15T22:00:00Z")).not.toBeNull();
    expect(at("2026-07-16T01:59:00Z")).not.toBeNull();
    expect(at("2026-07-16T02:00:00Z")).toBeNull();
  });

  it("follows the clocks going back on 1 November", () => {
    expect(at("2026-11-01T22:59:00Z")).toBeNull();
    expect(at("2026-11-01T23:00:00Z")).not.toBeNull();
    expect(at("2026-11-02T02:59:00Z")).not.toBeNull();
    expect(at("2026-11-02T03:00:00Z")).toBeNull();
  });

  it("follows the clocks going forward on 8 March", () => {
    expect(at("2026-03-08T21:59:00Z")).toBeNull();
    expect(at("2026-03-08T22:00:00Z")).not.toBeNull();
  });
});

// The phone's own timezone, as the Rest Day rule reads the phone's local days
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
// Wednesday 25 November 2026, 7 pm on the phone
const evening = new Date(2026, 10, 25, 19, 0);
const local = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute).toISOString();

const loggedAt = local(25, 9);
const external = (count: number) =>
  Array.from({ length: count }, () => ({ kind: "external" as const, kg: 20, reps: 8, loggedAt }));
const timed = (count: number) =>
  Array.from({ length: count }, () => ({ kind: "timed" as const, seconds: 45, loggedAt }));

let ids = 0;
const workout = (startedAt: string, endedAt: string, exercises: [slug: string, sets: Set[]][]) => ({
  id: `w${++ids}`,
  startedAt,
  endedAt,
  workoutExercises: exercises.map(([slug, sets]) => ({ slug, sets })),
});
// 48 minutes: chest and triceps 3, quads and glutes 4, lats and upper back 3
const fullBody = workout(local(25, 9), local(25, 9, 48), [
  ["dumbbell-bench-press", external(3)],
  ["goblet-squat", external(4)],
  ["one-arm-dumbbell-row", external(3)],
]);
const mobility = workout(local(25, 12), local(25, 12, 20), [
  ["cat-cow", timed(2)],
  ["open-book", timed(2)],
]);

const evenings = (overrides: Partial<DaySummaryInput>) => daySummary(input({ now: evening, timeZone, ...overrides }));

describe("daySummary: the Workout", () => {
  it("names a Workout by its three most-credited Muscles, with its Sets and time", () => {
    const summary = evenings({ workouts: [fullBody] });
    expect(summary?.workout).toEqual({
      kind: "trained",
      muscles: ["quads", "glutes", "chest"],
      sets: 10,
      durationMs: 48 * 60_000,
    });
    expect(summary && workoutRow(summary.workout)).toEqual({
      label: "✅ Quads, glutes and chest",
      detail: "10 Sets · 48 min",
    });
  });

  it("merges two Workouts into one row, crediting across both", () => {
    const rows = workout(local(25, 17), local(25, 17, 30), [["one-arm-dumbbell-row", external(4)]]);
    const summary = evenings({ workouts: [rows, fullBody] });
    expect(summary?.workout).toEqual({
      kind: "trained",
      muscles: ["lats", "upper_back", "quads"],
      sets: 14,
      durationMs: 78 * 60_000,
    });
  });

  it("counts a Manual Workout logged afterwards for today, but not one for yesterday", () => {
    const backdated = workout(local(25, 7), local(25, 7, 25), [["goblet-squat", external(3)]]);
    const yesterday = workout(local(24, 18), local(24, 19), [["dumbbell-bench-press", external(5)]]);
    expect(evenings({ workouts: [backdated, yesterday] })?.workout).toEqual({
      kind: "trained",
      muscles: ["quads", "glutes", "adductors"],
      sets: 3,
      durationMs: 25 * 60_000,
    });
  });

  it("shows a Mobility Workout as Recovery, by its time", () => {
    const summary = evenings({ workouts: [mobility] });
    expect(summary?.workout).toEqual({ kind: "recovery", label: "Mobility", durationMs: 20 * 60_000 });
    expect(summary && workoutRow(summary.workout)).toEqual({ label: "✅ Mobility", detail: "20 min" });
  });

  it("names a day with training and a Recovery Workout by the training", () => {
    expect(evenings({ workouts: [mobility, fullBody] })?.workout.kind).toBe("trained");
  });

  it("ticks a recommended Rest Day that was kept", () => {
    const summary = evenings({ restDayToday: "trained-yesterday" });
    expect(summary?.workout).toEqual({ kind: "rest-day" });
    expect(summary && workoutRow(summary.workout)).toEqual({ label: "✅ Rest Day", detail: "" });
  });

  it("says there's no Workout yet with nothing done and no Rest Day", () => {
    const summary = evenings({});
    expect(summary?.workout).toEqual({ kind: "none" });
    expect(summary && workoutRow(summary.workout)).toEqual({ label: "○ No workout yet", detail: "" });
  });
});

describe("daySummary: food", () => {
  // The ranges for 2,980 kcal and 160 g: 2,830 to 3,130 kcal, 144 to 192 g
  const ate = (kcal: number, proteinG: number) =>
    evenings({ day: { ...loggedDay, totals: { ...totals, kcal, proteinG } } })?.food ?? null;

  it("is short of the kcal range, with protein short too", () => {
    const food = ate(2080, 120);
    expect(food).toEqual({
      kcal: { amount: 2080, target: 2980, state: "under" },
      protein: { amount: 120, target: 160, state: "under" },
    });
    expect(foodRows(food)).toEqual([
      { label: "○ Calories", detail: "2,080 / 2,980 kcal" },
      { label: "○ Protein", detail: "120 / 160 g" },
    ]);
  });

  it("ticks kcal and protein in range", () => {
    expect(foodRows(ate(2900, 170))).toEqual([
      { label: "✅ Calories", detail: "2,900 / 2,980 kcal" },
      { label: "✅ Protein", detail: "170 / 160 g" },
    ]);
  });

  it("marks kcal over the top of the range by how much", () => {
    expect(ate(3300, 150)?.kcal.state).toBe("over");
    expect(foodRows(ate(3300, 150))[0]).toEqual({ label: "✅ Calories", detail: "3,300 / 2,980 kcal · 170 over" });
  });

  it("rounds as the rings do", () => {
    expect(ate(2829.6, 143.5)).toEqual({
      kcal: { amount: 2830, target: 2980, state: "in" },
      protein: { amount: 144, target: 160, state: "in" },
    });
  });

  it("says no food was logged rather than showing zeros", () => {
    const summary = evenings({ day: { targets, totals: { ...totals, kcal: 0, proteinG: 0 }, meals: [] } });
    expect(summary?.food).toBeNull();
    expect(foodRows(null)).toEqual([{ label: "○ No food logged", detail: "" }]);
  });
});

describe("daySummary: tomorrow", () => {
  // Quads and glutes 3, chest and triceps 3: chest before triceps in Muscle order
  const plannedWorkout = {
    plannedExercises: [
      { slug: "goblet-squat", sets: 3 },
      { slug: "dumbbell-bench-press", sets: 3 },
    ],
    reasons: [{ code: "behind" as const, muscles: ["chest" as const] }],
  };
  const tomorrowTargets = { kcal: 2980, proteinG: 160 };

  it("is a Rest Day after training today, when this week's Workouts still fit", () => {
    const summary = evenings({ workouts: [fullBody], plannedWorkout });
    expect(summary?.tomorrow).toEqual({
      rest: true,
      reason: "You've trained today, and this week's Workouts still fit.",
      targets: tomorrowTargets,
    });
    expect(summary && tomorrowLine(summary.tomorrow)).toBe(
      "Tomorrow: Rest. You've trained today, and this week's Workouts still fit. 2,980 kcal · 160 g protein",
    );
  });

  it("is a Rest Day once the days per week are reached", () => {
    const monday = workout(local(23, 9), local(23, 10), [["goblet-squat", external(3)]]);
    const tuesday = workout(local(24, 9), local(24, 10), [["goblet-squat", external(3)]]);
    expect(evenings({ workouts: [fullBody, tuesday, monday], plannedWorkout })?.tomorrow).toMatchObject({
      rest: true,
      reason: "You've had 3 Workouts this week.",
    });
  });

  it("is the Planned Workout, named by its Muscles, with the plan's reason", () => {
    const summary = evenings({ workouts: [mobility], plannedWorkout });
    expect(summary?.tomorrow).toEqual({
      rest: false,
      muscles: ["quads", "glutes", "chest"],
      reason: "Chest is furthest behind this week.",
      targets: tomorrowTargets,
    });
    expect(summary && tomorrowLine(summary.tomorrow)).toBe(
      "Tomorrow: Quads, glutes and chest. Chest is furthest behind this week. 2,980 kcal · 160 g protein",
    );
  });

  it("has no reason for a plan stored before reasons", () => {
    const summary = evenings({ plannedWorkout: { ...plannedWorkout, reasons: undefined } });
    expect(summary?.tomorrow).toMatchObject({ rest: false, reason: null });
    expect(summary && tomorrowLine(summary.tomorrow)).toBe(
      "Tomorrow: Quads, glutes and chest. 2,980 kcal · 160 g protein",
    );
  });

  it("leads a finished day as the Tomorrow card: Rest or the Workout, why, and what to eat", () => {
    const rest = evenings({ workouts: [fullBody], plannedWorkout })?.tomorrow ?? null;
    expect(rest && tomorrowCard(rest)).toEqual({
      headline: "Rest.",
      reason: "You've trained today, and this week's Workouts still fit.",
      targets: "Eat 2,980 kcal · 160 g protein",
    });
    const train = evenings({ workouts: [mobility], plannedWorkout })?.tomorrow ?? null;
    expect(train && tomorrowCard(train)).toEqual({
      headline: "Quads, glutes and chest.",
      reason: "Chest is furthest behind this week.",
      targets: "Eat 2,980 kcal · 160 g protein",
    });
  });

  it("is left out with no Planned Workout or a stale one, rather than guessed", () => {
    expect(evenings({ workouts: [fullBody], plannedWorkout: null })?.tomorrow).toBeNull();
    expect(tomorrowLine(null)).toBeNull();
  });
});

describe("daySummary: finished", () => {
  // The ranges for 2,980 kcal and 160 g: 2,830 to 3,130 kcal, 144 to 192 g
  const ate = (kcal: number, proteinG: number) => ({ day: { ...loggedDay, totals: { ...totals, kcal, proteinG } } });

  it("is finished after training, with kcal in range", () => {
    expect(evenings({ workouts: [fullBody], ...ate(2900, 170) })?.finished).toBe(true);
  });

  it("is finished after training, with kcal over the range", () => {
    expect(evenings({ workouts: [fullBody], ...ate(3300, 170) })?.finished).toBe(true);
  });

  it("isn't finished after training while kcal is short, so the Nudge keeps saying what's left", () => {
    expect(evenings({ workouts: [fullBody], ...ate(2080, 170) })?.finished).toBe(false);
  });

  it("is finished on a recommended Rest Day kept, with kcal in range", () => {
    expect(evenings({ restDayToday: "trained-yesterday", ...ate(2900, 170) })?.finished).toBe(true);
  });

  it("is finished after a Recovery Workout, with kcal in range", () => {
    expect(evenings({ workouts: [mobility], ...ate(2900, 170) })?.finished).toBe(true);
  });

  it("never waits on protein: in range on kcal and short on protein is finished", () => {
    expect(evenings({ workouts: [fullBody], ...ate(2900, 120) })?.finished).toBe(true);
  });

  it("isn't finished with no Workout and no Rest Day, however the food went", () => {
    expect(evenings(ate(2900, 170))?.finished).toBe(false);
  });

  it("isn't finished with no food logged", () => {
    const noFood = { day: { targets, totals: { ...totals, kcal: 0, proteinG: 0 }, meals: [] } };
    expect(evenings({ workouts: [fullBody], ...noFood })?.finished).toBe(false);
  });
});

describe("daySummary: offline", () => {
  it("is made from the cached day and the Pending Workouts", () => {
    const pending = { ...fullBody, isPending: true };
    const summary = evenings({ workouts: [pending], restDayToday: "trained-today" });
    expect(summary?.workout).toMatchObject({ kind: "trained", sets: 10 });
    expect(summary?.food).toMatchObject({ kcal: { state: "in" } });
  });

  it("is hidden with no day cached", () => {
    expect(evenings({ workouts: [fullBody], day: undefined })).toBeNull();
  });
});

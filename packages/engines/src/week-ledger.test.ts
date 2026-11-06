import type { Workout } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { mondayBefore, mondayOf, weekLedger } from "./week-ledger";

type Part = Workout["assessment"];

const loggedAt = "2026-11-03T18:10:00.000Z";
const external = (count: number) =>
  Array.from({ length: count }, () => ({ kind: "external" as const, kg: 20, reps: 8, loggedAt }));

const workout = (id: string, startedAt: string, slug: string, sets: number, assessment?: Part) => ({
  id,
  startedAt,
  ...(assessment && { assessment }),
  workoutExercises: [{ slug, sets: external(sets) }],
});

const week = { monday: "2026-11-02", timeZone: "America/New_York" };
const tuesday = "2026-11-03T18:00:00.000Z";

describe("mondayOf", () => {
  it("is the Monday of the week, by the date in the user's timezone", () => {
    expect(mondayOf(new Date("2026-11-04T12:00:00Z"), "America/New_York")).toBe("2026-11-02");
  });

  it("is that same day on a Monday and six days back on a Sunday", () => {
    expect(mondayOf(new Date("2026-11-02T12:00:00Z"), "UTC")).toBe("2026-11-02");
    expect(mondayOf(new Date("2026-11-08T12:00:00Z"), "UTC")).toBe("2026-11-02");
  });

  it("still sees Sunday where it's already Monday in UTC", () => {
    expect(mondayOf(new Date("2026-11-02T04:30:00Z"), "America/New_York")).toBe("2026-10-26");
  });

  it("already sees Monday where it's still Sunday in UTC", () => {
    expect(mondayOf(new Date("2026-11-01T11:30:00Z"), "Pacific/Auckland")).toBe("2026-11-02");
  });

  it("crosses a month and a year", () => {
    expect(mondayOf(new Date("2027-01-01T12:00:00Z"), "UTC")).toBe("2026-12-28");
  });

  it("isn't moved by a daylight-saving change that day", () => {
    // New York's clocks go back early on Sunday 1 November 2026
    expect(mondayOf(new Date("2026-11-01T23:00:00-05:00"), "America/New_York")).toBe("2026-10-26");
  });
});

describe("weekLedger", () => {
  it("credits a Set 1 to each primary Muscle and 0.5 to each secondary", () => {
    // Goblet squat: quads and glutes primary, adductors and abs secondary
    expect(weekLedger([workout("w1", tuesday, "goblet-squat", 3)], week)).toEqual({
      quads: 3,
      glutes: 3,
      adductors: 1.5,
      abs: 1.5,
    });
  });

  it("counts a one-sided Exercise's Set once", () => {
    // Bulgarian split squat: one-sided, quads and glutes primary, adductors and hamstrings secondary
    expect(weekLedger([workout("w1", tuesday, "bulgarian-split-squat", 2)], week)).toEqual({
      quads: 2,
      glutes: 2,
      adductors: 1,
      hamstrings: 1,
    });
  });

  it("adds up every Workout of the week, Manual and Assessment alike", () => {
    const workouts = [
      workout("w1", "2026-11-02T18:00:00.000Z", "goblet-squat", 2),
      workout("w2", tuesday, "goblet-squat", 1, "A"),
    ];
    expect(weekLedger(workouts, week).quads).toBe(3);
  });

  it("counts a repeated Workout once", () => {
    const repeated = workout("w1", tuesday, "goblet-squat", 3);
    expect(weekLedger([repeated, repeated], week).quads).toBe(3);
  });

  it("leaves out a Workout of another week, even one that arrived late", () => {
    const lastWeek = workout("w1", "2026-10-30T18:00:00.000Z", "goblet-squat", 3);
    expect(weekLedger([lastWeek, workout("w2", tuesday, "goblet-squat", 1)], week).quads).toBe(1);
  });

  it("goes by the week in the user's timezone", () => {
    // Sunday 23:30 in New York, Monday 04:30 UTC
    const lateSunday = workout("w1", "2026-11-02T04:30:00.000Z", "goblet-squat", 3);
    expect(weekLedger([lateSunday], week)).toEqual({});
    expect(weekLedger([lateSunday], { monday: "2026-10-26", timeZone: week.timeZone }).quads).toBe(3);
    expect(weekLedger([lateSunday], { monday: "2026-11-02", timeZone: "UTC" }).quads).toBe(3);
  });

  it("ignores an Exercise the library doesn't know", () => {
    expect(weekLedger([workout("w1", tuesday, "not-in-this-library", 3)], week)).toEqual({});
  });
});

describe("mondayBefore", () => {
  it("is the Monday of the week before", () => {
    expect(mondayBefore("2026-11-02")).toBe("2026-10-26");
  });

  it("crosses a year", () => {
    expect(mondayBefore("2026-01-05")).toBe("2025-12-29");
  });

  it("is 7 calendar days across a clock change", () => {
    // New York's clocks go forward on 8 March 2026
    expect(mondayBefore("2026-03-09")).toBe("2026-03-02");
  });
});

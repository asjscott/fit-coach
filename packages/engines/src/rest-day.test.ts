import { describe, expect, it } from "vitest";
import { restDay } from "./rest-day";
import { withPending } from "./training-summaries";

// Worked weeks run Monday 19 to Sunday 25 October 2026; these tests run on Los Angeles time (UTC-7 that week)
const finished = (endedAt: string) => ({
  startedAt: new Date(Date.parse(endedAt) - 60 * 60_000).toISOString(),
  endedAt,
  workoutExercises: [],
});

describe("restDay", () => {
  it("recommends one when a Workout was finished today", () => {
    const wednesday = new Date("2026-10-21T18:00:00-07:00");
    expect(restDay([finished("2026-10-21T08:00:00-07:00")], wednesday, 4)).toBe("trained-today");
  });

  it("goes by the local day, not the UTC one", () => {
    const wednesdayMorning = new Date("2026-10-21T08:00:00-07:00");
    // Late on Tuesday locally, already Wednesday in UTC
    const lateTuesday = finished("2026-10-20T22:30:00-07:00");
    expect(restDay([lateTuesday], wednesdayMorning, 6)).not.toBe("trained-today");
  });

  it("recommends none on a day with nothing to recover from", () => {
    const wednesday = new Date("2026-10-21T18:00:00-07:00");
    expect(restDay([finished("2026-10-19T08:00:00-07:00")], wednesday, 4)).toBeNull();
  });

  it("recommends one the day after a Workout when the rest of the week still fits after today", () => {
    // Monday and Wednesday done, so 2 of 4 left, and Friday to Sunday are free
    const thursday = new Date("2026-10-22T18:00:00-07:00");
    const week = [finished("2026-10-19T08:00:00-07:00"), finished("2026-10-21T08:00:00-07:00")];
    expect(restDay(week, thursday, 4)).toBe("trained-yesterday");
  });

  it("recommends one the day after a Workout when the rest of the week fits exactly", () => {
    // Monday and Thursday done, so 2 of 4 left, and only Saturday and Sunday are free
    const friday = new Date("2026-10-23T18:00:00-07:00");
    const week = [finished("2026-10-19T08:00:00-07:00"), finished("2026-10-22T08:00:00-07:00")];
    expect(restDay(week, friday, 4)).toBe("trained-yesterday");
  });

  it("recommends none the day after a Workout when resting would leave too few days", () => {
    // Monday and Friday done, so 2 of 4 left, and only Sunday follows Saturday
    const saturday = new Date("2026-10-24T18:00:00-07:00");
    const week = [finished("2026-10-19T08:00:00-07:00"), finished("2026-10-23T08:00:00-07:00")];
    expect(restDay(week, saturday, 4)).toBeNull();
  });

  it("recommends one on Monday after a Sunday Workout: the new week has all its days", () => {
    const monday = new Date("2026-10-26T18:00:00-07:00");
    expect(restDay([finished("2026-10-25T08:00:00-07:00")], monday, 6)).toBe("trained-yesterday");
  });

  it("recommends one once days per week is reached, even days after the last Workout", () => {
    // Monday, Tuesday and Wednesday done, 3 of 3, and nothing finished since
    const friday = new Date("2026-10-23T18:00:00-07:00");
    const week = [
      finished("2026-10-19T08:00:00-07:00"),
      finished("2026-10-20T08:00:00-07:00"),
      finished("2026-10-21T08:00:00-07:00"),
    ];
    expect(restDay(week, friday, 3)).toBe("days-per-week-reached");
  });

  it("says the week is done rather than today is, on the Workout that reaches days per week", () => {
    const tuesday = new Date("2026-10-20T18:00:00-07:00");
    const week = [finished("2026-10-19T08:00:00-07:00"), finished("2026-10-20T08:00:00-07:00")];
    expect(restDay(week, tuesday, 2)).toBe("days-per-week-reached");
  });

  it("counts last week's Workouts towards nothing", () => {
    const wednesday = new Date("2026-10-28T18:00:00-07:00");
    const lastWeek = [
      finished("2026-10-19T08:00:00-07:00"),
      finished("2026-10-20T08:00:00-07:00"),
      finished("2026-10-21T08:00:00-07:00"),
    ];
    expect(restDay(lastWeek, wednesday, 3)).toBeNull();
  });

  it("counts Pending Workouts, whichever list they arrive in", () => {
    const friday = new Date("2026-10-23T18:00:00-07:00");
    const history = [
      { ...finished("2026-10-19T08:00:00-07:00"), id: "uploaded-monday" },
      { ...finished("2026-10-21T08:00:00-07:00"), id: "uploaded-wednesday" },
    ];
    const pending = [{ ...finished("2026-10-22T08:00:00-07:00"), id: "pending-thursday" }];
    expect(restDay(withPending(pending, history), friday, 3)).toBe("days-per-week-reached");
  });

  it("counts a Pending Workout offline, when it's the only one known", () => {
    // Thursday's Pending Workout, so 2 of 3 left, and Saturday and Sunday are free
    const friday = new Date("2026-10-23T18:00:00-07:00");
    const pending = [{ ...finished("2026-10-22T08:00:00-07:00"), id: "pending-thursday" }];
    expect(restDay(withPending(pending, null), friday, 3)).toBe("trained-yesterday");
  });

  it("needs days per week to say whether the rest of the week fits", () => {
    const thursday = new Date("2026-10-22T18:00:00-07:00");
    expect(restDay([finished("2026-10-21T08:00:00-07:00")], thursday, undefined)).toBeNull();
  });
});

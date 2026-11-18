import { describe, expect, it } from "vitest";
import { showsWeighInReminder, weighInDays } from "./weigh-in";

// Monday 16 November 2026, mid-morning in Toronto
const monday = new Date("2026-11-16T15:00:00Z");
const timeZone = "America/Toronto";

describe("showsWeighInReminder", () => {
  // Spec #158 story 12: Today asks on the Weigh-in Day, Monday unless the user changes it
  it("shows on a Monday for a user who never chose a Weigh-in Day", () => {
    const latestWeighIn = { date: "2026-11-09", kg: 80 };
    expect(showsWeighInReminder({ weighInDay: undefined, latestWeighIn, now: monday, timeZone })).toBe(true);
  });

  it("shows on the chosen Weigh-in Day only", () => {
    const latestWeighIn = { date: "2026-11-11", kg: 80 };
    const thursday = new Date("2026-11-19T15:00:00Z");
    expect(showsWeighInReminder({ weighInDay: "thursday", latestWeighIn, now: thursday, timeZone })).toBe(true);
    expect(showsWeighInReminder({ weighInDay: "thursday", latestWeighIn, now: monday, timeZone })).toBe(false);
  });

  // Spec #158 story 13: it goes once this week has a Weigh-in, whichever day it was logged for
  it("doesn't show once this week's Weigh-in is logged", () => {
    expect(
      showsWeighInReminder({
        weighInDay: "monday",
        latestWeighIn: { date: "2026-11-16", kg: 80 },
        now: monday,
        timeZone,
      }),
    ).toBe(false);
    const sunday = new Date("2026-11-22T15:00:00Z");
    expect(
      showsWeighInReminder({
        weighInDay: "sunday",
        latestWeighIn: { date: "2026-11-16", kg: 80 },
        now: sunday,
        timeZone,
      }),
    ).toBe(false);
  });

  // The phone's copy of the user can be from last week, so last week's Weigh-in doesn't count for this one
  it("shows when the latest Weigh-in is last week's", () => {
    expect(
      showsWeighInReminder({
        weighInDay: "monday",
        latestWeighIn: { date: "2026-11-15", kg: 80 },
        now: monday,
        timeZone,
      }),
    ).toBe(true);
  });

  it("goes by the day in the user's timezone", () => {
    // Still Sunday evening in Toronto
    const sundayInToronto = new Date("2026-11-16T03:00:00Z");
    const latestWeighIn = { date: "2026-11-09", kg: 80 };
    expect(showsWeighInReminder({ weighInDay: "monday", latestWeighIn, now: sundayInToronto, timeZone })).toBe(false);
  });
});

describe("weighInDays", () => {
  // Spec #158 story 17: today or any of the 6 days before it
  it("offers today and the 6 days before it, newest first", () => {
    expect(weighInDays(monday, timeZone)).toEqual([
      { date: "2026-11-16", label: "Today" },
      { date: "2026-11-15", label: "Yesterday" },
      { date: "2026-11-14", label: "Saturday" },
      { date: "2026-11-13", label: "Friday" },
      { date: "2026-11-12", label: "Thursday" },
      { date: "2026-11-11", label: "Wednesday" },
      { date: "2026-11-10", label: "Tuesday" },
    ]);
  });
});

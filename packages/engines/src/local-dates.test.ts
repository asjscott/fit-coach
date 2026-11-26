import { describe, expect, it } from "vitest";
import { dayBefore, isLoggableDate, loggableDates, mondayOfDate, weekDates, weekdayOf } from "./local-dates";

describe("dayBefore", () => {
  it("is the calendar date before, across a month, a year and daylight saving", () => {
    expect(dayBefore("2026-11-18")).toBe("2026-11-17");
    expect(dayBefore("2026-03-01")).toBe("2026-02-28");
    expect(dayBefore("2027-01-01")).toBe("2026-12-31");
    expect(dayBefore("2026-11-02")).toBe("2026-11-01");
  });
});

// Wednesday 18 November 2026, 03:30 in UTC: still Tuesday 17th in Los Angeles
const now = new Date("2026-11-18T03:30:00Z");

describe("loggableDates", () => {
  it("is today and the 6 days before it, newest first", () => {
    expect(loggableDates(now, "UTC")).toEqual([
      "2026-11-18",
      "2026-11-17",
      "2026-11-16",
      "2026-11-15",
      "2026-11-14",
      "2026-11-13",
      "2026-11-12",
    ]);
  });

  it("counts from today in the user's timezone", () => {
    expect(loggableDates(now, "America/Los_Angeles")[0]).toBe("2026-11-17");
    expect(loggableDates(now, "America/Los_Angeles")[6]).toBe("2026-11-11");
  });

  it("crosses a month and a year", () => {
    expect(loggableDates(new Date("2027-01-02T12:00:00Z"), "UTC").slice(2)).toEqual([
      "2026-12-31",
      "2026-12-30",
      "2026-12-29",
      "2026-12-28",
      "2026-12-27",
    ]);
  });
});

describe("isLoggableDate", () => {
  it("takes today and the 6 days before it", () => {
    expect(isLoggableDate("2026-11-18", now, "UTC")).toBe(true);
    expect(isLoggableDate("2026-11-12", now, "UTC")).toBe(true);
  });

  it("refuses 7 days before, and tomorrow", () => {
    expect(isLoggableDate("2026-11-11", now, "UTC")).toBe(false);
    expect(isLoggableDate("2026-11-19", now, "UTC")).toBe(false);
  });

  it("goes by the user's timezone: the 18th is still tomorrow in Los Angeles", () => {
    expect(isLoggableDate("2026-11-18", now, "America/Los_Angeles")).toBe(false);
    expect(isLoggableDate("2026-11-11", now, "America/Los_Angeles")).toBe(true);
  });
});

describe("weekdayOf", () => {
  it("is the day of the week of a calendar date", () => {
    expect(weekdayOf("2026-11-16")).toBe("monday");
    expect(weekdayOf("2026-11-18")).toBe("wednesday");
    expect(weekdayOf("2026-11-22")).toBe("sunday");
  });
});

describe("mondayOfDate", () => {
  it("is the Monday of a calendar date's week, Monday to Sunday", () => {
    expect(mondayOfDate("2026-11-16")).toBe("2026-11-16");
    expect(mondayOfDate("2026-11-22")).toBe("2026-11-16");
    expect(mondayOfDate("2027-01-01")).toBe("2026-12-28");
  });
});

describe("weekDates", () => {
  it.each(["2026-10-26", "2026-10-29", "2026-11-01"])("is %s's week, Monday to Sunday", (date) => {
    expect(weekDates(date)).toEqual([
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
    ]);
  });
});

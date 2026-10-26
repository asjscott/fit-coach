import { describe, expect, it } from "vitest";
import { localDateText, localTimeText, withLocalDate, withLocalTime } from "./local-date-time";

// Local time throughout, as the user's phone or browser shows it
const local = (year: number, month: number, day: number, hours: number, minutes: number, seconds = 0) =>
  new Date(year, month - 1, day, hours, minutes, seconds);

describe("localDateText and localTimeText", () => {
  it("give a moment as a date and a time input show it", () => {
    const moment = local(2026, 3, 7, 6, 5);
    expect(localDateText(moment)).toBe("2026-03-07");
    expect(localTimeText(moment)).toBe("06:05");
  });
});

describe("withLocalDate", () => {
  it("moves a moment to another day, keeping its time of day", () => {
    expect(withLocalDate(local(2026, 10, 24, 9, 30, 15), "2026-10-23")).toEqual(local(2026, 10, 23, 9, 30, 15));
  });

  it("gives null for a cleared or impossible date", () => {
    expect(withLocalDate(local(2026, 10, 24, 9, 30), "")).toBeNull();
    expect(withLocalDate(local(2026, 10, 24, 9, 30), "2026-02-30")).toBeNull();
  });
});

describe("withLocalTime", () => {
  it("moves a moment to another time on the same day, to the minute", () => {
    expect(withLocalTime(local(2026, 10, 24, 9, 30, 15), "18:05")).toEqual(local(2026, 10, 24, 18, 5));
  });

  it("gives null for a cleared or impossible time", () => {
    expect(withLocalTime(local(2026, 10, 24, 9, 30), "")).toBeNull();
    expect(withLocalTime(local(2026, 10, 24, 9, 30), "24:10")).toBeNull();
  });
});

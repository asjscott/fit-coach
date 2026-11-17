import { describe, expect, it } from "vitest";
import { pastWorkoutDays } from "./past-workout";

// #129, user story 24: a Manual Workout can be logged for any of the last 7 days, today and the 6 before it
describe("the days a past Workout can be logged for", () => {
  // A Thursday afternoon, in the phone's time
  const now = new Date(2026, 10, 5, 15, 30);

  it("offers the 6 days before today, newest first, at this time of day", () => {
    const days = pastWorkoutDays(now);

    expect(days.map(({ label }) => label)).toEqual(["Yesterday", "Tuesday", "Monday", "Sunday", "Saturday", "Friday"]);
    expect(days[0]?.start).toEqual(new Date(2026, 10, 4, 15, 30));
    expect(days[5]?.start).toEqual(new Date(2026, 9, 30, 15, 30));
  });

  it("keeps every start within the 7 days the server accepts", () => {
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    for (const { start } of pastWorkoutDays(now)) {
      expect(now.getTime() - start.getTime()).toBeLessThan(sevenDaysMs);
    }
  });
});

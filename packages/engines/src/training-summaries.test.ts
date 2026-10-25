import type { Set, Workout } from "@fit/shared";
import { describe, expect, it } from "vitest";
import {
  historyByWeek,
  lastWorkout,
  summarizeWorkout,
  thisWeek,
  weekStart,
  weeklyVolume,
  withPending,
  workoutVolume,
} from "./training-summaries";

const loggedAt = "2026-10-24T09:00:00.000Z";
const kg = (kg: number, reps: number): Set => ({ kind: "external", kg, reps, loggedAt });
const reps = (reps: number): Set => ({ kind: "bodyweight", reps, loggedAt });
const seconds = (seconds: number): Set => ({ kind: "timed", seconds, loggedAt });

describe("workoutVolume", () => {
  it("sums kg × reps over weighted Sets", () => {
    const workout = { workoutExercises: [{ slug: "goblet-squat", sets: [kg(20, 10), kg(22.5, 8)] }] };
    // 200 + 180
    expect(workoutVolume(workout)).toBe(380);
  });

  it("doubles a one-sided Exercise", () => {
    const workout = { workoutExercises: [{ slug: "dumbbell-bulgarian-split-squat", sets: [kg(16, 10)] }] };
    // 16 × 10 per side, both sides
    expect(workoutVolume(workout)).toBe(320);
  });

  it("adds nothing for bodyweight and timed Sets", () => {
    const workout = {
      workoutExercises: [
        { slug: "push-up", sets: [reps(15), reps(12)] },
        { slug: "plank", sets: [seconds(45)] },
        { slug: "bulgarian-split-squat", sets: [reps(10)] },
      ],
    };
    expect(workoutVolume(workout)).toBe(0);
  });

  it("counts an Exercise this app version doesn't know as two-sided", () => {
    const workout = { workoutExercises: [{ slug: "mystery-press", sets: [kg(10, 10)] }] };
    expect(workoutVolume(workout)).toBe(100);
  });
});

describe("summarizeWorkout", () => {
  it("gives a Workout's Volume, Sets and duration", () => {
    const workout = {
      startedAt: "2026-10-24T09:00:00.000Z",
      endedAt: "2026-10-24T09:48:30.000Z",
      workoutExercises: [
        { slug: "goblet-squat", sets: [kg(20, 10), kg(20, 8)] },
        { slug: "plank", sets: [seconds(45)] },
      ],
    };
    expect(summarizeWorkout(workout)).toEqual({ volumeKg: 360, sets: 3, durationMs: 48.5 * 60_000 });
  });
});

// Tests run in America/Los_Angeles (vitest.config.ts): UTC−7 in October, UTC−8 after 1 November
describe("weekStart", () => {
  it("is Monday at midnight local time", () => {
    // Saturday 24 Oct 2026, 10:00 local
    expect(weekStart(new Date("2026-10-24T17:00:00.000Z")).toISOString()).toBe("2026-10-19T07:00:00.000Z");
  });

  it("keeps a Workout late on Sunday night in that week, though it's Monday in UTC", () => {
    // Sunday 25 Oct 2026, 23:30 local
    expect(weekStart(new Date("2026-10-26T06:30:00.000Z")).toISOString()).toBe("2026-10-19T07:00:00.000Z");
  });

  it("starts a new week at midnight on Monday", () => {
    // Monday 26 Oct 2026, 00:00 local
    expect(weekStart(new Date("2026-10-26T07:00:00.000Z")).toISOString()).toBe("2026-10-26T07:00:00.000Z");
  });
});

// A 45-minute Workout of goblet squats at 20 kg, one Set of 10 per 200 kg of Volume
function workout(id: string, startedAt: string, volumeKg = 200): Workout {
  const sets = Array.from({ length: volumeKg / 200 }, () => kg(20, 10));
  const endedAt = new Date(Date.parse(startedAt) + 45 * 60_000).toISOString();
  return { id, startedAt, endedAt, workoutExercises: [{ slug: "goblet-squat", loadType: "external", sets }] };
}

const ids = (workouts: Workout[]) => workouts.map((w) => w.id);

describe("historyByWeek", () => {
  it("groups Workouts into Monday-to-Sunday weeks, newest first, with each week's Workouts and Volume", () => {
    const weeks = historyByWeek([
      workout("tue-13-oct", "2026-10-13T14:00:00.000Z", 400), // Tue 13 Oct, 07:00 local
      workout("sun-25-oct-late", "2026-10-26T06:30:00.000Z", 600), // Sun 25 Oct, 23:30 local
      workout("mon-19-oct", "2026-10-19T08:00:00.000Z", 200), // Mon 19 Oct, 01:00 local
      workout("mon-26-oct", "2026-10-26T15:00:00.000Z", 200), // Mon 26 Oct, 08:00 local
    ]);

    expect(
      weeks.map((week) => ({
        start: week.start.toISOString(),
        workouts: ids(week.workouts),
        workoutCount: week.workoutCount,
        volumeKg: week.volumeKg,
      })),
    ).toEqual([
      { start: "2026-10-26T07:00:00.000Z", workouts: ["mon-26-oct"], workoutCount: 1, volumeKg: 200 },
      {
        start: "2026-10-19T07:00:00.000Z",
        workouts: ["sun-25-oct-late", "mon-19-oct"],
        workoutCount: 2,
        volumeKg: 800,
      },
      { start: "2026-10-12T07:00:00.000Z", workouts: ["tue-13-oct"], workoutCount: 1, volumeKg: 400 },
    ]);
  });

  it("leaves out weeks with no Workouts", () => {
    const weeks = historyByWeek([
      workout("this-week", "2026-10-24T17:00:00.000Z"),
      workout("months-ago", "2026-06-10T17:00:00.000Z"),
    ]);
    expect(weeks.map((week) => week.start.toISOString())).toEqual([
      "2026-10-19T07:00:00.000Z",
      "2026-06-08T07:00:00.000Z",
    ]);
  });

  it("has no weeks without Workouts", () => {
    expect(historyByWeek([])).toEqual([]);
  });
});

describe("weeklyVolume", () => {
  // Tuesday 10 Nov 2026, 10:00 local, after the clocks went back on 1 Nov
  const now = new Date("2026-11-10T18:00:00.000Z");

  it("gives the last 8 weeks' Volume, oldest first and ending with this week, with empty weeks as 0", () => {
    const series = weeklyVolume(
      [
        workout("too-old", "2026-09-21T06:00:00.000Z", 1000), // Sun 20 Sep, 23:00 local
        workout("first-week", "2026-09-22T16:00:00.000Z", 400), // Tue 22 Sep
        workout("sun-25-oct-late", "2026-10-26T06:30:00.000Z", 600), // Sun 25 Oct, 23:30 local
        workout("mon-19-oct", "2026-10-19T16:00:00.000Z", 200), // Mon 19 Oct
        workout("this-week", "2026-11-10T16:00:00.000Z", 800), // Tue 10 Nov, 08:00 local
      ],
      now,
    );

    expect(series.map((week) => [week.start.toISOString(), week.volumeKg])).toEqual([
      ["2026-09-21T07:00:00.000Z", 400],
      ["2026-09-28T07:00:00.000Z", 0],
      ["2026-10-05T07:00:00.000Z", 0],
      ["2026-10-12T07:00:00.000Z", 0],
      ["2026-10-19T07:00:00.000Z", 800],
      ["2026-10-26T07:00:00.000Z", 0],
      ["2026-11-02T08:00:00.000Z", 0],
      ["2026-11-09T08:00:00.000Z", 800],
    ]);
  });

  it("is 8 empty weeks with no Workouts", () => {
    expect(weeklyVolume([], now).map((week) => week.volumeKg)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });
});

describe("thisWeek", () => {
  // Thursday 29 Oct 2026, 18:00 local; the clocks go back on Sunday 1 Nov, inside this week
  const now = new Date("2026-10-30T01:00:00.000Z");

  it("counts this week's Workouts against days per week, with their Volume, Sets and Time", () => {
    const week = thisWeek(
      [
        workout("mon", "2026-10-26T15:00:00.000Z", 400), // Mon 26 Oct, 08:00 local
        workout("wed", "2026-10-28T16:00:00.000Z", 200), // Wed 28 Oct, 09:00 local
      ],
      now,
      4,
    );
    expect({
      workoutCount: week.workoutCount,
      target: week.target,
      volumeKg: week.volumeKg,
      sets: week.sets,
      durationMs: week.durationMs,
    }).toEqual({ workoutCount: 2, target: 4, volumeKg: 600, sets: 3, durationMs: 90 * 60_000 });
  });

  it("has the days Monday to Sunday at local midnight, across the clocks going back, with today marked", () => {
    const week = thisWeek([], now, 3);
    expect(week.days.map((day) => day.date.toISOString())).toEqual([
      "2026-10-26T07:00:00.000Z",
      "2026-10-27T07:00:00.000Z",
      "2026-10-28T07:00:00.000Z",
      "2026-10-29T07:00:00.000Z",
      "2026-10-30T07:00:00.000Z",
      "2026-10-31T07:00:00.000Z",
      "2026-11-01T07:00:00.000Z",
    ]);
    expect(week.days.map((day) => day.isToday)).toEqual([false, false, false, true, false, false, false]);
  });

  it("ticks the weekdays trained, by the phone's local time", () => {
    const week = thisWeek(
      [
        workout("mon-early", "2026-10-26T08:00:00.000Z"), // Mon 26 Oct, 01:00 local
        workout("mon-again", "2026-10-26T23:00:00.000Z"), // Mon 26 Oct, 16:00 local
        workout("wed-late", "2026-10-29T06:30:00.000Z"), // Wed 28 Oct, 23:30 local; Thursday in UTC
      ],
      now,
      4,
    );
    expect(week.days.map((day) => day.trained)).toEqual([true, false, true, false, false, false, false]);
    // Two Workouts on one day are two of the week's Workouts
    expect(week.workoutCount).toBe(3);
  });

  it("leaves out last week's Workouts, even late on Sunday night", () => {
    const week = thisWeek(
      [
        workout("sun-late", "2026-10-26T06:30:00.000Z"), // Sun 25 Oct, 23:30 local; Monday in UTC
        workout("mon-midnight", "2026-10-26T07:00:00.000Z"), // Mon 26 Oct, 00:00 local
      ],
      now,
      4,
    );
    expect(week.workoutCount).toBe(1);
    expect(week.days.map((day) => day.trained)).toEqual([true, false, false, false, false, false, false]);
  });

  it("has no target when the user hasn't set days per week", () => {
    expect(thisWeek([], now).target).toBeUndefined();
  });

  it("is an empty week with no Workouts", () => {
    const week = thisWeek([], now, 4);
    expect([week.workoutCount, week.volumeKg, week.sets, week.durationMs]).toEqual([0, 0, 0, 0]);
    expect(week.days.some((day) => day.trained)).toBe(false);
  });
});

describe("lastWorkout", () => {
  it("is the Workout that started most recently, Pending or not", () => {
    const merged = withPending(
      [workout("older-pending", "2026-10-20T16:00:00.000Z"), workout("newest-pending", "2026-10-28T16:00:00.000Z")],
      [workout("uploaded", "2026-10-26T15:00:00.000Z"), workout("backfilled", "2026-10-28T17:00:00.000Z")],
    );
    expect(lastWorkout(merged)?.id).toBe("backfilled");
  });

  it("is undefined with no Workouts", () => {
    expect(lastWorkout([])).toBeUndefined();
  });
});

describe("withPending", () => {
  // Thursday 29 Oct 2026, 18:00 local
  const now = new Date("2026-10-30T01:00:00.000Z");
  const marked = (workouts: (Workout & { isPending: boolean })[]) => workouts.map((w) => [w.id, w.isPending]);

  it("puts the Pending Workouts first, marked, then the History loaded from the server", () => {
    const merged = withPending(
      [workout("pending", "2026-10-28T16:00:00.000Z")],
      [workout("uploaded", "2026-10-26T15:00:00.000Z")],
    );
    expect(marked(merged)).toEqual([
      ["pending", true],
      ["uploaded", false],
    ]);
  });

  it("counts a Workout once in this week when the server already has it while it's still Pending", () => {
    const both = workout("both", "2026-10-28T16:00:00.000Z");
    const merged = withPending([both], [both]);
    expect(marked(merged)).toEqual([["both", true]]);
    expect(thisWeek(merged, now, 4).workoutCount).toBe(1);
  });

  it("still counts Pending Workouts towards this week while History isn't loaded (offline)", () => {
    const merged = withPending([workout("offline", "2026-10-28T16:00:00.000Z")], null);
    const week = thisWeek(merged, now, 4);
    expect(week.workoutCount).toBe(1);
    expect(week.days.map((day) => day.trained)).toEqual([false, false, true, false, false, false, false]);
  });
});

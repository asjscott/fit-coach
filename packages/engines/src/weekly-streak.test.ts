import { describe, expect, it } from "vitest";
import type { WorkoutSets } from "./training-summaries";
import { weeklyStreak, weeklyStreakSince } from "./weekly-streak";

// Worked weeks are Mondays in October and November 2026, in New York (UTC-4 until 1 November, then UTC-5), while the
// tests run on Los Angeles time: the user's timeZone decides the weeks, not the host's
const timeZone = "America/New_York";
// Onboarded on Wednesday 7 October, so the week of 5 October is the partial first week
const onboardedAt = "2026-10-07T14:00:00.000Z";

type StartedWorkout = WorkoutSets & { startedAt: string };

const workout = (startedAt: string): StartedWorkout => ({ startedAt, workoutExercises: [] });

// A walk, the Recovery Workout's first Exercise
const recovery = (startedAt: string): StartedWorkout => ({
  startedAt,
  workoutExercises: [{ slug: "walk", sets: [{ kind: "timed" as const, seconds: 1200, loggedAt: startedAt }] }],
});

// `count` Workouts at 9 am New York time on the first days of the week starting on this Monday
const week = (monday: string, count: number, make = workout) =>
  Array.from({ length: count }, (_, i) => {
    const day = new Date(`${monday}T13:00:00Z`);
    day.setUTCDate(day.getUTCDate() + i);
    return make(day.toISOString());
  });

// Wednesday 4 November at noon in New York; the week of 2 November is under way
const now = new Date("2026-11-04T17:00:00.000Z");

const streak = (workouts: StartedWorkout[], daysPerWeek = 4) =>
  weeklyStreak({ workouts, daysPerWeek, onboardedAt, now, timeZone });

describe("weeklyStreak", () => {
  it("counts a week with exactly one fewer Workout than days per week", () => {
    expect(streak([...week("2026-10-19", 3), ...week("2026-10-26", 3)])).toBe(2);
  });

  it("doesn't count a week two short of days per week", () => {
    expect(streak([...week("2026-10-19", 3), ...week("2026-10-26", 2)])).toBe(0);
  });

  it("counts Recovery Workouts", () => {
    expect(streak([...week("2026-10-26", 1), ...week("2026-10-26", 2, recovery)])).toBe(1);
  });

  it("is broken by a missed week", () => {
    const weeks = [...week("2026-10-12", 3), ...week("2026-10-19", 1), ...week("2026-10-26", 3)];
    expect(streak(weeks)).toBe(1);
  });

  it("is broken by a week with no Workouts at all", () => {
    expect(streak([...week("2026-10-12", 3), ...week("2026-10-26", 3)])).toBe(1);
  });

  it("isn't broken by the current week while it's under way", () => {
    const weeks = [...week("2026-10-19", 3), ...week("2026-10-26", 3), ...week("2026-11-02", 1)];
    expect(streak(weeks)).toBe(2);
  });

  it("adds the current week once it reaches the number", () => {
    const weeks = [...week("2026-10-19", 3), ...week("2026-10-26", 3), ...week("2026-11-02", 3)];
    expect(streak(weeks)).toBe(3);
  });

  it("counts the current week on its own after a missed one", () => {
    expect(streak([...week("2026-10-19", 3), ...week("2026-11-02", 3)])).toBe(1);
  });

  it("skips the partial first week, neither counting it nor breaking on it", () => {
    const weeks = [...week("2026-10-12", 3), ...week("2026-10-19", 3), ...week("2026-10-26", 3)];
    expect(streak(weeks)).toBe(3);
    expect(streak([...week("2026-10-05", 3), ...weeks])).toBe(3);
    expect(streak([...week("2026-10-05", 1), ...weeks])).toBe(3);
  });

  it("counts the first week like any other when the user onboarded on its Monday", () => {
    // 6 am on Monday 12 October in New York, 3 am in Los Angeles where the tests run
    const onMonday = { onboardedAt: "2026-10-12T10:00:00.000Z", daysPerWeek: 4, now, timeZone };
    const weeks = [...week("2026-10-12", 3), ...week("2026-10-19", 3), ...week("2026-10-26", 3)];
    expect(weeklyStreak({ ...onMonday, workouts: weeks })).toBe(3);
    expect(weeklyStreak({ ...onMonday, workouts: [...week("2026-10-12", 1), ...weeks.slice(3)] })).toBe(2);
  });

  it("skips the first week when the user onboarded after its Monday in their timezone", () => {
    // 12:30 am on Tuesday 13 October in New York, still Monday in Los Angeles where the tests run
    const earlyTuesday = { onboardedAt: "2026-10-13T04:30:00.000Z", daysPerWeek: 4, now, timeZone };
    const weeks = [...week("2026-10-12", 3), ...week("2026-10-19", 3), ...week("2026-10-26", 3)];
    expect(weeklyStreak({ ...earlyTuesday, workouts: weeks })).toBe(2);
    // 11 pm on Sunday 11 October in New York, already Monday in UTC: the week of 5 October is the partial one
    const lateSunday = { ...earlyTuesday, onboardedAt: "2026-10-12T03:00:00.000Z" };
    expect(weeklyStreak({ ...lateSunday, workouts: [...week("2026-10-12", 1), ...weeks.slice(3)] })).toBe(2);
  });

  it("counts nothing before the user onboarded", () => {
    const weeks = [...week("2026-10-12", 3), ...week("2026-10-19", 3), ...week("2026-10-26", 3)];
    expect(streak([...week("2026-09-21", 3), ...week("2026-09-28", 3), ...weeks])).toBe(3);
  });

  it("is zero in the first week", () => {
    const firstWednesday = new Date("2026-10-07T20:00:00.000Z");
    const workouts = week("2026-10-05", 4);
    expect(weeklyStreak({ workouts, daysPerWeek: 4, onboardedAt, now: firstWednesday, timeZone })).toBe(0);
  });

  it("judges every week with the current days per week", () => {
    const weeks = [...week("2026-10-12", 2), ...week("2026-10-19", 4), ...week("2026-10-26", 4)];
    expect(streak(weeks, 5)).toBe(2);
    expect(streak(weeks, 3)).toBe(3);
  });

  it("puts a Workout late on Sunday in that week, by the user's timezone", () => {
    // 11:30 pm on Sunday 25 October in New York, already Monday in UTC
    const lateSunday = workout("2026-10-26T03:30:00.000Z");
    expect(streak([...week("2026-10-19", 2), lateSunday, ...week("2026-10-26", 3)])).toBe(2);
  });

  it("puts a Workout just after midnight on Monday in the new week, by the user's timezone", () => {
    // 12:30 am on Monday 26 October in New York, still Sunday in Los Angeles, where the tests run
    const earlyMonday = workout("2026-10-26T04:30:00.000Z");
    expect(streak([...week("2026-10-19", 2), earlyMonday, ...week("2026-10-26", 2)])).toBe(1);
  });

  it("ends at the week holding `now`, so a Week Summary can ask for a week that has ended", () => {
    const weeks = [...week("2026-10-19", 3), ...week("2026-10-26", 3), ...week("2026-11-02", 3)];
    // Sunday 1 November at 7 pm in New York, the end of the week of 26 October
    const sundayEvening = new Date("2026-11-02T00:00:00.000Z");
    expect(weeklyStreak({ workouts: weeks, daysPerWeek: 4, onboardedAt, now: sundayEvening, timeZone })).toBe(2);
  });

  it("keeps the weeks whole across the end of daylight saving", () => {
    // Sunday 1 November at 11 pm in New York, after the clocks went back that morning
    const lastNight = workout("2026-11-02T04:00:00.000Z");
    expect(streak([...week("2026-10-26", 2), lastNight])).toBe(1);
  });
});

describe("weeklyStreakSince", () => {
  const since = (workouts: StartedWorkout[]) =>
    weeklyStreakSince({ workouts, daysPerWeek: 4, onboardedAt, now, timeZone });

  it("is the Monday of the week that broke the streak, which History must hold whole", () => {
    expect(since([...week("2026-10-12", 1), ...week("2026-10-19", 3), ...week("2026-10-26", 3)])).toBe("2026-10-12");
  });

  it("is last week's Monday when last week broke it", () => {
    expect(since(week("2026-11-02", 1))).toBe("2026-10-26");
  });

  it("is the Monday before a whole onboarding week when nothing broke it", () => {
    const onMonday = { onboardedAt: "2026-10-12T10:00:00.000Z", daysPerWeek: 4, now, timeZone };
    const weeks = [...week("2026-10-12", 3), ...week("2026-10-19", 3), ...week("2026-10-26", 3)];
    expect(weeklyStreakSince({ ...onMonday, workouts: weeks })).toBe("2026-10-05");
  });

  it("is the onboarding week's Monday when nothing broke it", () => {
    expect(since([...week("2026-10-12", 3), ...week("2026-10-19", 3), ...week("2026-10-26", 3)])).toBe("2026-10-05");
  });
});

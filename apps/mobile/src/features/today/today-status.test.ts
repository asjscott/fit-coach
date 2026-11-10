import { describe, expect, it, vi } from "vitest";
import {
  checkInLighterRow,
  showsCheckIn,
  supersetWithLabel,
  todayCard,
  todayLoggedLine,
  todayPlan,
  todayPlanLine,
  todayRestDay,
  todayState,
} from "./today-status";

vi.mock("expo-localization", () => ({ getCalendars: () => [{}] }));

describe("todayState", () => {
  it("is loading until History arrives", () => {
    expect(todayState({ historyLoaded: false, failed: false, workoutCount: 0 })).toBe("loading");
  });

  it("is offline when History couldn't load", () => {
    expect(todayState({ historyLoaded: false, failed: true, workoutCount: 1 })).toBe("offline");
  });

  it("is a first run when there are no Workouts at all", () => {
    expect(todayState({ historyLoaded: true, failed: false, workoutCount: 0 })).toBe("first-run");
  });

  it("is loaded once History arrives with Workouts, Pending ones included", () => {
    expect(todayState({ historyLoaded: true, failed: false, workoutCount: 1 })).toBe("loaded");
  });
});

describe("todayPlan", () => {
  const settled = { isLoaded: true, workoutInProgress: false, hasPlan: true, stale: false };

  it("shows a plan the phone has no reason to doubt", () => {
    expect(todayPlan(settled)).toBe("planned");
  });

  it("asks for a connection in place of a stale plan", () => {
    expect(todayPlan({ ...settled, stale: true })).toBe("connect");
  });

  it("doesn't ask for a connection while an upload or the next plan is on its way", () => {
    expect(todayPlan({ ...settled, stale: true, syncing: true })).toBe("planning");
  });

  it("shows a plan that isn't stale whatever is syncing", () => {
    expect(todayPlan({ ...settled, syncing: true })).toBe("planned");
  });

  it("offers nothing during a Workout, stale or not", () => {
    expect(todayPlan({ ...settled, workoutInProgress: true })).toBe("none");
    expect(todayPlan({ ...settled, workoutInProgress: true, stale: true })).toBe("none");
  });

  it("offers nothing until the Logbook has loaded, or without a plan", () => {
    expect(todayPlan({ ...settled, isLoaded: false })).toBe("none");
    expect(todayPlan({ ...settled, hasPlan: false })).toBe("none");
  });
});

describe("todayRestDay", () => {
  const now = new Date(2026, 10, 4, 18);
  const finishedOffline = [
    {
      startedAt: new Date(2026, 10, 4, 7).toISOString(),
      endedAt: new Date(2026, 10, 4, 8).toISOString(),
      workoutExercises: [],
    },
  ];

  it("recommends a Rest Day after a Workout finished offline, above the line asking for a connection", () => {
    expect(todayRestDay("connect", finishedOffline, now, 4)).toBe("trained-today");
  });

  it("recommends a Rest Day above the Planned Workout", () => {
    expect(todayRestDay("planned", finishedOffline, now, 4)).toBe("trained-today");
  });

  it("stays quiet with nothing on offer to sit above", () => {
    expect(todayRestDay("none", finishedOffline, now, 4)).toBeNull();
  });
});

describe("todayCard", () => {
  const ready = {
    isLoaded: true,
    state: "loaded",
    plan: "planned",
    workoutInProgress: false,
    assessmentFirst: false,
    finishedToday: false,
    restDay: null,
  } as const;

  it("offers the plan on an ordinary day", () => {
    expect(todayCard(ready)).toBe("ready");
  });

  it("waits for the phone and History, so a finished day doesn't flash as ready", () => {
    expect(todayCard({ ...ready, isLoaded: false })).toBe("loading");
    expect(todayCard({ ...ready, state: "loading" })).toBe("loading");
  });

  it("puts a Workout under way first", () => {
    expect(todayCard({ ...ready, workoutInProgress: true, finishedToday: true })).toBe("resume");
  });

  it("is done for today once a Workout is finished, whatever else a Rest Day says", () => {
    expect(todayCard({ ...ready, finishedToday: true, restDay: "days-per-week-reached" })).toBe("done");
  });

  it("is done for today with no plan to offer next", () => {
    expect(todayCard({ ...ready, plan: "connect", finishedToday: true })).toBe("done");
  });

  it("leads with the Assessment when the user hasn't one", () => {
    expect(todayCard({ ...ready, plan: "none", assessmentFirst: true })).toBe("assessment");
  });

  it("recommends rest without a Workout finished today", () => {
    expect(todayCard({ ...ready, restDay: "trained-yesterday" })).toBe("rest");
  });

  it("stands in for a stale plan", () => {
    expect(todayCard({ ...ready, plan: "connect" })).toBe("connect");
    expect(todayCard({ ...ready, plan: "planning" })).toBe("connect");
  });

  it("offers a Manual Workout with nothing else to show", () => {
    expect(todayCard({ ...ready, plan: "none" })).toBe("manual");
  });
});

describe("todayLoggedLine", () => {
  const workout = (startedAt: string, endedAt: string, kg: number) => ({
    startedAt,
    endedAt,
    workoutExercises: [
      { slug: "goblet-squat", sets: [{ kind: "external" as const, kg, reps: 10, loggedAt: startedAt }] },
    ],
  });

  it("sums the day's Workouts", () => {
    const morning = workout("2026-10-21T08:00:00Z", "2026-10-21T08:30:00Z", 20);
    const evening = workout("2026-10-21T18:00:00Z", "2026-10-21T18:14:00Z", 10);
    expect(todayLoggedLine([morning, evening])).toBe("2 Sets · 44 min · 300 kg");
  });

  it("leaves out Volume with none, as on a bodyweight day", () => {
    const pushUps = {
      startedAt: "2026-10-21T08:00:00Z",
      endedAt: "2026-10-21T08:10:00Z",
      workoutExercises: [
        { slug: "push-up", sets: [{ kind: "bodyweight" as const, reps: 10, loggedAt: "2026-10-21T08:05:00Z" }] },
      ],
    };
    expect(todayLoggedLine([pushUps])).toBe("1 Set · 10 min");
  });
});

describe("todayPlanLine", () => {
  it("counts the Exercises and Sets, with the time", () => {
    const plannedExercises = [{ sets: 3 }, { sets: 4 }];
    expect(todayPlanLine(plannedExercises, 2640)).toBe("2 Exercises · 7 Sets · About 44 min");
  });

  it("uses the singular for one", () => {
    expect(todayPlanLine([{ sets: 1 }], 600)).toBe("1 Exercise · 1 Set · About 10 min");
  });

  it("says when the check-in took Sets off", () => {
    expect(todayPlanLine([{ sets: 3 }], 900, true)).toBe(
      "1 Exercise · 3 Sets · About 15 min · lighter after your check-in",
    );
  });
});

describe("showsCheckIn", () => {
  const base = { card: "ready", hasDaysWorkout: true, checkIn: "not-checked-in" } as const;

  it("shows with a Planned Workout to start, ready or on a Rest Day", () => {
    expect(showsCheckIn(base)).toBe(true);
    expect(showsCheckIn({ ...base, card: "rest" })).toBe(true);
  });

  it("goes once the user has checked in", () => {
    expect(showsCheckIn({ ...base, checkIn: "checked-in" })).toBe(false);
  });

  it("goes once a Workout starts or is done that day", () => {
    expect(showsCheckIn({ ...base, card: "resume" })).toBe(false);
    expect(showsCheckIn({ ...base, card: "done" })).toBe(false);
  });

  it("doesn't show without a Planned Workout to start", () => {
    expect(showsCheckIn({ ...base, card: "rest", hasDaysWorkout: false })).toBe(false);
    for (const card of ["loading", "assessment", "connect", "manual"] as const) {
      expect(showsCheckIn({ ...base, card })).toBe(false);
    }
  });

  it("waits until the phone has read today's check-in", () => {
    expect(showsCheckIn({ ...base, checkIn: "unread" })).toBe(false);
  });
});

describe("checkInLighterRow", () => {
  const full = { lighter: false, fullWorkout: false, canBeLighter: true };

  it("isn't there when no check-in could make the Workout lighter", () => {
    expect(checkInLighterRow({ ...full, canBeLighter: false })).toEqual({ reserved: false, note: false, chip: false });
  });

  it("keeps the row's space while the Workout is full, so a rating that makes it lighter doesn't move the chips (#113)", () => {
    expect(checkInLighterRow(full)).toEqual({ reserved: true, note: false, chip: false });
  });

  it("shows the note and Full workout in that space once the check-in makes the Workout lighter", () => {
    expect(checkInLighterRow({ ...full, lighter: true })).toEqual({ reserved: true, note: true, chip: true });
  });

  it("keeps the note's space while Full workout is chosen, so the chip stays under the finger", () => {
    expect(checkInLighterRow({ ...full, fullWorkout: true })).toEqual({ reserved: true, note: false, chip: true });
  });
});

describe("supersetWithLabel", () => {
  it("names the partner exactly as the library does", () => {
    expect(supersetWithLabel("Barbell Romanian deadlift")).toBe("Superset with Barbell Romanian deadlift");
    expect(supersetWithLabel("Prone Y-T-W raise")).toBe("Superset with Prone Y-T-W raise");
  });
});

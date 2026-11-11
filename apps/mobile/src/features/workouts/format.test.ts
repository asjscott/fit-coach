import type { Set } from "@fit/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  describeSet,
  durationLabel,
  elapsedClockLabel,
  elapsedLabel,
  previousSetsLabel,
  prLabel,
  prsHeadline,
  setParts,
  setsSummary,
  timeLabel,
  estimatedTimeLabel,
  timeStat,
  weekDatesLabel,
  noAlternativeLabel,
  plannedSetsLabel,
  setTargetLabel,
  straightToLabel,
  supersetLetter,
  supersetNote,
  workoutExerciseSummary,
  workoutTimesLabel,
  workoutWhenLabel,
} from "./format";

const phone = vi.hoisted(() => ({ uses24hourClock: false as boolean | null }));
vi.mock("expo-localization", () => ({ getCalendars: () => [phone] }));

beforeEach(() => {
  phone.uses24hourClock = false;
});

const minutes = (n: number) => n * 60_000;

describe("elapsedLabel", () => {
  it("counts the whole minutes since the Workout started", () => {
    expect(elapsedLabel(minutes(12) + 59_000)).toBe("12 min");
  });

  it("reads as hours and minutes after an hour, like the Time Stat", () => {
    expect(elapsedLabel(minutes(65))).toBe("1:05 h");
    expect(elapsedLabel(minutes(120) + 30_000)).toBe("2:00 h");
  });

  it("reads 0 min when the phone's clock is behind the start", () => {
    expect(elapsedLabel(-minutes(2))).toBe("0 min");
  });
});

// A moment on a local date, so these read the same in any time zone
const at = (day: number, hours: number, minutes: number) => new Date(2026, 10, day, hours, minutes).toISOString();
const now = new Date(2026, 10, 4, 12, 0);

describe("timeLabel", () => {
  it("follows the phone's 12-hour clock", () => {
    expect(timeLabel(at(4, 19, 53))).toMatch(/^7:53\sPM$/i);
  });

  it("follows the phone's 24-hour clock", () => {
    phone.uses24hourClock = true;
    expect(timeLabel(at(4, 19, 53))).toBe("19:53");
    expect(timeLabel(at(4, 0, 5))).toMatch(/^0?0:05$/);
  });

  it("leaves it to the locale when the browser doesn't say", () => {
    phone.uses24hourClock = null;
    expect(timeLabel(at(4, 19, 53))).toMatch(/7:53|19:53/);
  });
});

describe("workoutWhenLabel", () => {
  it("says the date once when the Workout starts and ends on it", () => {
    expect(workoutWhenLabel({ startedAt: at(4, 7, 1), endedAt: at(4, 7, 7) }, now)).toMatch(
      /^Today, 7:01\sAM – 7:07\sAM$/i,
    );
  });

  it("gives both dates when the Workout runs past midnight", () => {
    expect(workoutWhenLabel({ startedAt: at(3, 23, 30), endedAt: at(4, 0, 15) }, now)).toMatch(
      /^Yesterday, 11:30\sPM – Today, 12:15\sAM$/i,
    );
  });

  it("gives both dates when the start was moved to an earlier date", () => {
    const label = workoutWhenLabel({ startedAt: new Date(2026, 9, 20, 7, 1).toISOString(), endedAt: at(4, 7, 7) }, now);
    expect(label).toMatch(/(20 Oct|Oct 20), 7:01\sAM – Today, 7:07\sAM$/i);
  });
});

describe("workoutTimesLabel", () => {
  it("is just the times on one date", () => {
    expect(workoutTimesLabel({ startedAt: at(4, 7, 1), endedAt: at(4, 7, 7) }, now)).toMatch(/^7:01\sAM – 7:07\sAM$/i);
  });

  it("gives both dates when they differ", () => {
    expect(workoutTimesLabel({ startedAt: at(3, 23, 30), endedAt: at(4, 0, 15) }, now)).toMatch(
      /^Yesterday, 11:30\sPM – Today, 12:15\sAM$/i,
    );
  });
});

describe("durationLabel", () => {
  it("gives a finished Workout's length to the nearest minute", () => {
    const startedAt = "2026-10-25T09:00:00.000Z";
    expect(durationLabel({ startedAt, endedAt: "2026-10-25T09:48:30.000Z" })).toBe("49 min");
    expect(durationLabel({ startedAt, endedAt: "2026-10-25T11:05:00.000Z" })).toBe("2:05 h");
  });
});

describe("elapsedClockLabel", () => {
  it("reads as minutes and seconds, then hours", () => {
    expect(elapsedClockLabel(0)).toBe("0:00");
    expect(elapsedClockLabel(65_000)).toBe("1:05");
    expect(elapsedClockLabel((48 * 60 + 12) * 1000 + 999)).toBe("48:12");
    expect(elapsedClockLabel((3600 + 5 * 60 + 9) * 1000)).toBe("1:05:09");
  });

  it("shows a start in the future (a clock change) as zero", () => {
    expect(elapsedClockLabel(-5000)).toBe("0:00");
  });
});

const loggedAt = "2026-10-24T09:05:00.000Z";
const lifted = (kg: number, reps: number): Set => ({ kind: "external", kg, reps, loggedAt });

describe("setsSummary", () => {
  it("says the weight once when every Set used it", () => {
    expect(setsSummary([lifted(18, 10), lifted(18, 10), lifted(18, 8)])).toBe("18 kg × 10, 10, 8");
  });

  it("gives each Set its weight when the weight changed", () => {
    expect(setsSummary([lifted(16, 10), lifted(18.5, 8)])).toBe("16 kg × 10, 18.5 kg × 8");
  });

  it("lists reps or seconds with the unit once", () => {
    const reps = (n: number): Set => ({ kind: "bodyweight", reps: n, loggedAt });
    const hold = (seconds: number): Set => ({ kind: "timed", seconds, loggedAt });
    expect(setsSummary([reps(12), reps(10)])).toBe("12, 10 reps");
    expect(setsSummary([hold(45)])).toBe("45 s");
  });

  it("gives timed Sets of a minute or more in minutes, each in full when it has seconds over (#109)", () => {
    const hold = (seconds: number): Set => ({ kind: "timed", seconds, loggedAt });
    expect(setsSummary([hold(1200)])).toBe("20 min");
    expect(setsSummary([hold(90), hold(75)])).toBe("1 min 30 s, 1 min 15 s");
  });

  it("is empty with no Sets", () => {
    expect(setsSummary([])).toBe("");
  });
});

describe("workoutExerciseSummary", () => {
  it("counts the Sets before summarising them", () => {
    expect(workoutExerciseSummary([lifted(18, 10), lifted(18, 8)])).toBe("2 sets · 18 kg × 10, 8");
    expect(workoutExerciseSummary([lifted(18, 10)])).toBe("1 set · 18 kg × 10");
  });

  it("says when nothing is logged yet", () => {
    expect(workoutExerciseSummary([])).toBe("Not started");
  });

  it("shows the Previous Sets until something is logged", () => {
    const previous = [lifted(18, 10), lifted(18, 10), lifted(18, 8)];
    expect(workoutExerciseSummary([], previous)).toBe("Last: 18 kg × 10, 10, 8");
    expect(workoutExerciseSummary([lifted(20, 6)], previous)).toBe("1 set · 20 kg × 6");
  });
});

describe("workoutExerciseSummary in a Workout started from a plan", () => {
  const planned = { sets: 3, target: { unit: "kg", kg: 20, reps: 8 } } as const;

  it("shows the target Sets until something is logged, ahead of the Previous Sets", () => {
    expect(workoutExerciseSummary([], [lifted(18, 10)], planned)).toBe("3 sets · 20 kg × 8");
    expect(workoutExerciseSummary([lifted(20, 6)], [lifted(18, 10)], planned)).toBe("1 set · 20 kg × 6");
  });

  it("says the target is per side for a one-sided Exercise, as Today does", () => {
    expect(workoutExerciseSummary([], undefined, planned, true)).toBe("3 sets · 20 kg × 8 per side");
  });
});

describe("setTargetLabel", () => {
  it.each([
    ["a load", { unit: "kg", kg: 22.5, reps: 8 }, "22.5 kg × 8"],
    ["reps", { unit: "reps", reps: 12 }, "12 reps"],
    ["seconds", { unit: "seconds", seconds: 40 }, "40 s"],
    ["a band level", { unit: "band", level: "medium", reps: 12 }, "Medium band × 12"],
    ["a two-word band level", { unit: "band", level: "extra_heavy", reps: 12 }, "Extra heavy band × 12"],
  ] as const)("reads %s the way a Set does", (_name, target, label) => {
    expect(setTargetLabel(target)).toBe(label);
  });

  it("reads a timed target of a minute or more in minutes, as the walk's 20 minutes", () => {
    expect(setTargetLabel({ unit: "seconds", seconds: 1200 })).toBe("20 min");
    expect(setTargetLabel({ unit: "seconds", seconds: 60 })).toBe("1 min");
    expect(setTargetLabel({ unit: "seconds", seconds: 90 })).toBe("1 min 30 s");
    expect(setTargetLabel({ unit: "seconds", seconds: 59 })).toBe("59 s");
    expect(plannedSetsLabel({ sets: 1, target: { unit: "seconds", seconds: 1200 } })).toBe("1 set · 20 min");
  });

  it("shows a load the profile has as it is, without floating-point noise", () => {
    expect(setTargetLabel({ unit: "kg", kg: 6.25, reps: 8 })).toBe("6.25 kg × 8");
    expect(setTargetLabel({ unit: "kg", kg: 2.5 + 0.1 + 0.2, reps: 8 })).toBe("2.8 kg × 8");
  });
});

describe("noAlternativeLabel", () => {
  it("names the equipment and the Exercise that dropped out", () => {
    expect(noAlternativeLabel("bodyweight_only", "Lat pulldown")).toBe("No Bodyweight only option for lat pulldown");
    expect(noAlternativeLabel("full_gym", "Chin-up")).toBe("No Full gym option for chin-up");
  });
});

describe("plannedSetsLabel", () => {
  const planned = { sets: 3, target: { unit: "kg", kg: 20, reps: 8 } } as const;

  it("counts the Sets before the target", () => {
    expect(plannedSetsLabel(planned)).toBe("3 sets · 20 kg × 8");
    expect(plannedSetsLabel({ ...planned, sets: 1 })).toBe("1 set · 20 kg × 8");
  });

  it("says the target is per side for a one-sided Exercise", () => {
    expect(plannedSetsLabel(planned, true)).toBe("3 sets · 20 kg × 8 per side");
  });
});

describe("previousSetsLabel", () => {
  it("reads like the Sets summary, after Last", () => {
    expect(previousSetsLabel([lifted(18, 10), lifted(18, 10), lifted(18, 8)])).toBe("Last: 18 kg × 10, 10, 8");
  });
});

describe("estimatedTimeLabel", () => {
  it("gives the time to the nearest minute", () => {
    expect(estimatedTimeLabel(2640)).toBe("About 44 min");
    expect(estimatedTimeLabel(1725)).toBe("About 29 min");
  });

  it("stays in minutes over an hour, to match the Workout Length", () => {
    expect(estimatedTimeLabel(3600)).toBe("About 60 min");
    expect(estimatedTimeLabel(4500)).toBe("About 75 min");
  });
});

describe("timeStat", () => {
  it("gives under an hour in minutes", () => {
    expect(timeStat(48.5 * 60_000)).toEqual({ value: "49", unit: "min" });
  });

  it("gives an hour or more as hours and minutes", () => {
    expect(timeStat(125 * 60_000)).toEqual({ value: "2:05", unit: "h" });
  });
});

describe("weekDatesLabel", () => {
  // The range's dash always sits between thin spaces, whatever spacing the engine's Intl data uses
  const range = "\u2009–\u2009";
  const now = new Date(2026, 10, 3);

  it("gives a week inside one month as its days and month", () => {
    expect(weekDatesLabel(new Date(2026, 9, 12), now, "en-GB")).toBe(`12${range}18 Oct`);
  });

  it("names both months when the week crosses into the next", () => {
    expect(weekDatesLabel(new Date(2026, 9, 26), now, "en-GB")).toBe(`26 Oct${range}1 Nov`);
  });

  it("orders the day and month as the user's locale does", () => {
    expect(weekDatesLabel(new Date(2026, 9, 12), now, "en-US")).toBe(`Oct 12${range}18`);
    expect(weekDatesLabel(new Date(2026, 9, 26), now, "en-US")).toBe(`Oct 26${range}Nov 1`);
  });

  it("adds the year to a week from another year", () => {
    expect(weekDatesLabel(new Date(2025, 11, 29), now, "en-GB")).toBe(`29 Dec 2025${range}4 Jan 2026`);
  });
});

describe("describeSet", () => {
  it("reads a Set as its Load Type records it", () => {
    expect(describeSet(lifted(16, 10))).toBe("16 kg × 10");
    expect(describeSet({ kind: "bodyweight", reps: 12, loggedAt })).toBe("12 reps");
    expect(describeSet({ kind: "timed", seconds: 45, loggedAt })).toBe("45 s");
  });

  it("reads a timed Set of a minute or more in minutes, as its target does (#109)", () => {
    expect(describeSet({ kind: "timed", seconds: 1200, loggedAt })).toBe("20 min");
    expect(describeSet({ kind: "timed", seconds: 90, loggedAt })).toBe("1 min 30 s");
  });
});

describe("setParts", () => {
  it("splits a Set into numbers and the units after them", () => {
    expect(setParts(lifted(16, 10))).toEqual([
      [16, "kg ×"],
      [10, ""],
    ]);
    expect(setParts({ kind: "timed", seconds: 45, loggedAt })).toEqual([[45, "s"]]);
  });
});

describe("supersetLetter", () => {
  it("names the Workout's supersets A, B, C in order", () => {
    expect([0, 1, 2].map(supersetLetter)).toEqual(["A", "B", "C"]);
  });
});

describe("straightToLabel", () => {
  it("names the other Exercise exactly as the library does", () => {
    expect(straightToLabel("Barbell Romanian deadlift")).toBe("No rest: straight to Barbell Romanian deadlift");
  });
});

describe("supersetNote", () => {
  // A chin-up (120 s Sets, 90 s rest) with a lateral raise (60 s Sets, 45 s rest)
  const member = (slug: string, logged: number, planned: number) => ({
    slug,
    sets: Array<Set>(logged).fill({ kind: "bodyweight", reps: 8, loggedAt: "2026-11-09T10:00:00Z" }),
    planned: { sets: planned, target: { unit: "reps" as const, reps: 8 } },
  });
  const note = (chinUp: [number, number], raise: [number, number]) =>
    supersetNote([member("chin-up", ...chinUp), member("dumbbell-lateral-raise", ...raise)]);

  it("gives the longer of the two rests after each round", () => {
    expect(note([0, 3], [0, 3])).toBe("No rest between them, then 90 s rest");
  });

  it("says when the one with more Sets will rest its own time", () => {
    expect(note([0, 1], [0, 3])).toBe("No rest between them, then 90 s rest. Once Chin-up is done, 45 s");
  });

  it("keeps the pair's rest until the round both are in is over", () => {
    expect(note([1, 1], [0, 3])).toBe("No rest between them, then 90 s rest. Once Chin-up is done, 45 s");
  });

  it("gives the one left its own rest once the other is done", () => {
    expect(note([1, 1], [1, 3])).toBe("Chin-up is done: 45 s rest between Sets");
    expect(note([1, 1], [2, 3])).toBe("Chin-up is done: 45 s rest between Sets");
    expect(note([1, 1], [3, 3])).toBe("Chin-up is done: 45 s rest between Sets");
  });
});

// PRs found at upload (#130): what each kind of best reads as, and the line that celebrates them
describe("prLabel", () => {
  it("gives a weighted Exercise's estimated one-rep maximum to the tenth of a kg", () => {
    expect(prLabel({ slug: "goblet-squat", measure: "e1rm", best: 21.33, previous: 18.67 })).toBe(
      "Estimated max 21.3 kg, up from 18.7 kg",
    );
  });

  it("gives a weighted Ballistic Exercise's load for 8 reps", () => {
    expect(prLabel({ slug: "kettlebell-swing", measure: "load", best: 20, previous: 16 })).toBe(
      "20 kg for 8 reps, up from 16 kg",
    );
  });

  it("gives the most reps or seconds in a Set", () => {
    expect(prLabel({ slug: "push-up", measure: "reps", best: 14, previous: 12 })).toBe("14 reps, up from 12");
    expect(prLabel({ slug: "plank", measure: "seconds", best: 50, previous: 45 })).toBe("50 s, up from 45 s");
  });
});

describe("prsHeadline", () => {
  it("names the Exercise of a single PR", () => {
    expect(prsHeadline([{ slug: "goblet-squat", measure: "e1rm", best: 21, previous: 18 }])).toBe(
      "New PR: Goblet squat",
    );
  });

  it("counts several and names each", () => {
    expect(
      prsHeadline([
        { slug: "goblet-squat", measure: "e1rm", best: 21, previous: 18 },
        { slug: "plank", measure: "seconds", best: 50, previous: 45 },
      ]),
    ).toBe("2 new PRs: Goblet squat, Plank");
  });
});

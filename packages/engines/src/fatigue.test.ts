import { describe, expect, it } from "vitest";
import { muscleFatigue } from "./fatigue";

const now = new Date("2026-11-04T12:00:00.000Z");
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3_600_000).toISOString();

// One Workout of this many Sets of an Exercise, all logged at the same moment
const workout = (id: string, slug: string, sets: number, loggedAt: string) => ({
  id,
  startedAt: loggedAt,
  workoutExercises: [{ slug, sets: Array.from({ length: sets }, () => ({ loggedAt })) }],
});

// Goblet squat: quads and glutes primary, abs secondary
describe("muscleFatigue", () => {
  it("counts 6 Sets from 12 hours ago as 4.5", () => {
    expect(muscleFatigue([workout("w1", "goblet-squat", 6, hoursAgo(12))], now).quads).toBe(4.5);
  });

  it("counts the same 6 Sets from 40 hours ago as 1", () => {
    expect(muscleFatigue([workout("w1", "goblet-squat", 6, hoursAgo(40))], now).quads).toBeCloseTo(1);
  });

  it("counts nothing from 3 days ago", () => {
    expect(muscleFatigue([workout("w1", "goblet-squat", 6, hoursAgo(72))], now)).toEqual({});
  });

  it("counts a secondary Muscle half", () => {
    const fatigue = muscleFatigue([workout("w1", "goblet-squat", 6, hoursAgo(12))], now);

    expect(fatigue.glutes).toBe(4.5);
    expect(fatigue.abs).toBe(2.25);
  });

  it("judges each Set from its own loggedAt", () => {
    const sets = [{ loggedAt: hoursAgo(0) }, { loggedAt: hoursAgo(24) }];
    const mixed = { id: "w1", startedAt: hoursAgo(24), workoutExercises: [{ slug: "goblet-squat", sets }] };

    expect(muscleFatigue([mixed], now).quads).toBe(1.5);
  });

  it("counts a Workout passed twice once", () => {
    const repeated = workout("w1", "goblet-squat", 6, hoursAgo(12));

    expect(muscleFatigue([repeated, repeated], now).quads).toBe(4.5);
  });

  it("counts nothing for an Exercise this library doesn't know", () => {
    expect(muscleFatigue([workout("w1", "not-in-this-library", 6, hoursAgo(1))], now)).toEqual({});
  });
});

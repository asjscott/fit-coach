import type { InProgressWorkoutExercise, Set } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { supersetGroups, supersetPartner, supersetTurn } from "./supersets";

const set: Set = { kind: "bodyweight", reps: 10, loggedAt: "2026-11-09T10:00:00.000Z" };

const workoutExercise = (
  id: string,
  slug: string,
  logged: number,
  planned?: { sets: number; supersetWith?: string },
): InProgressWorkoutExercise => ({
  id,
  slug,
  loadType: "bodyweight",
  sets: Array<Set>(logged).fill(set),
  ...(planned && { planned: { ...planned, target: { unit: "reps", reps: 10 } } }),
});

const press = (logged = 0, sets = 3) => workoutExercise("a", "push-up", logged, { sets, supersetWith: "b" });
const row = (logged = 0, sets = 3) => workoutExercise("b", "inverted-row", logged, { sets, supersetWith: "a" });
const squat = workoutExercise("c", "goblet-squat", 0, { sets: 3 });

describe("supersetPartner", () => {
  it("finds the other Exercise of the pair", () => {
    expect(supersetPartner([press(), row(), squat], press())?.id).toBe("b");
    expect(supersetPartner([press(), row(), squat], squat)).toBeUndefined();
  });

  it("leaves an Exercise alone once its partner is removed from the Workout", () => {
    expect(supersetPartner([press(), squat], press())).toBeUndefined();
  });
});

describe("supersetGroups", () => {
  it("groups a pair where its first Exercise is, and every other Exercise on its own", () => {
    const groups = supersetGroups([squat, press(), row()]);
    expect(groups.map((group) => group.map(({ id }) => id))).toEqual([["c"], ["a", "b"]]);
  });

  it("keeps a pair together when the user moves one of it", () => {
    const groups = supersetGroups([press(), squat, row()]);
    expect(groups.map((group) => group.map(({ id }) => id))).toEqual([["a", "b"], ["c"]]);
  });
});

describe("supersetTurn", () => {
  it("alternates, starting with the first Exercise", () => {
    expect(supersetTurn([press(0), row(0)])?.id).toBe("a");
    expect(supersetTurn([press(1), row(0)])?.id).toBe("b");
    expect(supersetTurn([press(1), row(1)])?.id).toBe("a");
  });

  it("goes on with the Exercise that has Sets left once the other is done", () => {
    expect(supersetTurn([press(2, 4), row(2, 2)])?.id).toBe("a");
    expect(supersetTurn([press(3, 4), row(2, 2)])?.id).toBe("a");
  });

  it("is no one's once both are done", () => {
    expect(supersetTurn([press(3), row(3)])).toBeUndefined();
  });
});

import type { InProgressWorkout, Set } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { unfinishedTestsNote } from "./unfinished-tests";

const loggedAt = "2026-10-24T09:00:00.000Z";
const rated = (rpe: number): Set => ({ kind: "external", kg: 14, reps: 5, rpe, loggedAt });
const held: Set = { kind: "timed", seconds: 60, loggedAt };

const finishing = (
  { squat = [], pull = [], core = [] }: { squat?: Set[]; pull?: Set[]; core?: Set[] },
  assessment: InProgressWorkout["assessment"] = "single",
) =>
  unfinishedTestsNote({
    assessment,
    workoutExercises: [
      { id: "1", slug: "goblet-squat", loadType: "external", sets: squat },
      { id: "2", slug: "pull-up", loadType: "bodyweight", sets: pull },
      { id: "3", slug: "plank", loadType: "timed", sets: core },
    ],
  });

describe("unfinishedTestsNote", () => {
  it("names the tests that will be estimated, one short of RPE 9 included", () => {
    expect(finishing({ squat: [rated(7)], core: [held] })?.message).toBe(
      "Goblet squat and Pull-up aren't done, so they'll be estimated.",
    );
    expect(finishing({ squat: [rated(9)], core: [held] })?.message).toBe("Pull-up isn't done, so it'll be estimated.");
  });

  it("says there won't be a result with nothing measured", () => {
    expect(finishing({ squat: [rated(7)] })?.message).toBe(
      "No test has been measured, so there won't be a result. The Workout is kept in your History, and you can start the Assessment again from Today.",
    );
  });

  it("says nothing once every test is measured, or for an old A or B or another Workout", () => {
    const pull: Set[] = [{ kind: "bodyweight", reps: 4, loggedAt }];
    expect(finishing({ squat: [rated(9)], pull, core: [held] })).toBeNull();
    expect(finishing({ core: [held] }, "A")).toBeNull();
    expect(unfinishedTestsNote({ workoutExercises: [] })).toBeNull();
  });
});

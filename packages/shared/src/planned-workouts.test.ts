import { describe, expect, it } from "vitest";
import { PlannedWorkout, SetTarget } from "./planned-workouts";

const plannedWorkout = {
  id: "3b241101-e2bb-4255-8caf-4136c566a962",
  status: "current",
  weekStart: "2026-11-02",
  createdAt: "2026-11-04T09:00:00.000Z",
  plannedExercises: [{ slug: "goblet-squat", sets: 3, target: { unit: "kg", kg: 20, reps: 8 } }],
};

describe("SetTarget", () => {
  it.each([
    ["a load for reps", { unit: "kg", kg: 22.5, reps: 8 }],
    ["reps", { unit: "reps", reps: 12 }],
    ["seconds", { unit: "seconds", seconds: 40 }],
    ["a band level and reps", { unit: "band", level: "medium", reps: 12 }],
  ])("parses %s", (_name, target) => {
    expect(SetTarget.safeParse(target).success).toBe(true);
  });

  it("refuses unrounded seconds, which no Set could log", () => {
    expect(SetTarget.safeParse({ unit: "seconds", seconds: 40.4 }).success).toBe(false);
  });
});

describe("PlannedWorkout", () => {
  it("keeps where a 4th Set fell among the picks, so the phone's copy cuts the same", () => {
    const [goblet] = plannedWorkout.plannedExercises;
    const fourthSet = { ...goblet, sets: 4, fourthSetAfter: 2 };
    const parsed = PlannedWorkout.parse({ ...plannedWorkout, plannedExercises: [fourthSet] });
    expect(parsed.plannedExercises[0].fourthSetAfter).toBe(2);
  });

  it.each(["current", "finished", "replaced"])("parses a plan that is %s", (status) => {
    expect(PlannedWorkout.safeParse({ ...plannedWorkout, status }).success).toBe(true);
  });

  it("refuses a week that isn't a date", () => {
    expect(PlannedWorkout.safeParse({ ...plannedWorkout, weekStart: "2026-W45" }).success).toBe(false);
  });

  it("parses a plan stored before Alternative Exercises, and one with them", () => {
    expect(PlannedWorkout.parse(plannedWorkout).plannedExercises[0]).not.toHaveProperty("alternatives");

    const [squat] = plannedWorkout.plannedExercises;
    const alternatives = { bodyweight_only: [{ slug: "bodyweight-squat", target: { unit: "reps", reps: 15 } }] };
    const withAlternatives = { ...plannedWorkout, plannedExercises: [{ ...squat, alternatives }] };
    expect(PlannedWorkout.parse(withAlternatives).plannedExercises[0].alternatives).toEqual(alternatives);
  });

  it("refuses more than 3 Alternative Exercises", () => {
    const option = { slug: "push-up", target: { unit: "reps", reps: 12 } };
    const [squat] = plannedWorkout.plannedExercises;
    const alternatives = { full_gym: [option, option, option, option] };
    const plan = { ...plannedWorkout, plannedExercises: [{ ...squat, alternatives }] };
    expect(PlannedWorkout.safeParse(plan).success).toBe(false);
  });

  it("parses a plan stored without reasons, and one with them", () => {
    expect(PlannedWorkout.parse(plannedWorkout)).not.toHaveProperty("reasons");

    const reasons = [
      { code: "recovering", muscles: ["quads", "glutes"], lastSetOn: "2026-11-03" },
      { code: "budget-met" },
      { code: "behind", muscles: ["lats", "upper_back"] },
    ];
    expect(PlannedWorkout.parse({ ...plannedWorkout, reasons }).reasons).toEqual(reasons);
  });

  it("refuses a reason it doesn't know, or one missing its Muscles", () => {
    const parse = (reason: object) => PlannedWorkout.safeParse({ ...plannedWorkout, reasons: [reason] }).success;
    expect(parse({ code: "time-cut" })).toBe(false);
    expect(parse({ code: "behind", muscles: [] })).toBe(false);
    expect(parse({ code: "recovering", muscles: ["quads"] })).toBe(false);
  });

  it("refuses a plan with no Exercises", () => {
    expect(PlannedWorkout.safeParse({ ...plannedWorkout, plannedExercises: [] }).success).toBe(false);
  });
});

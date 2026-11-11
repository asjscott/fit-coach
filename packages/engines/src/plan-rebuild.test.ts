import { describe, expect, it } from "vitest";
import { isSamePlan, planInputsKey, planIsDue, type PlanInputs } from "./plan-rebuild";

const inputs: PlanInputs = {
  goal: "build_muscle",
  daysPerWeek: 4,
  workoutLength: "standard",
  injuries: ["knee", "wrist"],
  equipmentProfile: {
    tags: ["dumbbells", "flat_bench"],
    loads: { dumbbells: { kind: "adjustable", minKg: 2.5, maxKg: 40, stepKg: 2.5 } },
  },
};

// Wednesday of the week starting Monday 2 November 2026
const now = new Date("2026-11-04T12:00:00Z");
const timeZone = "America/New_York";

const builtFrom = planInputsKey(inputs);
// Built earlier the same day in New York
const builtAt = "2026-11-04T05:00:00.000Z";
const due = (more: Partial<PlanInputs>, plan = { weekStart: "2026-11-02", builtFrom, builtAt }) =>
  planIsDue(plan, { ...inputs, ...more }, now, timeZone);

describe("planIsDue", () => {
  it("is due when there's no plan, as for a user with an Assessment from before plans", () => {
    expect(planIsDue(null, inputs, now, timeZone)).toBe(true);
  });

  it("isn't due for a plan built this week from the same Profile", () => {
    expect(due({})).toBe(false);
  });

  it("is due at a new week", () => {
    expect(due({}, { weekStart: "2026-10-26", builtFrom, builtAt })).toBe(true);
  });

  it("goes by the Monday in the user's timezone", () => {
    const lateSunday = new Date("2026-11-02T03:30:00Z");
    const plan = { weekStart: "2026-10-26", builtFrom, builtAt: "2026-11-01T20:00:00.000Z" };

    expect(planIsDue(plan, inputs, lateSunday, "America/New_York")).toBe(false);
    expect(planIsDue(plan, inputs, lateSunday, "UTC")).toBe(true);
  });

  it("is due for a plan with no record of what it was built from", () => {
    expect(planIsDue({ weekStart: "2026-11-02", builtAt }, inputs, now, timeZone)).toBe(true);
  });

  // So the recovery filter judges fatigue on the day the user looks, not at the upload
  it("is due on a new day in the user's timezone, for a plan built straight after a Workout", () => {
    const afterTuesdaysWorkout = { weekStart: "2026-11-02", builtFrom, builtAt: "2026-11-03T23:30:00.000Z" };

    expect(planIsDue(afterTuesdaysWorkout, inputs, new Date("2026-11-04T04:30:00Z"), timeZone)).toBe(false);
    expect(planIsDue(afterTuesdaysWorkout, inputs, new Date("2026-11-04T05:30:00Z"), timeZone)).toBe(true);
  });

  it("isn't due for a plan built before the Include jumps switch, while it's off", () => {
    expect(due({ includeJumps: false })).toBe(false);
  });

  it("is due for a plan with no record of when it was built", () => {
    expect(planIsDue({ weekStart: "2026-11-02", builtFrom }, inputs, now, timeZone)).toBe(true);
  });

  it.each<[string, Partial<PlanInputs>]>([
    ["Goal", { goal: "athletic" }],
    ["days per week", { daysPerWeek: 5 }],
    ["usual Workout Length", { workoutLength: "long" }],
    ["injuries", { injuries: ["knee"] }],
    // Story 13 (#105)
    ["Include jumps switch", { includeJumps: true }],
    ["primary Equipment Profile's equipment", { equipmentProfile: { tags: ["dumbbells"], loads: {} } }],
    [
      "primary Equipment Profile's loads",
      {
        equipmentProfile: {
          tags: ["dumbbells", "flat_bench"],
          loads: { dumbbells: { kind: "adjustable", minKg: 2.5, maxKg: 50, stepKg: 2.5 } },
        },
      },
    ],
  ])("is due after a change to %s", (_name, change) => {
    expect(due(change)).toBe(true);
  });

  it("isn't due when only the order of injuries or equipment changed", () => {
    expect(due({ injuries: ["wrist", "knee"] })).toBe(false);
    expect(due({ equipmentProfile: { ...inputs.equipmentProfile, tags: ["flat_bench", "dumbbells"] } })).toBe(false);
  });
});

describe("isSamePlan", () => {
  const plan = {
    weekStart: "2026-11-02",
    plannedExercises: [
      { slug: "goblet-squat", sets: 3, target: { unit: "kg" as const, kg: 20, reps: 8 } },
      { slug: "push-up", sets: 4, fourthSetAfter: 1, target: { unit: "reps" as const, reps: 12 } },
    ],
    cue: "Lift as fast as you can on the way up",
  };

  it("is the same plan rebuilt from unchanged inputs, whatever order its fields come back in", () => {
    const stored = {
      cue: plan.cue,
      plannedExercises: [
        { target: { reps: 8, kg: 20, unit: "kg" as const }, sets: 3, slug: "goblet-squat" },
        plan.plannedExercises[1]!,
      ],
      weekStart: "2026-11-02",
    };

    expect(isSamePlan(stored, plan)).toBe(true);
  });

  it.each<[string, Partial<typeof plan>]>([
    ["another week", { weekStart: "2026-11-09" }],
    ["other Sets", { plannedExercises: [{ ...plan.plannedExercises[0]!, sets: 4 }, plan.plannedExercises[1]!] }],
    ["another order", { plannedExercises: [...plan.plannedExercises].reverse() }],
    ["no cue", { cue: undefined }],
  ])("isn't the same with %s", (_name, change) => {
    expect(isSamePlan(plan, { ...plan, ...change })).toBe(false);
  });
});

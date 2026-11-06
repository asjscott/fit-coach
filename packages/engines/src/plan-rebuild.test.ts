import { describe, expect, it } from "vitest";
import { planInputsKey, planIsDue, type PlanInputs } from "./plan-rebuild";

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
const due = (more: Partial<PlanInputs>, plan = { weekStart: "2026-11-02", builtFrom }) =>
  planIsDue(plan, { ...inputs, ...more }, now, timeZone);

describe("planIsDue", () => {
  it("is due when there's no plan, as for a user with an Assessment from before plans", () => {
    expect(planIsDue(null, inputs, now, timeZone)).toBe(true);
  });

  it("isn't due for a plan built this week from the same Profile", () => {
    expect(due({})).toBe(false);
  });

  it("is due at a new week", () => {
    expect(due({}, { weekStart: "2026-10-26", builtFrom })).toBe(true);
  });

  it("goes by the Monday in the user's timezone", () => {
    const lateSunday = new Date("2026-11-02T03:30:00Z");
    const plan = { weekStart: "2026-10-26", builtFrom };

    expect(planIsDue(plan, inputs, lateSunday, "America/New_York")).toBe(false);
    expect(planIsDue(plan, inputs, lateSunday, "UTC")).toBe(true);
  });

  it("is due for a plan with no record of what it was built from", () => {
    expect(planIsDue({ weekStart: "2026-11-02" }, inputs, now, timeZone)).toBe(true);
  });

  it.each<[string, Partial<PlanInputs>]>([
    ["Goal", { goal: "athletic" }],
    ["days per week", { daysPerWeek: 5 }],
    ["usual Workout Length", { workoutLength: "long" }],
    ["injuries", { injuries: ["knee"] }],
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

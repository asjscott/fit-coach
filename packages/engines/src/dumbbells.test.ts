import { DumbbellLoads, loadInUnit, TOO_MANY_DUMBBELL_LOADS, toKg, type EquipmentProfile } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { exerciseBySlug } from "./data/exercises";
import { dumbbellBuilds } from "./dumbbells";
import { dumbbellBuild, exerciseLoadsKg, isAvailable, nextLoadKg, type ProfileWithLoads } from "./equipment";

const lb = (pounds: number) => toKg(pounds, "lb");
const exercise = (slug: string) => {
  const found = exerciseBySlug(slug);
  if (!found) throw new Error(`No exercise with slug "${slug}"`);
  return found;
};

// Sizes in pounds, each with how many there are; tags and loads are for what else the profile has
const barAndPlates = (
  { bar, bars, plates }: { bar: number; bars: number; plates: Record<string, number> },
  { tags = [], loads = {} }: Partial<ProfileWithLoads> = {},
): ProfileWithLoads => ({
  tags: ["dumbbells", ...tags],
  loads: {
    dumbbells: {
      kind: "bar_and_plates",
      barKg: lb(bar),
      bars,
      plates: Object.entries(plates).map(([size, count]) => ({ kg: lb(Number(size)), count })),
    },
    ...loads,
  },
});

// The spec's reference case (#176)
const reference = barAndPlates({ bar: 4, bars: 2, plates: { 3: 4, 5: 4 } });

const loadsLb = (slug: string, profile: ProfileWithLoads) =>
  exerciseLoadsKg(slug, profile).map((kg) => loadInUnit(kg, "lb"));

// Stories 41 to 44, 47
describe("the loads of bar-and-plates dumbbells", () => {
  it("uses half of each plate count for a two-dumbbell Exercise", () => {
    expect(loadsLb("dumbbell-floor-press", reference)).toEqual([4, 7, 10, 12, 14, 15, 17, 20]);
  });

  it("uses every plate for a one-dumbbell Exercise", () => {
    expect(loadsLb("goblet-squat", reference)).toEqual([
      4, 7, 10, 12, 13, 14, 15, 16, 17, 18, 20, 21, 22, 23, 24, 25, 26, 27, 28, 30, 31, 33, 36,
    ]);
  });

  it("rounds half of an odd count down", () => {
    const threePlates = barAndPlates({ bar: 4, bars: 2, plates: { 3: 3 } });
    expect(loadsLb("dumbbell-floor-press", threePlates)).toEqual([4, 7]);
    expect(loadsLb("goblet-squat", threePlates)).toEqual([4, 7, 10, 13]);
  });

  it("counts a size entered twice together", () => {
    const size = { kg: lb(3), count: 1 };
    const twice: ProfileWithLoads = {
      tags: ["dumbbells"],
      loads: { dumbbells: { kind: "bar_and_plates", barKg: lb(4), bars: 2, plates: [size, size] } },
    };
    expect(loadsLb("dumbbell-floor-press", twice)).toEqual([4, 7]);
  });

  it("offers ends 1.5 kg apart and none further", () => {
    const onePlate = (kg: number): ProfileWithLoads => ({
      tags: ["dumbbells"],
      loads: { dumbbells: { kind: "bar_and_plates", barKg: 2, bars: 1, plates: [{ kg, count: 1 }] } },
    });
    expect(exerciseLoadsKg("goblet-squat", onePlate(1.5))).toEqual([2, 3.5]);
    expect(exerciseLoadsKg("goblet-squat", onePlate(1.6))).toEqual([2]);
  });

  it("makes exact loads from any size in the unit", () => {
    const odd = barAndPlates({ bar: 3.3, bars: 1, plates: { "2.2": 2 } });
    expect(exerciseLoadsKg("goblet-squat", odd)).toEqual([lb(3.3), lb(5.5), lb(7.7)]);
  });

  it("is only the bar with no plates", () => {
    expect(loadsLb("goblet-squat", barAndPlates({ bar: 4, bars: 1, plates: {} }))).toEqual([4]);
  });

  it("keeps barbell plates apart", () => {
    const withBarbell = barAndPlates(
      { bar: 4, bars: 2, plates: { 3: 4 } },
      { tags: ["barbell", "plates"], loads: { barbell: { barKg: lb(45), platesKg: [lb(10)] } } },
    );
    expect(loadsLb("goblet-squat", withBarbell)).toEqual([4, 7, 10, 13, 16]);
    expect(loadsLb("barbell-romanian-deadlift", withBarbell).slice(0, 2)).toEqual([45, 65]);
  });

  it("steps through every load they make", () => {
    const next = (slug: string, pounds: number) =>
      loadInUnit(nextLoadKg(exercise(slug), reference, lb(pounds), 1)!, "lb");
    expect(next("goblet-squat", 12)).toBe(13);
    expect(next("dumbbell-floor-press", 12)).toBe(14);
  });

  it("works out the most plates of any size to the quarter a profile can hold", () => {
    const sizes = Object.fromEntries([0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((size) => [size, 40]));
    const profile = barAndPlates({ bar: 5, bars: 2, plates: sizes });
    expect(DumbbellLoads.safeParse(profile.loads.dumbbells).success).toBe(true);
    const loads = exerciseLoadsKg("goblet-squat", profile);
    expect(loads[1]).toBeCloseTo(lb(5.25), 9);
    // Every quarter of a pound up to 100 kg
    expect(loads).toHaveLength(862);
  });

  it("works out 24 plates of one odd size", () => {
    const loads = exerciseLoadsKg("goblet-squat", barAndPlates({ bar: 4, bars: 2, plates: { 3.17: 24 } }));
    expect(loads).toHaveLength(25);
    expect(loads.at(-1)).toBeCloseTo(lb(80.08), 9);
  });

  it("works out plates in both units", () => {
    const inBoth: ProfileWithLoads = {
      tags: ["dumbbells"],
      loads: {
        dumbbells: {
          kind: "bar_and_plates",
          barKg: 2,
          bars: 2,
          plates: [1.25, 2.5, 5, lb(2.5), lb(5), lb(10)].map((kg) => ({ kg, count: 4 })),
        },
      },
    };
    expect(DumbbellLoads.safeParse(inBoth.loads.dumbbells).success).toBe(true);
    expect(exerciseLoadsKg("goblet-squat", inBoth)).toContain(7);
  });

  // Not by time, which varies by machine: these would take minutes or run out of memory if they were tried
  it.each([
    ["to the hundredth", [1.01, 1.13, 1.27, 1.39, 1.51, 1.63, 1.79, 1.97]],
    ["to the gram", [1.001, 1.103, 1.207, 1.311, 2.223, 3.331, 4.447, 5.557]],
  ])("refuses 8 sizes %s × 20", (_, sizes) => {
    const dumbbells = {
      kind: "bar_and_plates" as const,
      barKg: 2,
      bars: 2,
      plates: sizes.map((kg) => ({ kg, count: 20 })),
    };
    expect(DumbbellLoads.safeParse(dumbbells).error?.issues[0]).toMatchObject({
      path: ["plates"],
      message: TOO_MANY_DUMBBELL_LOADS,
    });
    expect(dumbbellBuilds(dumbbells)).toEqual([]);
  });
});

// Stories 44 and 45
describe("dumbbellBuild", () => {
  const endsLb = (slug: string, profile: ProfileWithLoads, pounds: number) =>
    dumbbellBuild(exercise(slug), profile, lb(pounds))?.map((end) => end.map((kg) => loadInUnit(kg, "lb")));

  it("uses the fewest plates of the most even splits", () => {
    // 10 lb of plates is also 2.5 + 2.5 on each end
    const profile = barAndPlates({ bar: 4, bars: 1, plates: { "2.5": 4, 5: 2 } });
    expect(endsLb("goblet-squat", profile, 14)).toEqual([[5], [5]]);
  });

  it("prefers an even split of more plates to an uneven one of fewer", () => {
    // 4 lb of plates is also 3 and 1
    const profile = barAndPlates({ bar: 4, bars: 1, plates: { 1: 2, 2: 1, 3: 1 } });
    expect(endsLb("goblet-squat", profile, 8)).toEqual([[2], [1, 1]]);
  });

  it("puts the heavier end first, and each end's heaviest plate first", () => {
    expect(endsLb("goblet-squat", reference, 12)).toEqual([[5], [3]]);
    expect(endsLb("goblet-squat", reference, 28)).toEqual([
      [5, 5, 3],
      [5, 3, 3],
    ]);
  });

  it("is the bar alone with nothing on either end", () => {
    expect(endsLb("goblet-squat", reference, 4)).toEqual([[], []]);
  });

  it("is nothing for a load the Exercise's dumbbells don't make", () => {
    expect(endsLb("goblet-squat", reference, 19)).toBeUndefined();
    expect(endsLb("goblet-squat", reference, 36)).toBeDefined();
    expect(endsLb("dumbbell-floor-press", reference, 36)).toBeUndefined();
  });

  it("is nothing for other kinds of dumbbells and an Exercise without them", () => {
    const fixed: ProfileWithLoads = {
      tags: ["dumbbells"],
      loads: { dumbbells: { kind: "fixed", weightsKg: [lb(10)] } },
    };
    expect(endsLb("goblet-squat", fixed, 10)).toBeUndefined();
    expect(endsLb("push-up", reference, 10)).toBeUndefined();
  });
});

// Stories 49 and 51
describe("availability with one bar", () => {
  const oneBar = (rest?: Partial<ProfileWithLoads>) => barAndPlates({ bar: 4, bars: 1, plates: { 3: 4 } }, rest);

  it("leaves out a two-dumbbell Exercise and keeps a one-dumbbell one", () => {
    expect(isAvailable(exercise("dumbbell-floor-press"), oneBar())).toBe(false);
    expect(isAvailable(exercise("goblet-squat"), oneBar())).toBe(true);
    expect(isAvailable(exercise("dumbbell-floor-press"), reference)).toBe(true);
  });

  it("keeps it where other equipment does it, at that equipment's loads", () => {
    const withKettlebells = oneBar({ tags: ["kettlebells"], loads: { kettlebells: { weightsKg: [12] } } });
    expect(isAvailable(exercise("dumbbell-floor-press"), withKettlebells)).toBe(true);
    expect(exerciseLoadsKg("dumbbell-floor-press", withKettlebells)).toEqual([12]);
    expect(isAvailable(exercise("dumbbell-lateral-raise"), oneBar({ tags: ["loop_bands"] }))).toBe(true);
  });

  it.each<[string, EquipmentProfile["loads"]]>([
    ["no loads listed", {}],
    ["a fixed set", { dumbbells: { kind: "fixed", weightsKg: [10] } }],
    ["adjustable dumbbells", { dumbbells: { kind: "adjustable", minKg: 2, maxKg: 20, stepKg: 2 } }],
  ])("doesn't leave it out with %s", (_, loads) => {
    expect(isAvailable(exercise("dumbbell-floor-press"), { tags: ["dumbbells"], loads })).toBe(true);
  });
});

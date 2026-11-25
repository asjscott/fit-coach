import { toKg, type EquipmentProfile, type EquipmentTag, type WeightUnit } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { dumbbellBuildLabel } from "./dumbbell-build";

type Sizes = { bar?: number; plates: [size: number, count: number][]; in?: WeightUnit };

const profile = (
  { bar = 4, plates, in: unit = "lb" }: Sizes,
  tags: EquipmentTag[] = [],
  loads: EquipmentProfile["loads"] = {},
): EquipmentProfile => ({
  id: "p1",
  name: "Home",
  location: "home",
  isPrimary: true,
  tags: ["dumbbells", "flat_bench", ...tags],
  loads: {
    ...loads,
    dumbbells: {
      kind: "bar_and_plates",
      barKg: toKg(bar, unit),
      bars: 2,
      plates: plates.map(([size, count]) => ({ kg: toKg(size, unit), count })),
    },
  },
});

// The spec's reference case
const reference = profile({
  plates: [
    [3, 4],
    [5, 4],
  ],
});

// Story 48 of #176
describe("dumbbellBuildLabel", () => {
  const label = (slug: string, load: string, equipment: EquipmentProfile | undefined = reference) =>
    dumbbellBuildLabel(slug, equipment, "lb")(load);

  it("gives the plates of each end for each of two dumbbells", () => {
    expect(label("dumbbell-curl", "20")).toBe("Each dumbbell: 5 + 3 lb each end");
    expect(label("dumbbell-curl", "17")).toBe("Each dumbbell: 5 + 3 lb one end, 5 lb the other");
  });

  it("says one dumbbell for an Exercise that takes one", () => {
    expect(label("goblet-squat", "36")).toBe("One dumbbell: 5 + 5 + 3 + 3 lb each end");
    expect(label("goblet-squat", "12")).toBe("One dumbbell: 5 lb one end, 3 lb the other");
  });

  it("says when an end is empty, or the bar is alone", () => {
    expect(label("dumbbell-curl", "7")).toBe("Each dumbbell: 3 lb one end, nothing on the other");
    expect(label("dumbbell-curl", "4")).toBe("Each dumbbell: just the bar");
    expect(label("goblet-squat", "4")).toBe("One dumbbell: just the bar");
  });

  it("gives ends of the same weight with different plates one at a time", () => {
    const equipment = profile({
      plates: [
        [2, 1],
        [1, 2],
        [3, 1],
      ],
    });
    expect(label("goblet-squat", "8", equipment)).toBe("One dumbbell: 2 lb one end, 1 + 1 lb the other");
  });

  it("reads the load as typed, with a decimal comma or point", () => {
    expect(label("dumbbell-curl", " 17,0 ")).toBe("Each dumbbell: 5 + 3 lb one end, 5 lb the other");
  });

  it("is nothing for a load the dumbbells don't make, or no load", () => {
    for (const load of ["16", "17.2", "0", "", "abc"]) expect(label("dumbbell-curl", load)).toBeUndefined();
  });

  // The stepper shows loads to the nearest 0.5
  it("finds a load with a finer fraction from the load the stepper shows, or as typed exactly", () => {
    // 4 + 0.625 on each end
    const equipment = profile({ plates: [[0.625, 4]] });
    const build = "Each dumbbell: 0.63 lb each end";
    expect(label("dumbbell-curl", "5.5", equipment)).toBe(build);
    expect(label("dumbbell-curl", "5.25", equipment)).toBe(build);
    expect(label("dumbbell-curl", "5.3", equipment)).toBeUndefined();
  });

  it("prefers the load typed to another that shows the same", () => {
    // 4 + 0.625 on each end is 5.25, which also shows as 5.5
    const equipment = profile({
      plates: [
        [0.625, 2],
        [0.75, 2],
      ],
    });
    expect(label("goblet-squat", "5.5", equipment)).toBe("One dumbbell: 0.75 lb each end");
  });

  it("shows plates sized in another unit in the user's", () => {
    const equipment = profile({ bar: 2, plates: [[1.25, 4]], in: "kg" });
    // 4.5 kg, which the stepper shows as 10 lb
    expect(label("dumbbell-curl", "10", equipment)).toBe("Each dumbbell: 2.76 lb each end");
    expect(dumbbellBuildLabel("dumbbell-curl", equipment, "kg")("4.5")).toBe("Each dumbbell: 1.25 kg each end");
  });

  it("is nothing for other equipment, or an Exercise or profile that isn't known", () => {
    const fixed = profile({ plates: [] });
    fixed.loads.dumbbells = { kind: "fixed", weightsKg: [toKg(20, "lb")] };
    expect(label("dumbbell-curl", "20", fixed)).toBeUndefined();
    const withBarbell = profile({ plates: [[5, 4]] }, ["barbell", "plates", "squat_rack"], {
      barbell: { barKg: toKg(14, "lb"), platesKg: [] },
    });
    expect(label("back-squat", "14", withBarbell)).toBeUndefined();
    expect(label("not-an-exercise", "20")).toBeUndefined();
    expect(dumbbellBuildLabel("dumbbell-curl", undefined, "lb")("20")).toBeUndefined();
  });

  // As the stepper does (#149)
  it("reads a load two kinds of equipment have as the kind the Exercise prefers", () => {
    const withKettlebell = profile({ plates: [[5, 4]] }, ["kettlebells"], {
      kettlebells: { weightsKg: [toKg(14, "lb")] },
    });
    expect(label("front-rack-carry", "14", withKettlebell)).toBeUndefined();
    expect(label("goblet-squat", "14", withKettlebell)).toBe("One dumbbell: 5 lb each end");
  });
});

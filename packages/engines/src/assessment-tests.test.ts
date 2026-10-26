import { PRESETS, type EquipmentTag } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { chooseTests } from "./assessment-tests";
import { EXERCISES } from "./data/exercises";

const preset = (name: string) => {
  const found = PRESETS.find((p) => p.name === name);
  if (!found) throw new Error(`No preset named "${name}"`);
  return found;
};

const slugsOf = (tests: ReturnType<typeof chooseTests>) =>
  Object.fromEntries(Object.entries(tests).map(([pattern, exercise]) => [pattern, exercise?.slug ?? null]));

describe("chooseTests", () => {
  it("gives a full home gym the barbell lifts", () => {
    expect(slugsOf(chooseTests(preset("Full home gym"), []))).toMatchObject({
      squat: "back-squat",
      hinge: "deadlift",
      push: "barbell-bench-press",
    });
  });

  it("gives dumbbells only the dumbbell lifts", () => {
    expect(slugsOf(chooseTests({ tags: ["dumbbells"] }, []))).toMatchObject({
      squat: "goblet-squat",
      hinge: "dumbbell-romanian-deadlift",
      push: "dumbbell-floor-press",
      pull: "one-arm-dumbbell-row",
    });
  });

  it("presses on a bench when there is one", () => {
    expect(chooseTests(preset("Dumbbells + bench"), []).push?.slug).toBe("dumbbell-bench-press");
  });

  it("gives kettlebells the same lifts as dumbbells", () => {
    expect(slugsOf(chooseTests(preset("Kettlebells"), []))).toMatchObject({
      squat: "goblet-squat",
      hinge: "dumbbell-romanian-deadlift",
    });
  });

  it("skips tests flagged against the user's injuries", () => {
    // Back squat and every hinge on the list are flagged for a lower back injury
    expect(slugsOf(chooseTests(preset("Full home gym"), ["lower_back"]))).toMatchObject({
      squat: "goblet-squat",
      hinge: null,
    });
  });

  // The one-arm dumbbell row is the spec's deliberate exception: ranked for pull after the two-sided options
  it("never chooses a band, carry or other one-sided weighted Exercise", () => {
    const profiles: { tags: EquipmentTag[] }[] = [
      ...PRESETS,
      { tags: ["loop_bands", "mini_bands", "tube_bands"] },
      { tags: EQUIPMENT_EVERYTHING },
    ];
    const chosen = profiles.flatMap((profile) =>
      Object.values(chooseTests(profile, [])).filter((exercise) => exercise !== null),
    );
    const refused = chosen.filter(
      (exercise) =>
        exercise.equipmentOptions.some((option) => option.some((tag) => tag.endsWith("_bands"))) ||
        exercise.patterns.some(({ pattern }) => pattern === "carry") ||
        (exercise.unilateral && exercise.loadType === "external" && exercise.slug !== "one-arm-dumbbell-row"),
    );
    expect(chosen.length).toBeGreaterThan(0);
    expect(refused.map((exercise) => exercise.slug)).toEqual([]);
  });
});

const EQUIPMENT_EVERYTHING = [...new Set(EXERCISES.flatMap((e) => e.equipmentOptions.flat()))];

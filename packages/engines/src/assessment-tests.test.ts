import { PRESETS, type EquipmentTag, type Pattern } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { canAssess, chooseTests, partTests, referencePatternOf } from "./assessment-tests";
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

  it("gives a full home gym the pull-up for pull", () => {
    expect(chooseTests(preset("Full home gym"), []).pull?.slug).toBe("pull-up");
  });

  it("gives dumbbells only the dumbbell lifts", () => {
    expect(slugsOf(chooseTests({ tags: ["dumbbells"] }, []))).toMatchObject({
      squat: "goblet-squat",
      hinge: "dumbbell-romanian-deadlift",
      push: "dumbbell-floor-press",
      pull: "one-arm-dumbbell-row",
    });
  });

  it("gives bodyweight only a bodyweight test for every Pattern but pull, which needs a bar or a table", () => {
    expect(slugsOf(chooseTests({ tags: [] }, []))).toEqual({
      squat: "bodyweight-squat",
      hinge: "single-leg-glute-bridge",
      push: "push-up",
      pull: null,
      core: "plank",
    });
    expect(slugsOf(chooseTests({ tags: ["table"] }, [])).pull).toBe("inverted-row");
  });

  it("gives everyone the plank for core", () => {
    const profiles: { tags: EquipmentTag[] }[] = [...PRESETS, { tags: [] }, { tags: EQUIPMENT_EVERYTHING }];
    expect(profiles.map((profile) => chooseTests(profile, []).core?.slug)).toEqual(profiles.map(() => "plank"));
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
    // Back squat and every weighted hinge on the list are flagged for a lower back injury, and pull-up for a
    // shoulder one
    expect(slugsOf(chooseTests(preset("Full home gym"), ["lower_back", "shoulder"]))).toMatchObject({
      squat: "goblet-squat",
      hinge: "single-leg-glute-bridge",
      pull: "one-arm-dumbbell-row",
    });
  });

  it("gives a Pattern no test when nothing on its list is safe", () => {
    // Every push on the list, push-up included, is flagged for a wrist injury
    expect(chooseTests({ tags: [] }, ["wrist"]).push).toBeNull();
    expect(chooseTests(preset("Kettlebells"), ["wrist"]).push).toBeNull();
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

describe("partTests", () => {
  it("gives B's tests in order and names a Pattern with no safe test as untested", () => {
    // Every push on the list, push-up included, is flagged for a wrist injury
    const { exercises, untested } = partTests(chooseTests({ tags: ["table"] }, ["wrist"]), "B");
    expect(exercises.map((exercise) => exercise.slug)).toEqual(["inverted-row"]);
    expect(untested).toEqual(["push"]);
  });
});

describe("canAssess", () => {
  const bodyweight = chooseTests({ tags: ["table"] }, []);

  it("is false with no equipment and a wrist injury: B has neither a pull nor a safe push", () => {
    expect(canAssess(chooseTests({ tags: [] }, ["wrist"]))).toBe(false);
  });

  it("is true while A and B each have a test, though a Pattern has none", () => {
    expect(canAssess({ ...bodyweight, push: null })).toBe(true);
  });

  it("is false when A or B has no test at all", () => {
    expect(canAssess({ ...bodyweight, push: null, pull: null })).toBe(false);
    expect(canAssess({ ...bodyweight, squat: null, hinge: null, core: null })).toBe(false);
  });
});

describe("referencePatternOf", () => {
  it("scales carry from hinge, which has a test, and every tested Pattern from itself", () => {
    expect(referencePatternOf("carry")).toBe("hinge");
    expect(["squat", "hinge", "push", "pull", "core"].map((p) => referencePatternOf(p as Pattern))).toEqual([
      "squat",
      "hinge",
      "push",
      "pull",
      "core",
    ]);
  });
});

const EQUIPMENT_EVERYTHING = [...new Set(EXERCISES.flatMap((e) => e.equipmentOptions.flat()))];

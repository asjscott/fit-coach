import { PRESETS, type EquipmentTag, type InjuryTag, type Pattern } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { assessmentTests, canAssess, chooseTests, referencePatternOf, testSwap } from "./assessment-tests";
import { EXERCISES } from "./data/exercises";

const preset = (name: string) => {
  const found = PRESETS.find((p) => p.name === name);
  if (!found) throw new Error(`No preset named "${name}"`);
  return { ...found, loads: {} };
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
    expect(slugsOf(chooseTests({ tags: ["dumbbells"], loads: {} }, []))).toMatchObject({
      squat: "goblet-squat",
      hinge: "dumbbell-romanian-deadlift",
      push: "dumbbell-floor-press",
      pull: "one-arm-dumbbell-row",
    });
  });

  it("gives bodyweight only a bodyweight test for every Pattern but pull, which needs a bar or a table", () => {
    expect(slugsOf(chooseTests({ tags: [], loads: {} }, []))).toEqual({
      squat: "bodyweight-squat",
      hinge: "single-leg-glute-bridge",
      push: "push-up",
      pull: null,
      core: "plank",
    });
    expect(slugsOf(chooseTests({ tags: ["table"], loads: {} }, [])).pull).toBe("inverted-row");
  });

  it("gives everyone the plank for core", () => {
    const profiles: { tags: EquipmentTag[] }[] = [...PRESETS, { tags: [] }, { tags: EQUIPMENT_EVERYTHING }];
    expect(profiles.map((profile) => chooseTests({ ...profile, loads: {} }, []).core?.slug)).toEqual(
      profiles.map(() => "plank"),
    );
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
    expect(chooseTests({ tags: [], loads: {} }, ["wrist"]).push).toBeNull();
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
      Object.values(chooseTests({ ...profile, loads: {} }, [])).filter((exercise) => exercise !== null),
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

describe("assessmentTests", () => {
  it("tests squat, push, hinge, pull and core in that order", () => {
    const { exercises, untested } = assessmentTests(chooseTests({ tags: ["dumbbells"], loads: {} }, []));
    expect(exercises.map((exercise) => exercise.slug)).toEqual([
      "goblet-squat",
      "dumbbell-floor-press",
      "dumbbell-romanian-deadlift",
      "one-arm-dumbbell-row",
      "plank",
    ]);
    expect(untested).toEqual([]);
  });

  it("names a Pattern with no safe test as untested", () => {
    // Every push on the list, push-up included, is flagged for a wrist injury
    const { exercises, untested } = assessmentTests(chooseTests({ tags: ["table"], loads: {} }, ["wrist"]));
    expect(exercises.map((exercise) => exercise.slug)).toEqual([
      "bodyweight-squat",
      "single-leg-glute-bridge",
      "inverted-row",
      "plank",
    ]);
    expect(untested).toEqual(["push"]);
  });
});

describe("canAssess", () => {
  const none = { squat: null, push: null, hinge: null, pull: null, core: null };

  it("is true with no equipment and a wrist injury, though push and pull have no test", () => {
    expect(canAssess(chooseTests({ tags: [], loads: {} }, ["wrist"]))).toBe(true);
  });

  it("is true while any one Pattern has a test", () => {
    expect(canAssess({ ...none, core: chooseTests({ tags: [], loads: {} }, []).core })).toBe(true);
  });

  it("is false when no Pattern has one", () => {
    expect(canAssess(none)).toBe(false);
  });
});

// Spec #176 story 8
describe("testSwap", () => {
  const pullUp = { slug: "pull-up", sets: [] };
  const swapped = (test: Parameters<typeof testSwap>[0], tags: EquipmentTag[], injuries: InjuryTag[] = []) =>
    testSwap(test, { tags, loads: {} }, injuries)?.slug;

  it("swaps a pull-up with no Set logged for the inverted row", () => {
    expect(swapped(pullUp, ["pull_up_bar"])).toBe("inverted-row");
    expect(swapped(pullUp, ["rings", "table"], ["wrist"])).toBe("inverted-row");
  });

  it("offers none once the pull-up has a Set", () => {
    const sets = [{ kind: "bodyweight" as const, reps: 1, loggedAt: "2026-10-24T09:00:00.000Z" }];
    expect(swapped({ ...pullUp, sets }, ["pull_up_bar"])).toBeUndefined();
  });

  it("offers none when the inverted row isn't available", () => {
    expect(swapped(pullUp, ["rings"])).toBeUndefined();
  });

  it("offers none for the other tests", () => {
    expect(swapped({ slug: "one-arm-dumbbell-row", sets: [] }, ["pull_up_bar", "dumbbells"])).toBeUndefined();
    expect(swapped({ slug: "inverted-row", sets: [] }, ["pull_up_bar"])).toBeUndefined();
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

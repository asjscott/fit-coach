import type { Muscle } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { exerciseBySlug } from "./data/exercises";
import { builtInEquipment, NO_EQUIPMENT } from "./equipment";
import {
  alternativeHolds,
  mobilitySeconds,
  mobilityWorkout,
  recoveryWorkoutKind,
  removeHold,
  swapHold,
  type MobilityOptions,
} from "./mobility-workout";

const now = new Date("2026-11-04T12:00:00.000Z");
const loggedAt = "2026-11-04T06:00:00.000Z";

const options: MobilityOptions = {
  minutes: 20,
  focus: "full_body",
  workouts: [],
  injuries: [],
  equipmentProfile: NO_EQUIPMENT,
  lastExercises: [],
  now,
};
const build = (changes: Partial<MobilityOptions> = {}) => mobilityWorkout({ ...options, ...changes });
const slugs = (changes: Partial<MobilityOptions> = {}) => build(changes).map(({ slug }) => slug);
const areas = (changes: Partial<MobilityOptions> = {}) => slugs(changes).map((slug) => exerciseBySlug(slug)!.area);
const trained = (slug: string, sets: number) => [
  { id: slug, workoutExercises: [{ slug, sets: Array.from({ length: sets }, () => ({ loggedAt })) }] },
];
const loosens = (slug: string, muscle: Muscle) => exerciseBySlug(slug)!.muscles.primary.includes(muscle);

describe("mobilitySeconds", () => {
  it("counts each side's hold and 10 s before each", () => {
    // Pigeon: 45 s a side. Cat-cow: 45 s, not one-sided
    expect(
      mobilitySeconds([
        { slug: "pigeon", sets: 1, target: { unit: "seconds", seconds: 45 } },
        { slug: "cat-cow", sets: 2, target: { unit: "seconds", seconds: 45 } },
      ]),
    ).toBe(110 + 110);
  });
});

describe("mobilityWorkout", () => {
  it("gives the same list for the same input", () => {
    const changes = { workouts: trained("goblet-squat", 6), lastExercises: ["pigeon"] };
    expect(build(changes)).toEqual(build(changes));
  });

  it("plans one Set per hold, for its seconds per side, and never the walk", () => {
    for (const { slug, sets, target } of build()) {
      expect(sets).toBe(1);
      expect(target).toEqual({ unit: "seconds", seconds: exerciseBySlug(slug)!.holdSeconds });
    }
    expect(slugs({ minutes: 30 })).not.toContain("walk");
  });

  const cases = ([10, 20, 30] as const).flatMap((minutes) =>
    (["full_body", "hips_and_legs", "back_and_shoulders"] as const).map((focus) => ({ minutes, focus })),
  );

  it.each(cases)("fits $minutes min of $focus, over by a minute at most", (choice) => {
    const seconds = mobilitySeconds(build(choice));
    expect(seconds).toBeLessThanOrEqual(choice.minutes * 60 + 60);
    // Back and shoulders' holds, all twice, come to 28 min 20 s
    expect(seconds).toBeGreaterThanOrEqual(choice.minutes * 60 - 100);
  });

  it.each([10, 20, 30] as const)("covers all three areas in a Full body of %i min", (minutes) => {
    const all = new Set(areas({ minutes, workouts: trained("goblet-squat", 8) }));
    expect(all).toEqual(new Set(["hips_and_legs", "back_and_spine", "chest_and_shoulders"]));
  });

  it("balances the areas with no recent training", () => {
    const counts = ["hips_and_legs", "back_and_spine", "chest_and_shoulders"].map(
      (area) => areas({ minutes: 10 }).filter((each) => each === area).length,
    );
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });

  it("leans to the Muscles recent training left tired, whatever they are", () => {
    const quads = (workouts: MobilityOptions["workouts"]) =>
      slugs({ workouts }).filter((slug) => loosens(slug, "quads")).length;
    expect(loosens(slugs({ workouts: trained("goblet-squat", 6) })[0], "quads")).toBe(true);
    expect(quads(trained("goblet-squat", 6))).toBeGreaterThan(quads([]));
    expect(loosens(slugs({ workouts: trained("push-up", 6) })[0], "chest")).toBe(true);
  });

  it("forgets training from over two days ago", () => {
    expect(slugs({ workouts: trained("goblet-squat", 6), now: new Date("2026-11-07T12:00:00.000Z") })).toEqual(slugs());
  });

  it("keeps a focus to its areas, most tired first", () => {
    expect(new Set(areas({ focus: "hips_and_legs" }))).toEqual(new Set(["hips_and_legs"]));
    expect(new Set(areas({ focus: "back_and_shoulders" }))).toEqual(new Set(["back_and_spine", "chest_and_shoulders"]));
    const tired = slugs({ focus: "hips_and_legs", workouts: trained("goblet-squat", 6) });
    expect(loosens(tired[0], "quads") || loosens(tired[0], "glutes")).toBe(true);
  });

  it("prefers holds that weren't in the last Mobility", () => {
    const last = slugs({ minutes: 10 });
    expect(slugs({ minutes: 10, lastExercises: last }).filter((slug) => last.includes(slug))).toEqual([]);
  });

  it("repeats a hold, as a second Set, only when the rest run out", () => {
    expect(build({ minutes: 30 }).every(({ sets }) => sets === 1)).toBe(true);
    const few = build({ minutes: 30, focus: "back_and_shoulders", injuries: ["shoulder"] });
    const possible = new Set(few.map(({ slug }) => slug));
    expect(few.length).toBe(possible.size);
    expect(few.every(({ sets }) => sets <= 2)).toBe(true);
    expect(few.some(({ sets }) => sets === 2)).toBe(true);
  });

  it("chooses none to avoid with an injury, and none it has no equipment for", () => {
    const all = slugs({ minutes: 30, injuries: ["knee", "shoulder"] });
    expect(
      all.filter((slug) => exerciseBySlug(slug)!.avoidWith.some((tag) => tag === "knee" || tag === "shoulder")),
    ).toEqual([]);
    const rolls = (equipmentProfile: MobilityOptions["equipmentProfile"]) =>
      slugs({ minutes: 30, equipmentProfile, focus: "hips_and_legs", workouts: trained("goblet-squat", 6) }).filter(
        (slug) => slug.startsWith("foam-roll"),
      );
    expect(rolls(NO_EQUIPMENT)).toEqual([]);
    expect(rolls({ ...builtInEquipment("bodyweight_only", "kg"), tags: ["foam_roller"] })).not.toEqual([]);
  });

  it("is what there is when injuries leave little", () => {
    const injuries: MobilityOptions["injuries"] = [
      "neck",
      "shoulder",
      "elbow",
      "wrist",
      "lower_back",
      "hip",
      "knee",
      "ankle",
    ];
    expect(
      build({ injuries })
        .map(({ slug, sets }) => [slug, sets])
        .sort(),
    ).toEqual([
      ["knees-to-chest", 2],
      ["lying-hamstring-stretch", 2],
    ]);
  });
});

describe("changing a Mobility Workout's holds", () => {
  const hold = (slug: string, seconds = 45, sets = 1) => ({
    slug,
    sets,
    target: { unit: "seconds" as const, seconds },
  });
  const holds = [hold("pigeon"), hold("cat-cow")];
  const alternatives = (changes: Partial<Parameters<typeof alternativeHolds>[0]> = {}) =>
    alternativeHolds({ slug: "pigeon", holds, injuries: [], equipmentProfile: NO_EQUIPMENT, ...changes });

  it("offers those sharing a primary Muscle first, then the rest", () => {
    const shares = alternatives().map((slug) =>
      exerciseBySlug(slug)!.muscles.primary.some((muscle) => loosens("pigeon", muscle)),
    );
    expect(shares[0]).toBe(true);
    expect(shares.at(-1)).toBe(false);
    expect(shares.lastIndexOf(true)).toBeLessThan(shares.indexOf(false));
  });

  it("offers neither the walk nor what's already in the list", () => {
    expect(alternatives()).toContain("figure-four");
    for (const slug of ["walk", "pigeon", "cat-cow"]) expect(alternatives()).not.toContain(slug);
    expect(alternatives({ holds: [...holds, hold("figure-four")] })).not.toContain("figure-four");
  });

  it("offers only what the injuries and equipment allow", () => {
    const roller = { ...builtInEquipment("bodyweight_only", "kg"), tags: ["foam_roller" as const] };
    expect(alternatives()).not.toContain("foam-roll-quads");
    expect(alternatives({ equipmentProfile: roller })).toContain("foam-roll-quads");
    expect(alternatives()).toContain("couch-stretch");
    expect(alternatives({ injuries: ["knee"] })).not.toContain("couch-stretch");
  });

  it("offers none when everything possible is in the list", () => {
    expect(
      alternatives({
        slug: "knees-to-chest",
        holds: [hold("knees-to-chest"), hold("lying-hamstring-stretch")],
        injuries: ["neck", "shoulder", "elbow", "wrist", "lower_back", "hip", "knee", "ankle"],
      }),
    ).toEqual([]);
  });

  it("swaps a hold in its place, for the new one's own time, keeping its Sets", () => {
    const changed = swapHold([hold("pigeon", 45, 2), hold("cat-cow")], "pigeon", "standing-quad-stretch");
    expect(changed.map(({ slug, sets }) => [slug, sets])).toEqual([
      ["standing-quad-stretch", 2],
      ["cat-cow", 1],
    ]);
    expect(changed[0].target).toEqual({
      unit: "seconds",
      seconds: exerciseBySlug("standing-quad-stretch")!.holdSeconds,
    });
  });

  it("removes a hold and its time, but never the last one", () => {
    // Pigeon is 2 × 55 s, cat-cow 55 s
    expect(mobilitySeconds(holds)).toBe(165);
    const left = removeHold(holds, "pigeon");
    expect(mobilitySeconds(left)).toBe(55);
    expect(removeHold(left, "cat-cow")).toEqual(left);
  });
});

describe("recoveryWorkoutKind", () => {
  const kind = (...slugsDone: [string, number][]) =>
    recoveryWorkoutKind({ workoutExercises: slugsDone.map(([slug, sets]) => ({ slug, sets: Array(sets).fill({}) })) });

  it("tells Mobility from Walk and mobility by the walk", () => {
    expect(kind(["cat-cow", 1], ["pigeon", 1])).toBe("mobility");
    expect(kind(["walk", 1], ["pigeon", 1])).toBe("walk-and-mobility");
    expect(kind(["walk", 0], ["pigeon", 1])).toBe("mobility");
  });

  it("is neither for training, a walk alone or nothing done", () => {
    expect(kind(["pigeon", 1], ["plank", 1])).toBeNull();
    expect(kind(["walk", 1])).toBeNull();
    expect(kind(["pigeon", 0])).toBeNull();
  });
});

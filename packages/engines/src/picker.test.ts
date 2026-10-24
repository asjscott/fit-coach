import type { Exercise } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { EXERCISES } from "./data/exercises";
import { pickerRows } from "./picker";

const exercise = (slug: string) => {
  const found = EXERCISES.find((e) => e.slug === slug);
  if (!found) throw new Error(`No exercise with slug "${slug}"`);
  return found;
};

const slugs = (exercises: Exercise[], options: Parameters<typeof pickerRows>[1]) =>
  pickerRows(exercises, options).map((row) => row.exercise.slug);

const library = [exercise("back-squat"), exercise("push-up"), exercise("pull-up")];

describe("pickerRows", () => {
  it("lists Exercises the equipment supports before those it doesn't", () => {
    // No equipment: only the push-up is available
    expect(slugs(library, { tags: [], injuries: [] })).toEqual(["push-up", "back-squat", "pull-up"]);
  });

  it("orders each group by name", () => {
    const mixed = ["pull-up", "plank", "kettlebell-swing", "dead-bug", "back-squat"].map(exercise);
    // Available with no equipment: Dead bug, Plank. Not: Barbell back squat, Kettlebell swing, Pull-up
    expect(slugs(mixed, { tags: [], injuries: [] })).toEqual([
      "dead-bug",
      "plank",
      "back-squat",
      "kettlebell-swing",
      "pull-up",
    ]);
  });

  it("flags Exercises to avoid with the user's injuries but still lists them", () => {
    const rows = pickerRows(library, { tags: [], injuries: ["knee"] });
    expect(rows.map((row) => [row.exercise.slug, row.flagged])).toEqual([
      ["push-up", false],
      ["back-squat", true],
      ["pull-up", false],
    ]);
  });

  it("flags nothing for a user with no injuries", () => {
    expect(pickerRows(library, { tags: [], injuries: [] }).some((row) => row.flagged)).toBe(false);
  });

  it("searches both groups by name, ignoring case and surrounding spaces", () => {
    const some = ["goblet-squat", "plank", "back-squat", "bodyweight-squat", "pull-up"].map(exercise);
    // Bodyweight squat is available with no equipment; Barbell back squat and Goblet squat are not
    expect(slugs(some, { tags: [], injuries: [], search: "  SQUAT " })).toEqual([
      "bodyweight-squat",
      "back-squat",
      "goblet-squat",
    ]);
  });

  it("lists nothing when the search matches nothing", () => {
    expect(slugs(EXERCISES, { tags: [], injuries: [], search: "zzz" })).toEqual([]);
  });

  it("orders names without regard to case", () => {
    const named = (slug: string, name: string): Exercise => ({ ...exercise("plank"), slug, name });
    expect(slugs([named("b", "bravo"), named("a", "Alpha"), named("c", "charlie")], { tags: [], injuries: [] })).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});

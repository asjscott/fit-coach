import { EXERCISES } from "@fit/engines";
import { describe, expect, it } from "vitest";
import { librarySections } from "./library-sections";

const exercise = (slug: string) => {
  const found = EXERCISES.find((e) => e.slug === slug);
  if (!found) throw new Error(`No exercise with slug "${slug}"`);
  return found;
};

// Squat, Push, Pull and Core, given out of Pattern order
const library = ["plank", "pull-up", "push-up", "back-squat", "goblet-squat"].map(exercise);

const titlesAndSlugs = (sections: ReturnType<typeof librarySections>["sections"]) =>
  sections.map((section) => [section.title, section.data.map((row) => row.exercise.slug)]);

describe("librarySections", () => {
  it("groups Exercises by their first movement pattern, in pattern order", () => {
    const { sections } = librarySections(library, { tags: ["dumbbells", "barbell", "pull_up_bar"], showAll: true });
    expect(titlesAndSlugs(sections)).toEqual([
      ["Squat", ["back-squat", "goblet-squat"]],
      ["Push", ["push-up"]],
      ["Pull", ["pull-up"]],
      ["Core", ["plank"]],
    ]);
  });

  it("hides Exercises the equipment doesn't support, and empty groups, unless showing all", () => {
    const { sections } = librarySections(library, { tags: [], showAll: false });
    expect(titlesAndSlugs(sections)).toEqual([
      ["Push", ["push-up"]],
      ["Core", ["plank"]],
    ]);
  });

  it("marks the Exercises the equipment doesn't support when showing all", () => {
    const { sections } = librarySections(library, { tags: [], showAll: true });
    const available = sections.flatMap((s) => s.data).map((row) => [row.exercise.slug, row.available]);
    expect(available).toEqual([
      ["back-squat", false],
      ["goblet-squat", false],
      ["push-up", true],
      ["pull-up", false],
      ["plank", true],
    ]);
  });

  it("counts the Exercises the equipment supports out of the whole library", () => {
    expect(librarySections(library, { tags: [], showAll: false })).toMatchObject({ availableCount: 2, total: 5 });
  });
});

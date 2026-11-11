import type { InjuryTag, PlannedExercise, SetTarget } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { alternativeOptions, withAlternatives, type Candidate } from "./alternative-exercises";
import { EXERCISES, exerciseBySlug } from "./data/exercises";
import { BUILT_IN_EQUIPMENT, isAvailable, isSafeFor } from "./equipment";

const target: SetTarget = { unit: "reps", reps: 10 };

// Everything the user could be given on Bodyweight only. The planner never gives a Recovery Exercise
const bodyweightCandidates = (injuries: InjuryTag[] = []): Candidate[] =>
  EXERCISES.filter(
    (exercise) =>
      !exercise.recovery && isAvailable(exercise, BUILT_IN_EQUIPMENT.bodyweight_only) && isSafeFor(exercise, injuries),
  ).map((exercise) => ({ exercise, target }));

const optionsFor = (slug: string, injuries?: InjuryTag[]) =>
  alternativeOptions(exerciseBySlug(slug)!, bodyweightCandidates(injuries)).map(({ exercise }) => exercise.slug);

const planned = (slug: string): PlannedExercise => ({ slug, sets: 3, target: { unit: "kg", kg: 20, reps: 8 } });

describe("alternativeOptions", () => {
  it("ranks the most shared primary Muscles first, in the same Pattern, and keeps three", () => {
    // A hinge on hamstrings and glutes: the two with both Muscles lead, and the glute bridge, with one, fills the third
    expect(optionsFor("dumbbell-romanian-deadlift")).toEqual([
      "single-leg-glute-bridge",
      "single-leg-romanian-deadlift",
      "glute-bridge",
    ]);
    // Both Muscles only on the pike push-up, then push-ups on triceps alone, of which the first two make the three
    expect(optionsFor("dumbbell-overhead-press")).toEqual(["pike-push-up", "incline-push-up", "push-up"]);
  });

  it("leaves out an Exercise the user's injuries rule out", () => {
    // single-leg-romanian-deadlift avoids ankle injuries, and nothing else on Bodyweight only takes its place
    expect(optionsFor("dumbbell-romanian-deadlift", ["ankle"])).toEqual(["single-leg-glute-bridge", "glute-bridge"]);
  });

  it("relaxes to any shared primary Muscle in any Pattern when the Pattern has no match", () => {
    // A carry on abs and upper_back: Bodyweight only has no carry, so core and pull Exercises count, in library order
    expect(optionsFor("front-rack-carry")).toEqual(["plank", "dead-bug", "hollow-hold"]);
  });

  it("doesn't relax while the Pattern has any match, however few", () => {
    expect(optionsFor("one-arm-dumbbell-row")).toEqual(["table-row", "prone-ytw"]);
  });

  // Story 12: the table row gives lats work a match on Bodyweight only (#101)
  it("gives a lats pull the table row", () => {
    expect(optionsFor("chin-up")).toEqual(["table-row"]);
    expect(optionsFor("lat-pulldown")).toEqual(["table-row"]);
  });

  it("finds nothing when no Exercise shares a primary Muscle", () => {
    expect(optionsFor("dumbbell-lateral-raise")).toEqual([]);
    expect(optionsFor("calf-raise")).toEqual([]);
    expect(optionsFor("dumbbell-curl")).toEqual([]);
  });

  it("leaves nothing when the injuries rule out the only match", () => {
    // Relaxed to any Pattern, an overhead carry's only match is the pike push-up, which avoids shoulder injuries
    expect(optionsFor("overhead-carry")).toEqual(["pike-push-up"]);
    expect(optionsFor("overhead-carry", ["shoulder"])).toEqual([]);
  });
});

describe("withAlternatives", () => {
  const onBodyweight = (plannedExercises: PlannedExercise[], injuries?: InjuryTag[]) =>
    withAlternatives(plannedExercises, {
      bodyweight_only: { possible: bodyweightCandidates(injuries), pickable: bodyweightCandidates(injuries) },
    });

  const slugsOn = (plannedExercise: PlannedExercise | undefined) =>
    plannedExercise?.alternatives?.bodyweight_only?.map(({ slug }) => slug);

  it("gives an Exercise still possible on the equipment itself, and only itself", () => {
    const [pushUp] = onBodyweight([planned("push-up")]);
    expect(pushUp.alternatives).toEqual({ bodyweight_only: [{ slug: "push-up", target }] });
  });

  it("keeps an Exercise that's possible but that a guard took out of what the Coach can pick", () => {
    // As for an Exercise at the rep cap, or past the variety cap
    const possible = bodyweightCandidates();
    const pickable = possible.filter(({ exercise }) => exercise.slug !== "push-up");
    const [pushUp] = withAlternatives([planned("push-up")], { bodyweight_only: { possible, pickable } });
    expect(pushUp.alternatives).toEqual({ bodyweight_only: [{ slug: "push-up", target }] });
  });

  it("doesn't offer a possible Exercise a guard took out as an option for another", () => {
    const possible = bodyweightCandidates();
    const pickable = possible.filter(({ exercise }) => exercise.slug !== "pike-push-up");
    const [press] = withAlternatives([planned("dumbbell-overhead-press")], { bodyweight_only: { possible, pickable } });
    expect(slugsOn(press)).not.toContain("pike-push-up");
  });

  it("gives a replaced Exercise its options with their targets on that equipment", () => {
    const [press] = onBodyweight([planned("dumbbell-overhead-press")]);
    expect(press.alternatives?.bodyweight_only?.[0]).toEqual({ slug: "pike-push-up", target });
    expect(press.target).toEqual({ unit: "kg", kg: 20, reps: 8 });
  });

  it("gives an Exercise with no match an empty list", () => {
    const [raise] = onBodyweight([planned("dumbbell-lateral-raise")]);
    expect(raise.alternatives).toEqual({ bodyweight_only: [] });
  });

  it("doesn't offer an Exercise that stays in the plan as an option for another", () => {
    const [press, pike] = onBodyweight([planned("dumbbell-overhead-press"), planned("pike-push-up")]);
    expect(slugsOn(press)).toEqual(["incline-push-up", "push-up", "decline-push-up"]);
    expect(slugsOn(pike)).toEqual(["pike-push-up"]);
  });

  it("adds a key for each built-in choice it's given and no others", () => {
    expect(onBodyweight([planned("push-up")])[0].alternatives).not.toHaveProperty("full_gym");
  });
});

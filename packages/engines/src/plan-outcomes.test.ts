import { beforeAll, describe, expect, it, vi } from "vitest";

import type { Muscle } from "@fit/shared";
import { addCredits, creditsPerSet, exerciseBySlug, weeklyBudget, type MuscleCredits } from "./index";

type Simulation = typeof import("../scripts/simulate-weeks");
type Run = import("../scripts/simulate-weeks").Run;

const GOAL_NAMES = ["build_muscle", "recomp", "lose_fat", "athletic"] as const;
const fullGym = { lifter: "intermediate", profile: "Full gym" } as const;

// What a user sees over a month, so a change to the score or tables that loses them fails here. Each passes whatever
// order the library is in, so a tie can't quietly decide one
describe.each([
  ["the library's order", false],
  ["the library reversed", true],
])("plan outcomes, with %s", (_, reversed) => {
  let simulate: Simulation["simulate"];

  beforeAll(async () => {
    vi.resetModules();
    if (reversed) {
      vi.doMock("./data/exercises", async (original) => {
        const library = await original<typeof import("./data/exercises")>();
        return { ...library, EXERCISES: [...library.EXERCISES].reverse() };
      });
    } else vi.doUnmock("./data/exercises");
    ({ simulate } = await import("../scripts/simulate-weeks"));
  });

  // Average over the weeks after the first, once a week's Exercises carry on from the last
  const planned = (run: Run) => simulate(run).slice(1);
  const setsPerWeek = (run: Run, slug: string) => {
    const weeks = planned(run);
    const picks = weeks.flat().flatMap(({ exercises }) => exercises);
    const sets = picks.filter((pick) => pick.slug === slug).reduce((total, pick) => total + pick.sets, 0);
    return sets / weeks.length;
  };

  // Story 25: a user with a gym gets real barbell work
  it.each([
    { goal: "build_muscle", days: 4, length: "standard" },
    { goal: "recomp", days: 4, length: "standard" },
    { goal: "build_muscle", days: 6, length: "standard" },
    { goal: "athletic", days: 4, length: "long" },
  ] as const)("$goal at $days days $length has back squat on a Full gym", (run) => {
    expect(setsPerWeek({ ...fullGym, ...run }, "back-squat")).toBeGreaterThanOrEqual(3);
  });

  it.each([
    { goal: "build_muscle", days: 4, length: "standard" },
    { goal: "recomp", days: 4, length: "standard" },
    { goal: "athletic", days: 4, length: "standard" },
  ] as const)("$goal at $days days $length has barbell bench on a Full gym", (run) => {
    expect(setsPerWeek({ ...fullGym, ...run }, "barbell-bench-press")).toBeGreaterThanOrEqual(3);
  });

  // The lowest credited Sets any budgeted Muscle gets in a week
  const lowestMuscle = (run: Run) =>
    Math.min(
      ...planned(run).flatMap((week) => {
        const credits = week
          .flatMap(({ exercises }) => exercises)
          .reduce<MuscleCredits>(
            (total, { slug, sets }) => addCredits(total, creditsPerSet(exerciseBySlug(slug)!), sets),
            {},
          );
        return (Object.keys(weeklyBudget(run.goal, run.days)) as Muscle[]).map((muscle) => credits[muscle] ?? 0);
      }),
    );

  // Story 23: a short week still covers every budgeted Muscle, as far as the 4-Set floor. These three can't, an
  // accepted limit of spec #77: the plan is always built Long, so at Short big barbell lifts leave no time
  const belowFloor = { build_muscle: 3, recomp: 2, lose_fat: 4, athletic: 3 };

  it.each(GOAL_NAMES)("%s at 2 days Short stays where the floor's limit says", (goal) => {
    expect(lowestMuscle({ ...fullGym, goal, days: 2, length: "short" })).toBeGreaterThanOrEqual(belowFloor[goal]);
  });

  it.each(GOAL_NAMES)("%s reaches the floor on every other week", (goal) => {
    for (const days of [2, 3, 4, 5, 6]) {
      for (const length of ["short", "standard", "long"] as const) {
        if (days === 2 && length === "short") continue;
        expect(lowestMuscle({ ...fullGym, goal, days, length }), `${days} days ${length}`).toBeGreaterThanOrEqual(4);
      }
    }
  });
});

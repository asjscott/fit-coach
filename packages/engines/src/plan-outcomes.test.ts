import { beforeAll, describe, expect, it, vi } from "vitest";

type Simulation = typeof import("../scripts/simulate-weeks");
type Run = import("../scripts/simulate-weeks").Run;

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
});

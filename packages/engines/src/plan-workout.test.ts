import { EquipmentTag, type Goal, type WorkingLevel } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { exerciseBySlug, EXERCISES } from "./data/exercises";
import { BUILT_IN_EQUIPMENT, type ProfileWithLoads } from "./equipment";
import { daysWorkout } from "./days-workout";
import { planWorkout, type PlanWorkoutInput } from "./plan-workout";

const dumbbells: ProfileWithLoads = {
  tags: ["dumbbells"],
  loads: { dumbbells: { kind: "adjustable", minKg: 2.5, maxKg: 40, stepKg: 2.5 } },
};

const kg = (slug: string, level: number): WorkingLevel => ({ slug, unit: "kg", kg: level });
const reps = (slug: string, level: number): WorkingLevel => ({ slug, unit: "reps", reps: level });

// All fit a dumbbell profile
const levels: WorkingLevel[] = [
  kg("goblet-squat", 20.3),
  kg("dumbbell-romanian-deadlift", 30),
  kg("one-arm-dumbbell-row", 18),
  reps("push-up", 12),
  kg("dumbbell-lateral-raise", 6),
  { slug: "plank", unit: "seconds", seconds: 40.4 },
];

const plan = (more: Partial<PlanWorkoutInput> = {}) =>
  planWorkout({
    workouts: [],
    now: new Date("2026-11-04T12:00:00Z"),
    timeZone: "America/New_York",
    equipmentProfile: dumbbells,
    injuries: [],
    workingLevels: levels,
    assessment: { bodyWeightKg: 75, patterns: {} },
    goal: "build_muscle",
    daysPerWeek: 4,
    ...more,
  });

const slugs = (more?: Partial<PlanWorkoutInput>) => plan(more).plannedExercises.map(({ slug }) => slug);

// Early on Monday in New York: this week, and long enough ago to leave no fatigue
const earlierThisWeek = "2026-11-02T10:00:00.000Z";
const loggedSets = (count: number, loggedAt = earlierThisWeek) => Array.from({ length: count }, () => ({ loggedAt }));

// Sets of an Exercise logged this week
const logged = (id: string, slug: string, sets: number) => ({
  id,
  startedAt: earlierThisWeek,
  workoutExercises: [{ slug, sets: loggedSets(sets) }],
});

// One Workout this week, with this many Sets of each Exercise
const week = (sets: Record<string, number>) => ({
  id: "this-week",
  startedAt: earlierThisWeek,
  workoutExercises: Object.entries(sets).map(([slug, count]) => ({ slug, sets: loggedSets(count) })),
});

const earlierWorkouts = (count: number) =>
  Array.from({ length: count }, (_, index) => logged(`earlier-${index}`, "plank", 1));

const strength = (referenceStrength: number) => ({ referenceStrength, estimated: true as const });

const withBench = [...levels, kg("dumbbell-floor-press", 20)];

const fullHomeGym: ProfileWithLoads = {
  tags: ["barbell", "plates", "power_rack", "adjustable_bench", "dumbbells", "pull_up_bar"],
  loads: {
    barbell: { barKg: 20, platesKg: [20, 10, 5, 2.5, 1.25] },
    dumbbells: { kind: "adjustable", minKg: 2.5, maxKg: 40, stepKg: 2.5 },
  },
};
const kettlebells: ProfileWithLoads = {
  tags: ["kettlebells"],
  loads: { kettlebells: { weightsKg: [8, 12, 16, 20, 24, 32] } },
};
const assessment = {
  bodyWeightKg: 75,
  patterns: {
    squat: strength(100),
    hinge: strength(120),
    push: strength(70),
    pull: strength(70),
    core: strength(60),
  },
};
const onFullGym = (more: Partial<PlanWorkoutInput> = {}) =>
  slugs({ equipmentProfile: fullHomeGym, workingLevels: [], assessment, ...more });

const isOneSidedLegExercise = (slug: string) => {
  const { unilateral, ballistic, patterns } = exerciseBySlug(slug)!;
  return unilateral && !ballistic && patterns.some(({ pattern }) => pattern === "squat" || pattern === "hinge");
};

describe("planWorkout", () => {
  describe("the Weekly Budget", () => {
    // Quads, hamstrings, chest, lats and upper_back at 14, glutes at 28, side_delts at 6, abs at 7
    const workouts = [
      week({
        "goblet-squat": 14,
        "dumbbell-romanian-deadlift": 14,
        "one-arm-dumbbell-row": 14,
        "dumbbell-floor-press": 14,
        "dumbbell-lateral-raise": 6,
      }),
    ];
    const first = (more: Partial<PlanWorkoutInput>) => slugs({ workouts, workingLevels: withBench, ...more })[0];

    it("goes by the Goal", () => {
      // build_muscle is 2 short of 16 on the bigger Muscles; recomp's 14 is met, so its next Muscle is side_delts
      expect(first({ goal: "build_muscle" })).not.toBe("dumbbell-lateral-raise");
      expect(first({ goal: "recomp" })).toBe("dumbbell-lateral-raise");
    });

    it("goes by the days per week", () => {
      // 14 at 3 days is met; 20 at 6 days isn't
      expect(first({ daysPerWeek: 3 })).toBe("dumbbell-lateral-raise");
      expect(first({ daysPerWeek: 6 })).not.toBe("dumbbell-lateral-raise");
    });
  });

  // Story 12: budgets the library couldn't reach before (#101)
  describe("the library's gaps", () => {
    it("gives Bodyweight only lats work, with the table row", () => {
      const chosen = slugs({ equipmentProfile: BUILT_IN_EQUIPMENT.bodyweight_only, workingLevels: [], assessment });
      expect(chosen).toContain("table-row");
    });

    it("gives the calf raise once calves are furthest behind", () => {
      // Every other Muscle has met build_muscle's budget, and nothing but the calf raise trains calves as primary
      const workouts = [
        week({
          "goblet-squat": 16,
          "dumbbell-romanian-deadlift": 16,
          "one-arm-dumbbell-row": 16,
          "dumbbell-floor-press": 16,
          "dumbbell-lateral-raise": 10,
          plank: 10,
        }),
      ];
      expect(slugs({ workouts, workingLevels: [...withBench, kg("calf-raise", 20)] })[0]).toBe("calf-raise");
    });
  });

  describe("when time can't fit the Weekly Budget", () => {
    it("takes every Muscle to 4 first", () => {
      // All but side_delts have 4. Lateral raise scores 1.15, less than goblet squat's 1.67
      const workouts = [
        week({
          "goblet-squat": 4,
          "dumbbell-romanian-deadlift": 4,
          "one-arm-dumbbell-row": 4,
          "dumbbell-floor-press": 4,
          plank: 4,
        }),
      ];
      expect(slugs({ workouts, workingLevels: withBench })[0]).toBe("dumbbell-lateral-raise");
    });

    it("then takes every Muscle to its min", () => {
      // side_delts have 5 of a min of 6, so lateral raise scores 0.575, less than goblet squat's 0.72
      const workouts = [
        week({
          "goblet-squat": 12,
          "dumbbell-romanian-deadlift": 12,
          "one-arm-dumbbell-row": 12,
          "dumbbell-floor-press": 12,
          "dumbbell-lateral-raise": 5,
        }),
      ];
      expect(slugs({ workouts, workingLevels: withBench })[0]).toBe("dumbbell-lateral-raise");
    });

    it("then moves towards the budget, side_delts and abs last", () => {
      // Lateral raise scores 0.46 at 6 of 10, more than row's 0.29 at 14 of 16, but the bigger Muscles go first
      const workouts = [
        week({
          "goblet-squat": 14,
          "dumbbell-romanian-deadlift": 14,
          "one-arm-dumbbell-row": 14,
          "dumbbell-floor-press": 14,
          "dumbbell-lateral-raise": 6,
        }),
      ];
      const workingLevels = [kg("one-arm-dumbbell-row", 18), kg("dumbbell-lateral-raise", 6)];
      expect(slugs({ workouts, workingLevels }).indexOf("one-arm-dumbbell-row")).toBe(0);
    });

    it("doesn't chase a Muscle the Equipment Profile can't train", () => {
      // Bodyweight only, with no Working Level for the table row: nothing trains lats, whose 0 of 4 mustn't keep the
      // plan from the other Muscles' mins. recomp, as it doesn't budget calves, which a bodyweight squat credits
      const equipmentProfile: ProfileWithLoads = { tags: [], loads: {} };
      const workouts = [
        week({
          "bulgarian-split-squat": 8,
          "single-leg-glute-bridge": 8,
          "push-up": 4,
          "prone-ytw": 8,
          "pike-push-up": 8,
          plank: 4,
        }),
      ];
      const workingLevels = [reps("push-up", 12), reps("bodyweight-squat", 20), reps("prone-ytw", 12)];
      const chosen = slugs({ equipmentProfile, workouts, workingLevels, goal: "recomp" });
      // Chest's 4 of 10 is the furthest behind its min
      expect(chosen[0]).toBe("push-up");
      expect(chosen.some((slug) => exerciseBySlug(slug)?.muscles.primary.includes("lats"))).toBe(false);
    });
  });

  describe("limits", () => {
    const quadExercises = ["goblet-squat", "dumbbell-reverse-lunge", "dumbbell-bulgarian-split-squat", "split-squat"];
    const quadLevels = [
      kg("goblet-squat", 10),
      kg("dumbbell-reverse-lunge", 10),
      kg("dumbbell-bulgarian-split-squat", 10),
      reps("split-squat", 10),
    ];
    const workingLevels = [
      ...quadLevels,
      kg("one-arm-dumbbell-row", 18),
      kg("dumbbell-floor-press", 20),
      kg("dumbbell-romanian-deadlift", 20),
      kg("dumbbell-lateral-raise", 6),
    ];
    // Where each pick for quads falls among the Exercises
    const quadPicks = (chosen: string[]) => chosen.filter((slug) => quadExercises.includes(slug));

    it("leaves half a Muscle's budget for another Workout", () => {
      // Quads get 8 of 16 here: a third pick would make 9, so it waits until every other Muscle has what it can take
      const chosen = slugs({ workingLevels });
      expect(chosen.indexOf(quadPicks(chosen)[2]!)).toBeGreaterThan(chosen.indexOf("dumbbell-lateral-raise"));
    });

    it("has no second Workout to leave for in the week's last one", () => {
      // Three of 4 days done, so the third pick for quads makes 9 of 16 and doesn't wait
      const chosen = slugs({ workingLevels, workouts: earlierWorkouts(3) });
      expect(chosen.indexOf(quadPicks(chosen)[2]!)).toBeLessThan(chosen.indexOf("dumbbell-lateral-raise"));
    });

    it("keeps a Muscle to 10 credited Sets a Workout while anything else helps", () => {
      // The last of 6 days, budget 20: a fourth pick for quads makes 12, so it waits for lateral raise's lower score.
      // Few enough Exercises that all of them fit
      const fewer = [...quadLevels, kg("dumbbell-lateral-raise", 6)];
      const chosen = slugs({ workingLevels: fewer, workouts: earlierWorkouts(5), daysPerWeek: 6 });
      expect(chosen.indexOf(quadPicks(chosen)[3]!)).toBeGreaterThan(chosen.indexOf("dumbbell-lateral-raise"));
    });

    it("gives 3 Sets, and a 4th only when no new Exercise helps, and never a 5th", () => {
      // Row is the only Exercise for lats, which need a 4th Set to reach 4. Four Exercises train quads
      const chosen = plan({ workingLevels }).plannedExercises;
      expect(chosen.find(({ slug }) => slug === "one-arm-dumbbell-row")?.sets).toBe(4);
      expect(chosen.find(({ slug }) => slug === "goblet-squat")?.sets).toBe(3);
      const few = plan({ workingLevels: [kg("goblet-squat", 20)] }).plannedExercises;
      expect(Math.max(...few.map(({ sets }) => sets))).toBe(4);
    });
  });

  describe("a 4th Set picked ahead of a later Exercise", () => {
    // Lateral raise is the 5th Exercise picked, its 4th Set comes after the 7th, and band row is picked after that
    const { plannedExercises } = plan({
      equipmentProfile: BUILT_IN_EQUIPMENT.full_gym,
      workingLevels: [],
      assessment,
      goal: "lose_fat",
      daysPerWeek: 3,
    });
    const raise = plannedExercises.find(({ slug }) => slug === "dumbbell-lateral-raise");

    it("records its place among the picks", () => {
      expect(raise).toMatchObject({ sets: 4, fourthSetAfter: 7 });
      expect(plannedExercises.map(({ slug }) => slug).indexOf("band-row")).toBeGreaterThanOrEqual(7);
    });

    it("outlasts that Exercise in the cut to Standard", () => {
      const today = daysWorkout({ plannedExercises }, { workoutLength: "standard", noSupersets: true }, "lose_fat");
      const setsOf = (slug: string) => today.plannedExercises.find((exercise) => exercise.slug === slug)?.sets;
      expect(setsOf("dumbbell-lateral-raise")).toBe(4);
      expect(setsOf("band-row")).toBe(1);
    });
  });

  describe("a Weekly Budget already met", () => {
    const met = {
      "goblet-squat": 20,
      "dumbbell-romanian-deadlift": 20,
      "one-arm-dumbbell-row": 20,
      "dumbbell-floor-press": 20,
    };

    it("still gives a Workout, as a new week would", () => {
      const workouts = [week({ ...met, "dumbbell-lateral-raise": 20 })];
      const planned = plan({ workouts, workingLevels: withBench }).plannedExercises;
      expect(planned).toEqual(plan({ workingLevels: withBench }).plannedExercises);
      expect(planned.length).toBeGreaterThan(0);
    });

    it("uses the rest of the time once what's left of the budget is planned", () => {
      const chosen = slugs({ workouts: [week(met)], workingLevels: withBench });
      expect(chosen[0]).toBe("dumbbell-lateral-raise");
      expect(chosen.length).toBeGreaterThan(1);
    });
  });

  describe("a new week", () => {
    const nextMonday = new Date("2026-11-09T12:00:00Z");

    it("is built for the new week, with last week's Sets counting for nothing", () => {
      const lastWeek = [logged("last-week", "goblet-squat", 20)];

      const planned = plan({ workouts: lastWeek, now: nextMonday });

      expect(planned.weekStart).toBe("2026-11-09");
      expect(planned.plannedExercises[0].slug).toBe(plan({ now: nextMonday }).plannedExercises[0].slug);
      expect(planned.plannedExercises.some(({ slug }) => slug === "goblet-squat")).toBe(true);
    });

    it("carries no unused budget over from a missed week", () => {
      const twoWeeksOn = new Date("2026-11-16T12:00:00Z");

      expect(slugs({ now: twoWeeksOn })).toEqual(slugs({ now: nextMonday }));
    });
  });

  describe("a missing Working Level", () => {
    const rack: ProfileWithLoads = {
      tags: ["barbell", "plates", "power_rack"],
      loads: { barbell: { barKg: 20, platesKg: [1.25, 2.5, 5, 10, 20] } },
    };
    const assessment = { bodyWeightKg: 75, patterns: { squat: strength(100), hinge: strength(120) } };
    // recomp, which doesn't budget calves: for build_muscle, Exercises crediting them crowd back squat out on a rack
    const planned = (slug: string, more: Partial<PlanWorkoutInput>) =>
      plan({ assessment, goal: "recomp", ...more }).plannedExercises.find((exercise) => exercise.slug === slug);

    it("is worked out from the Reference Strengths, for a profile added after the Assessment", () => {
      // Back squat's maximum is the Reference Strength, and 100 ÷ (1 + 10/30) is 75 kg for 8 reps
      expect(planned("back-squat", { equipmentProfile: rack, workingLevels: [] })?.target).toEqual({
        unit: "kg",
        kg: 75,
        reps: 8,
      });
    });

    it("gives way to a stored Working Level", () => {
      const workingLevels = [kg("back-squat", 60)];
      expect(planned("back-squat", { equipmentProfile: rack, workingLevels })?.target).toMatchObject({ kg: 60 });
    });

    it("replaces a stored Working Level this profile can't do that way", () => {
      // Stored in kg from a dumbbell profile; with only bands, a lateral raise is prescribed by band
      const equipmentProfile: ProfileWithLoads = { tags: ["loop_bands"], loads: { loop_bands: { levels: ["heavy"] } } };
      const workingLevels = [kg("dumbbell-lateral-raise", 6)];
      expect(planned("dumbbell-lateral-raise", { equipmentProfile, workingLevels })?.target).toEqual({
        unit: "band",
        level: "heavy",
        reps: 12,
      });
    });

    it("stays out of the plan when its Pattern has no Reference Strength", () => {
      expect(slugs({ workingLevels: [kg("goblet-squat", 20)] })).not.toContain("dumbbell-romanian-deadlift");
    });
  });

  describe("choosing Exercises", () => {
    it("picks the highest score again and again, counting each pick towards the budget", () => {
      // Scores (credit × remaining ÷ budget, × 1.15 for external load), budgets 16 and 10 for side_delts and abs:
      // goblet squat 2.875; row, RDL 2.3; push-up, plank, bird dog 1.5; lateral raise 1.15. Then, after each pick:
      // goblet squat: row 2.3, RDL 2.084 (glutes 13/16), push-up 1.425, plank, bird dog 1.256
      // row: unchanged
      // RDL: push-up 1.425, lateral raise 1.15, plank 1.163 (glutes 10/16)
      // push-up: lateral raise 1.15, then plank and bird dog tie at 1.0125 (abs 7/10), and bird dog's Sets are longer
      expect(slugs().slice(0, 6)).toEqual([
        "goblet-squat",
        "one-arm-dumbbell-row",
        "dumbbell-romanian-deadlift",
        "push-up",
        "dumbbell-lateral-raise",
        "bird-dog",
      ]);
    });

    it("plans around the Sets logged this week", () => {
      // 16 Sets of goblet squat fill quads and glutes, so it's no longer first
      const workouts = [logged("w1", "goblet-squat", 16)];
      const chosen = slugs({ workouts });
      expect(chosen[0]).toBe("one-arm-dumbbell-row");
      expect(chosen.indexOf("goblet-squat")).toBeGreaterThan(chosen.indexOf("push-up"));
    });

    it("gives each Exercise once", () => {
      const chosen = slugs();
      expect(new Set(chosen).size).toBe(chosen.length);
    });

    it("builds the Long version, filling 55 minutes of Sets without going over", () => {
      // Ten Exercises at 120 s a Set, so a tenth pick would reach 60 minutes
      const workingLevels = [
        "single-arm-overhead-press",
        "goblet-squat",
        "dumbbell-romanian-deadlift",
        "dumbbell-overhead-press",
        "dumbbell-reverse-lunge",
        "dumbbell-single-leg-romanian-deadlift",
        "suitcase-carry",
        "front-rack-carry",
        "renegade-row",
        "farmers-carry",
      ].map((slug) => kg(slug, 20));
      const seconds = plan({ workingLevels }).plannedExercises.reduce(
        (total, { slug, sets }) => total + exerciseBySlug(slug)!.secondsPerSet * sets,
        0,
      );
      expect(seconds).toBeLessThanOrEqual(55 * 60);
      expect(seconds).toBeGreaterThanOrEqual(53 * 60);
    });
  });

  describe("equipment and injuries", () => {
    it("leaves out an Exercise the Equipment Profile can't do", () => {
      const chosen = slugs({ workingLevels: [kg("back-squat", 60), kg("goblet-squat", 20)] });
      expect(chosen).toContain("goblet-squat");
      expect(chosen).not.toContain("back-squat");
    });

    it("leaves out an Exercise that conflicts with an injury", () => {
      expect(slugs({ injuries: ["knee"] })).not.toContain("goblet-squat");
    });

    it("leaves out a barbell Exercise whose Working Level is lighter than the bar", () => {
      const barbell: ProfileWithLoads = {
        tags: ["barbell", "plates", "power_rack"],
        loads: { barbell: { barKg: 20, platesKg: [2.5, 5, 10] } },
      };
      const chosen = slugs({ equipmentProfile: barbell, workingLevels: [kg("back-squat", 15), kg("deadlift", 60)] });
      expect(chosen).toContain("deadlift");
      expect(chosen).not.toContain("back-squat");
    });
  });

  describe("a bodyweight Exercise at the 20-rep cap", () => {
    const withLevels = (...more: WorkingLevel[]) =>
      slugs({ workingLevels: [...levels.filter(({ slug }) => slug !== "push-up"), ...more] });

    it("gives way to its progression", () => {
      const chosen = withLevels(reps("push-up", 20), reps("decline-push-up", 12));
      expect(chosen).toContain("decline-push-up");
      expect(chosen).not.toContain("push-up");
    });

    it("stays below the cap", () => {
      expect(withLevels(reps("push-up", 19), reps("decline-push-up", 12))).toContain("push-up");
    });

    it("stays when its progression can't be done", () => {
      // Goblet squat needs a weight this profile doesn't have
      const workingLevels = [reps("bodyweight-squat", 20), kg("goblet-squat", 20)];
      const chosen = slugs({ workingLevels, equipmentProfile: { tags: [], loads: {} } });
      expect(chosen).toContain("bodyweight-squat");
    });

    it("stays when its progression conflicts with an injury", () => {
      const workingLevels = [reps("bodyweight-squat", 20), kg("goblet-squat", 20)];
      expect(slugs({ workingLevels, injuries: ["knee"] })).toContain("bodyweight-squat");
    });

    it("goes up the ladder past a progression at the cap too", () => {
      const chosen = withLevels(reps("push-up", 20), reps("decline-push-up", 20), reps("archer-push-up", 8));
      expect(chosen).toContain("archer-push-up");
      expect(chosen).not.toContain("push-up");
      expect(chosen).not.toContain("decline-push-up");
    });
  });

  describe("an Exercise's Workouts in a week", () => {
    const workoutsWith = (count: number) =>
      Array.from({ length: count }, (_, index) => logged(`w${index}`, "goblet-squat", 3));

    it.each([
      [2, 1],
      [3, 2],
      [4, 2],
      [5, 3],
      [6, 3],
    ])("stop at half of %i days per week, rounded up", (daysPerWeek, cap) => {
      expect(slugs({ daysPerWeek, workouts: workoutsWith(cap - 1) })).toContain("goblet-squat");
      expect(slugs({ daysPerWeek, workouts: workoutsWith(cap) })).not.toContain("goblet-squat");
    });

    it("count a Workout once however often it's passed", () => {
      const twice = [logged("w1", "goblet-squat", 3), logged("w1", "goblet-squat", 3)];
      expect(slugs({ workouts: twice })).toContain("goblet-squat");
    });

    it("count one Workout once however many times the Exercise is in it", () => {
      const twiceInOne = [
        {
          ...week({}),
          workoutExercises: [
            ...logged("w1", "goblet-squat", 3).workoutExercises,
            ...logged("w1", "goblet-squat", 3).workoutExercises,
          ],
        },
      ];
      expect(slugs({ workouts: twiceInOne })).toContain("goblet-squat");
    });

    it("don't count last week's", () => {
      const lastWeek = [
        { ...logged("w1", "goblet-squat", 3), startedAt: "2026-10-29T18:00:00.000Z" },
        { ...logged("w2", "goblet-squat", 3), startedAt: "2026-10-30T18:00:00.000Z" },
      ];
      expect(slugs({ workouts: lastWeek })).toContain("goblet-squat");
    });

    it("give way when nothing else is left, so a user who trains anyway still gets a Workout", () => {
      const everything = week(Object.fromEntries(EXERCISES.map(({ slug }) => [slug, 1])));
      expect(slugs({ workouts: [everything], daysPerWeek: 2 }).length).toBeGreaterThan(0);
    });
  });

  describe("from week to week", () => {
    // Identical Muscles, Load Type and Set time, so identical scores; the tie order alone would pick reverse lunge
    const workingLevels = [reps("split-squat", 10), reps("reverse-lunge", 10)];
    const firstWith = (startedAt: string, timeZone = "America/New_York") =>
      slugs({ workingLevels, timeZone, workouts: [{ ...logged("w1", "split-squat", 3), startedAt }] })[0];

    it("gives a tie to last week's Exercise", () => {
      expect(slugs({ workingLevels })[0]).toBe("reverse-lunge");
      expect(firstWith("2026-10-29T18:00:00.000Z")).toBe("split-squat");
    });

    it("gives a tie by the tie order when the Exercise was trained before last week", () => {
      expect(firstWith("2026-10-22T18:00:00.000Z")).toBe("reverse-lunge");
    });

    it("goes by the user's timezone for what last week was", () => {
      // Monday 03:00 UTC is still Sunday in New York, the week before last
      expect(firstWith("2026-10-26T03:00:00.000Z", "UTC")).toBe("split-squat");
      expect(firstWith("2026-10-26T03:00:00.000Z")).toBe("reverse-lunge");
    });

    it("keeps the same Exercises when the week after starts from nothing", () => {
      const planned = plan({ workingLevels: withBench }).plannedExercises;
      const done = week(Object.fromEntries(planned.map(({ slug, sets }) => [slug, sets])));
      const nextWeek = plan({ workingLevels: withBench, workouts: [done], now: new Date("2026-11-11T12:00:00Z") });
      expect(nextWeek.plannedExercises).toEqual(planned);
    });
  });

  describe("the Goal", () => {
    it("gives lose_fat different Exercises to build_muscle, with the same inputs", () => {
      // The barbell bench takes 150 s a Set and the floor press 105 s
      expect(onFullGym({ goal: "build_muscle" })).toContain("barbell-bench-press");
      expect(onFullGym({ goal: "lose_fat" })).toContain("dumbbell-floor-press");
      expect(onFullGym({ goal: "lose_fat" })).not.toContain("barbell-bench-press");
    });

    it("ranks a Ballistic Exercise higher for athletic than for build_muscle, with the same inputs", () => {
      const onKettlebells = { equipmentProfile: kettlebells, workingLevels: [], assessment };
      expect(slugs({ ...onKettlebells, goal: "athletic" }).slice(1, 3)).toEqual([
        "single-arm-kettlebell-swing",
        "renegade-row",
      ]);
      expect(slugs({ ...onKettlebells, goal: "build_muscle" }).slice(1, 3)).toEqual([
        "renegade-row",
        "single-arm-kettlebell-swing",
      ]);
    });

    // They share a Goal factor. recomp's smaller Weekly Budget can still tip a close pick on a big Equipment Profile
    it("gives build_muscle and recomp the same Exercises", () => {
      const chosen = (goal: Goal) => slugs({ goal, workingLevels: withBench }).sort();
      expect(chosen("recomp")).toEqual(chosen("build_muscle"));
    });

    it.each(["build_muscle", "recomp", "lose_fat", "athletic"] as const)(
      "prefers loaded Exercises over bodyweight ones on a Full gym-style profile for %s",
      (goal) => {
        const chosen = plan({ goal, equipmentProfile: fullHomeGym, workingLevels: [], assessment }).plannedExercises;
        const setsOf = (loaded: boolean) =>
          chosen
            .filter(({ slug }) => (exerciseBySlug(slug)!.loadType === "external") === loaded)
            .reduce((total, { sets }) => total + sets, 0);
        expect(setsOf(true)).toBeGreaterThan(setsOf(false));
        expect(chosen.map(({ slug }) => slug)).not.toContain("bodyweight-squat");
      },
    );
  });

  describe("the recovery filter", () => {
    // Tuesday evening's leg day, 13 hours before Wednesday noon: quads and glutes at 6 × 35/48 = 4.4, over 4
    const tuesdayEvening = "2026-11-03T23:00:00.000Z";
    const legDay = {
      id: "leg-day",
      startedAt: tuesdayEvening,
      workoutExercises: [{ slug: "goblet-squat", sets: loggedSets(6, tuesdayEvening) }],
    };
    const primaries = (slug: string) => exerciseBySlug(slug)!.muscles.primary;
    const onFullGymPlan = (more: Partial<PlanWorkoutInput> = {}) =>
      plan({ equipmentProfile: fullHomeGym, workingLevels: [], assessment, ...more });

    it("leaves out Exercises for quads and glutes the day after a heavy leg day", () => {
      const chosen = onFullGym({ workouts: [legDay] });
      const forLegs = chosen.filter((slug) =>
        primaries(slug).some((muscle) => muscle === "quads" || muscle === "glutes"),
      );

      expect(chosen.length).toBeGreaterThan(0);
      expect(forLegs).toEqual([]);
    });

    it("still allows them as a secondary Muscle", () => {
      const chosen = onFullGym({ workouts: [legDay] });

      expect(chosen.some((slug) => exerciseBySlug(slug)!.muscles.secondary.includes("glutes"))).toBe(true);
    });

    it("says which Muscles it held back", () => {
      expect([...onFullGymPlan({ workouts: [legDay] }).heldBack].sort()).toEqual(["glutes", "quads"]);
    });

    it("holds nothing back after rest", () => {
      expect(onFullGymPlan().heldBack).toEqual([]);
    });

    it("brings tired Muscles' Exercises back when nothing else helps the budget, so there's always a plan", () => {
      const { plannedExercises, heldBack } = plan({ workingLevels: [kg("goblet-squat", 20)], workouts: [legDay] });

      // Only goblet squat trains quads and glutes here, so it comes back once the core Exercises have done all they can
      expect(plannedExercises.map(({ slug }) => slug)).toContain("goblet-squat");
      expect(heldBack).toEqual([]);
    });
  });

  describe("the reasons", () => {
    // Tuesday evening in New York, the day before Wednesday noon
    const tuesdayEvening = "2026-11-03T23:00:00.000Z";
    const legDay = {
      id: "leg-day",
      startedAt: tuesdayEvening,
      workoutExercises: [{ slug: "goblet-squat", sets: loggedSets(6, tuesdayEvening) }],
    };
    const reasons = (more: Partial<PlanWorkoutInput> = {}) =>
      plan({ equipmentProfile: fullHomeGym, workingLevels: [], assessment, ...more }).reasons;
    const back = { code: "behind", muscles: ["lats", "upper_back"] };

    it("says the Muscles held back are recovering, from the day of their last Set, before the group furthest behind", () => {
      expect(reasons({ workouts: [legDay] })).toEqual([
        { code: "recovering", muscles: ["quads", "glutes"], lastSetOn: "2026-11-03" },
        // Legs are recovering, so the furthest behind of the rest, on a tie the first of Back, Chest, Shoulders, Core
        back,
      ]);
    });

    it("takes the day from the Sets that worked the Muscles as primary, the ones that tired them", () => {
      // Early Wednesday in New York, a plank credits glutes only as secondary
      const wednesdayMorning = "2026-11-04T11:00:00.000Z";
      const plankThisMorning = {
        id: "plank",
        startedAt: wednesdayMorning,
        workoutExercises: [{ slug: "plank", sets: loggedSets(1, wednesdayMorning) }],
      };
      expect(reasons({ workouts: [legDay, plankThisMorning] })[0]).toEqual({
        code: "recovering",
        muscles: ["quads", "glutes"],
        lastSetOn: "2026-11-03",
      });
    });

    it("takes the day from the Sets that credited the Muscles when none worked them as primary", () => {
      // Carries credit abs and upper_back only as secondary: 14 Sets the evening before tire both. This used to throw
      const carries = {
        id: "carries",
        startedAt: tuesdayEvening,
        workoutExercises: [{ slug: "farmers-carry", sets: loggedSets(14, tuesdayEvening) }],
      };
      expect(reasons({ workouts: [carries] })[0]).toEqual({
        code: "recovering",
        muscles: ["upper_back", "abs"],
        lastSetOn: "2026-11-03",
      });
    });

    it("says the Workout is extra once This Week reaches the days per week", () => {
      expect(plan({ workouts: earlierWorkouts(4), daysPerWeek: 4 }).reasons).toEqual([{ code: "budget-met" }]);
    });

    it("gives the usual reasons below the days per week, even with every Muscle's budget met", () => {
      const workouts = [
        week({
          "goblet-squat": 20,
          "dumbbell-romanian-deadlift": 20,
          "one-arm-dumbbell-row": 20,
          "dumbbell-floor-press": 20,
          "dumbbell-lateral-raise": 20,
          plank: 20,
        }),
      ];
      expect(plan({ workouts, workingLevels: withBench }).reasons).toEqual([]);
      expect(plan({ workouts: earlierWorkouts(3), daysPerWeek: 4 }).reasons).toEqual([back]);
    });

    it("doesn't count a Recovery Workout towards the days per week", () => {
      const walk = {
        id: "walk",
        startedAt: earlierThisWeek,
        workoutExercises: [{ slug: "walk", sets: loggedSets(1) }],
      };
      expect(plan({ workouts: [...earlierWorkouts(3), walk], daysPerWeek: 4 }).reasons).toEqual([back]);
    });

    it("names the group furthest behind its budget this week", () => {
      const workouts = [week({ "goblet-squat": 6, "dumbbell-floor-press": 6, "dumbbell-lateral-raise": 4, plank: 4 })];
      expect(plan({ workouts, workingLevels: withBench }).reasons).toEqual([back]);
    });

    it("gives none in a week with nothing done yet, when every group is as far behind", () => {
      expect(reasons()).toEqual([]);
    });

    it("gives the same reasons in the same order for the same inputs", () => {
      expect(reasons({ workouts: [legDay] })).toEqual(reasons({ workouts: [legDay] }));
    });
  });

  describe("the cue", () => {
    it("tells an athletic user to lift fast", () => {
      expect(plan({ goal: "athletic" }).cue).toBe("Lift as fast as you can on the way up");
    });

    it.each(["build_muscle", "recomp", "lose_fat"] as const)("isn't given for %s", (goal) => {
      expect(plan({ goal }).cue).toBeUndefined();
    });
  });

  describe("an athletic user's one-sided squat or hinge Exercise", () => {
    const athletic = (more: Partial<PlanWorkoutInput> = {}) => onFullGym({ goal: "athletic", ...more });

    it("comes first in the plan until it's done, so a short Workout keeps it", () => {
      // The step-up, as it credits calves too
      const chosen = athletic();
      expect(chosen.filter(isOneSidedLegExercise)).toEqual(["dumbbell-step-up"]);
      expect(chosen[0]).toBe("dumbbell-step-up");
    });

    it("isn't given to another Goal", () => {
      // build_muscle picks the step-up on score, as it credits calves, but not first
      expect(onFullGym({ goal: "recomp" }).filter(isOneSidedLegExercise)).toEqual([]);
      expect(isOneSidedLegExercise(onFullGym({ goal: "build_muscle" })[0]!)).toBe(false);
    });

    it("is needed once a week", () => {
      const workouts = [logged("w1", "dumbbell-reverse-lunge", 3)];
      expect(athletic({ workouts }).filter(isOneSidedLegExercise)).toEqual([]);
    });

    it("is needed again the week after", () => {
      const workouts = [{ ...logged("w1", "dumbbell-reverse-lunge", 3), startedAt: "2026-10-29T18:00:00.000Z" }];
      expect(athletic({ workouts }).filter(isOneSidedLegExercise).length).toBe(1);
    });

    it("isn't met by another one-sided Exercise", () => {
      const workouts = [logged("w1", "one-arm-dumbbell-row", 3)];
      expect(athletic({ workouts }).filter(isOneSidedLegExercise).length).toBe(1);
    });

    it("isn't met by a one-sided swing, which doesn't train each leg on its own", () => {
      const workouts = [logged("w1", "single-arm-kettlebell-swing", 3)];
      expect(athletic({ workouts })[0]).toBe("dumbbell-step-up");
    });

    it("isn't a one-sided swing, even when nothing else is available", () => {
      // 16 Sets of RDL fill hamstrings and glutes, so goblet squat outscores the swing unless a rule forces the swing
      const workouts = [logged("w1", "dumbbell-romanian-deadlift", 16)];
      const workingLevels = [kg("single-arm-kettlebell-swing", 16), kg("goblet-squat", 16)];
      expect(slugs({ goal: "athletic", equipmentProfile: kettlebells, workingLevels, workouts })[0]).toBe(
        "goblet-squat",
      );
    });

    it("is left out when none is available", () => {
      const chosen = slugs({ goal: "athletic" });
      expect(chosen.filter(isOneSidedLegExercise)).toEqual([]);
      expect(chosen).toContain("goblet-squat");
    });
  });

  describe("an athletic user's two-legged loaded squat", () => {
    const oneSidedDone = logged("w1", "dumbbell-bulgarian-split-squat", 3);
    const athletic = (more: Partial<PlanWorkoutInput> = {}) =>
      plan({ goal: "athletic", equipmentProfile: fullHomeGym, workingLevels: [], assessment, ...more })
        .plannedExercises;

    it("is back squat, first in the Workout with 3 Sets, where the equipment allows", () => {
      expect(athletic({ workouts: [oneSidedDone] })[0]).toMatchObject({ slug: "back-squat", sets: 3 });
    });

    it("is goblet squat on dumbbells", () => {
      expect(slugs({ goal: "athletic", workouts: [logged("w1", "dumbbell-reverse-lunge", 3)] })[0]).toBe(
        "goblet-squat",
      );
    });

    it("isn't given on bodyweight only", () => {
      const chosen = slugs({
        goal: "athletic",
        equipmentProfile: BUILT_IN_EQUIPMENT.bodyweight_only,
        workingLevels: [],
        assessment,
        workouts: [oneSidedDone],
      });
      expect(chosen.length).toBeGreaterThan(0);
      expect(chosen).not.toContain("goblet-squat");
      expect(chosen).not.toContain("back-squat");
    });

    it("isn't given to another Goal", () => {
      expect(onFullGym({ goal: "build_muscle", workouts: [oneSidedDone] })[0]).not.toBe("back-squat");
    });

    it("waits for a Workout without the one-sided Exercise, so each Workout has at most one required pick", () => {
      expect(athletic()[0]?.slug).toBe("dumbbell-step-up");
    });

    it("is needed once a week", () => {
      const workouts = [oneSidedDone, logged("w2", "back-squat", 3)];
      expect(athletic({ workouts })[0]?.slug).not.toBe("back-squat");
    });

    it("is still needed after goblet squat where the equipment allows back squat", () => {
      const workouts = [oneSidedDone, logged("w2", "goblet-squat", 3)];
      expect(athletic({ workouts })[0]).toMatchObject({ slug: "back-squat", sets: 3 });
    });

    it("is still needed until the week has had 3 Sets of it", () => {
      const short = [oneSidedDone, logged("w2", "back-squat", 2)];
      expect(athletic({ workouts: short })[0]).toMatchObject({ slug: "back-squat", sets: 3 });
      const acrossTwo = [oneSidedDone, logged("w2", "back-squat", 2), logged("w3", "back-squat", 1)];
      expect(athletic({ workouts: acrossTwo })[0]?.slug).not.toBe("back-squat");
    });

    it("waits while quads are recovering, rather than coming back as a last resort", () => {
      // Last Sunday evening's leg day leaves quads over the fatigue limit at Monday noon, with the squat still needed
      // this week. Goblet squat is the only Exercise for quads here, so the recovery filter's last resort brings it
      // back, but not first
      const sundayEvening = "2026-11-02T04:00:00.000Z";
      const legDay = {
        id: "leg-day",
        startedAt: sundayEvening,
        workoutExercises: [{ slug: "goblet-squat", sets: loggedSets(6, sundayEvening) }],
      };
      const now = new Date("2026-11-02T17:00:00Z");
      const chosen = slugs({ goal: "athletic", workingLevels: [kg("goblet-squat", 20)], workouts: [legDay], now });
      expect(chosen).toContain("goblet-squat");
      expect(chosen[0]).not.toBe("goblet-squat");
    });
  });

  describe("Set targets", () => {
    const planned = (slug: string, more?: Parameters<typeof plan>[0]) =>
      plan(more).plannedExercises.find((exercise) => exercise.slug === slug);

    it("prescribes a weighted Exercise's Working Level at the nearest load the profile has, for 8 reps", () => {
      expect(planned("goblet-squat")?.target).toEqual({ unit: "kg", kg: 20, reps: 8 });
    });

    it("prescribes a weighted Exercise to the nearest 0.5 kg when the loads aren't known", () => {
      const equipmentProfile: ProfileWithLoads = { tags: ["dumbbells"], loads: {} };
      expect(planned("goblet-squat", { equipmentProfile })?.target).toEqual({ unit: "kg", kg: 20.5, reps: 8 });
    });

    it("prescribes a bodyweight Exercise's reps", () => {
      expect(planned("push-up")?.target).toEqual({ unit: "reps", reps: 12 });
    });

    it("prescribes a timed Exercise's seconds, whole", () => {
      expect(planned("plank")?.target).toEqual({ unit: "seconds", seconds: 40 });
    });

    it("prescribes a band Exercise's level and reps", () => {
      const workingLevels: WorkingLevel[] = [
        { slug: "dumbbell-lateral-raise", unit: "band", level: "medium", reps: 12 },
      ];
      const equipmentProfile: ProfileWithLoads = { tags: ["loop_bands"], loads: {} };
      expect(planned("dumbbell-lateral-raise", { workingLevels, equipmentProfile })?.target).toEqual({
        unit: "band",
        level: "medium",
        reps: 12,
      });
    });
  });

  describe("Recovery Exercises", () => {
    const recovery = EXERCISES.filter((exercise) => exercise.recovery).map(({ slug }) => slug);
    const recoveryLevels: WorkingLevel[] = recovery.map((slug) => ({ slug, unit: "seconds", seconds: 45 }));

    it("never picks one, even with a Working Level for it", () => {
      const planned = [...slugs({ workingLevels: [...levels, ...recoveryLevels] }), ...onFullGym()];
      expect(planned.filter((slug) => recovery.includes(slug))).toEqual([]);
    });

    it("plans as though a Recovery Workout never happened", () => {
      const recoveryWorkout = {
        id: "recovery",
        startedAt: "2026-11-03T18:00:00.000Z",
        workoutExercises: recovery.map((slug) => {
          const loggedAt = "2026-11-03T18:00:00.000Z";
          return { slug, sets: [{ loggedAt }, { loggedAt }] };
        }),
      };
      const workouts = [week({ "goblet-squat": 3, "one-arm-dumbbell-row": 3 })];
      expect(plan({ workouts: [...workouts, recoveryWorkout], daysPerWeek: 2 })).toEqual(
        plan({ workouts, daysPerWeek: 2 }),
      );
    });
  });

  it("tags the plan with the Monday of its week in the user's timezone", () => {
    // Monday 04:30 UTC is still Sunday in New York
    const lateSunday = new Date("2026-11-02T04:30:00Z");
    expect(plan({ now: lateSunday }).weekStart).toBe("2026-10-26");
    expect(plan({ now: lateSunday, timeZone: "UTC" }).weekStart).toBe("2026-11-02");
  });

  it("gives the same plan for the same inputs", () => {
    const workouts = [logged("w1", "goblet-squat", 3)];
    expect(plan({ workouts })).toEqual(plan({ workouts }));
  });

  it("doesn't depend on the order of its inputs", () => {
    const workouts = [logged("w1", "goblet-squat", 3), logged("w2", "push-up", 3)];
    const reordered = plan({ workouts: [...workouts].reverse(), workingLevels: [...levels].reverse() });
    expect(reordered).toEqual(plan({ workouts }));
  });

  it("breaks a tie the same way every time", () => {
    // Identical Muscles and Load Type, so identical scores
    const workingLevels = [reps("split-squat", 10), reps("reverse-lunge", 10)];
    expect(slugs({ workingLevels })).toEqual(slugs({ workingLevels: [...workingLevels].reverse() }));
  });

  describe("Alternative Exercises", () => {
    // Enough for every Pattern, so the plan fills up as a real one does
    const assessment = {
      bodyWeightKg: 75,
      patterns: {
        squat: strength(100),
        hinge: strength(120),
        push: strength(70),
        pull: strength(70),
        core: strength(60),
      },
    };
    const dumbbellsAndBench: ProfileWithLoads = { ...dumbbells, tags: ["dumbbells", "flat_bench"] };

    // recomp, which doesn't budget calves: for build_muscle the step-up, which credits them, takes the split squat's
    // place
    const planned = (slug: string, more: Partial<PlanWorkoutInput> = {}) =>
      plan({
        equipmentProfile: dumbbellsAndBench,
        workingLevels: [],
        assessment,
        goal: "recomp",
        ...more,
      }).plannedExercises.find((plannedExercise) => plannedExercise.slug === slug);

    it("saves both choices on each Exercise, each with its target", () => {
      const squat = planned("dumbbell-bulgarian-split-squat", {
        workingLevels: [kg("dumbbell-bulgarian-split-squat", 20.3), reps("bulgarian-split-squat", 18)],
      });
      expect(squat?.alternatives?.full_gym).toEqual([
        { slug: "dumbbell-bulgarian-split-squat", target: { unit: "kg", kg: 20, reps: 8 } },
      ]);
      expect(squat?.alternatives?.bodyweight_only?.[0]).toEqual({
        slug: "bulgarian-split-squat",
        target: { unit: "reps", reps: 18 },
      });
    });

    it("gives Full gym's loads, not the primary's, to an Exercise that stays", () => {
      const fixed: ProfileWithLoads = {
        ...dumbbellsAndBench,
        loads: { dumbbells: { kind: "fixed", weightsKg: [16, 24] } },
      };
      const squat = planned("dumbbell-bulgarian-split-squat", {
        equipmentProfile: fixed,
        workingLevels: [kg("dumbbell-bulgarian-split-squat", 20.3)],
      });
      expect(squat?.target).toEqual({ unit: "kg", kg: 24, reps: 8 });
      expect(squat?.alternatives?.full_gym?.[0].target).toEqual({ unit: "kg", kg: 20, reps: 8 });
    });

    it("keeps an Exercise possible on the equipment even when a guard would stop the Coach picking it there", () => {
      // Rep-capped: bodyweight squat's progression, goblet squat, needs a weight the primary lacks, so the plan keeps it
      // at 20 reps. Full gym has the weight, but the Exercise is still possible there, so it stays
      const squat = planned("bodyweight-squat", {
        equipmentProfile: { tags: [], loads: {} },
        workingLevels: [reps("bodyweight-squat", 20), kg("goblet-squat", 20)],
        assessment: { bodyWeightKg: 75, patterns: {} },
      });
      expect(squat?.alternatives?.full_gym).toEqual([{ slug: "bodyweight-squat", target: { unit: "reps", reps: 20 } }]);
    });

    it("works out a target the Assessment didn't store", () => {
      const [best] = planned("dumbbell-bulgarian-split-squat")?.alternatives?.bodyweight_only ?? [];
      expect(best).toMatchObject({ slug: "pistol-squat", target: { unit: "reps" } });
    });

    it("respects the user's injuries", () => {
      const avoidingKnees = (more: Partial<PlanWorkoutInput>) =>
        plan({ equipmentProfile: dumbbellsAndBench, workingLevels: [], assessment, ...more })
          .plannedExercises.flatMap(({ alternatives }) => alternatives?.bodyweight_only ?? [])
          .filter(({ slug }) => exerciseBySlug(slug)?.avoidWith.includes("knee"));

      expect(avoidingKnees({}).length).toBeGreaterThan(0);
      expect(avoidingKnees({ injuries: ["knee"] })).toEqual([]);
    });

    it("saves no option the primary already matches", () => {
      const primary = (equipmentProfile: PlanWorkoutInput["equipmentProfile"]) =>
        plan({ equipmentProfile, workingLevels: [reps("push-up", 12)] }).plannedExercises[0].alternatives ?? {};

      expect(Object.keys(primary({ tags: [], loads: {} }))).toEqual(["full_gym"]);
      expect(Object.keys(primary({ tags: EquipmentTag.options, loads: {} }))).toEqual(["bodyweight_only"]);
    });
  });
});

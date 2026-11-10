import type { BuiltInEquipment, Goal, PlannedExercise, PlannedWorkout, WorkoutLength } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { dayChoices, daysWorkout, equipmentChoices, withChoice, type DayChoices } from "./days-workout";

const planned = (slug: string, sets = 3): PlannedExercise => ({ slug, sets, target: { unit: "reps", reps: 10 } });

// A Long plan in priority order, with each Exercise's secondsPerSet and the running time of its 3 Sets
const longPlan = {
  plannedExercises: [
    planned("goblet-squat"), // 120 s: 360
    planned("one-arm-dumbbell-row"), // 105 s: 675
    planned("dumbbell-romanian-deadlift"), // 120 s: 1035
    planned("push-up"), // 90 s: 1305
    planned("dumbbell-overhead-press"), // 120 s: 1665
    planned("single-leg-romanian-deadlift"), // 105 s: 1980
    planned("bulgarian-split-squat"), // 120 s: 2340
    planned("archer-push-up"), // 120 s: 2700
    planned("cossack-squat"), // 105 s: 3015
  ],
};

const cut = (workoutLength: WorkoutLength) =>
  daysWorkout(longPlan, { workoutLength }).plannedExercises.map(({ slug, sets }) => [slug, sets]);

describe("daysWorkout", () => {
  describe("cutting to the Workout Length", () => {
    it("keeps all of a plan that fits Long", () => {
      expect(cut("long")).toEqual(longPlan.plannedExercises.map(({ slug }) => [slug, 3]));
    });

    it("cuts between Exercises at Standard", () => {
      // 40 minutes after the warm-up is 2400 s: 2340 s reaches the split squat, and 60 s can't take a 120 s Set
      expect(cut("standard")).toEqual([
        ["goblet-squat", 3],
        ["one-arm-dumbbell-row", 3],
        ["dumbbell-romanian-deadlift", 3],
        ["push-up", 3],
        ["dumbbell-overhead-press", 3],
        ["single-leg-romanian-deadlift", 3],
        ["bulgarian-split-squat", 3],
      ]);
    });

    it("drops Sets when only part of an Exercise fits at Short, and nothing later jumps in", () => {
      // 25 minutes after the warm-up is 1500 s: 1305 s reaches the push-up, leaving 195 s for one 120 s Set. The
      // 75 s left would take a Set of a later plank, but it stays out: shorter Lengths keep the highest priority
      const plan = { plannedExercises: [...longPlan.plannedExercises.slice(0, 5), planned("plank")] };
      expect(
        daysWorkout(plan, { workoutLength: "short" }).plannedExercises.map(({ slug, sets }) => [slug, sets]),
      ).toEqual([
        ["goblet-squat", 3],
        ["one-arm-dumbbell-row", 3],
        ["dumbbell-romanian-deadlift", 3],
        ["push-up", 3],
        ["dumbbell-overhead-press", 1],
      ]);
    });

    describe("4th Sets", () => {
      const inPriorityOrder = (...lastExercises: PlannedExercise[]) => ({
        plannedExercises: [
          planned("goblet-squat", 4), // 120 s: 360 for the first three
          planned("plank"), // 75 s: 585
          planned("dumbbell-lateral-raise"), // 60 s: 765
          planned("push-up", 4), // 90 s: 1035
          planned("kettlebell-swing"), // 90 s: 1305
          ...lastExercises,
        ],
      });
      const setsAtShort = (plan: Pick<PlannedWorkout, "plannedExercises">) =>
        Object.fromEntries(
          daysWorkout(plan, { workoutLength: "short" }).plannedExercises.map(({ slug, sets }) => [slug, sets]),
        );

      describe("placed by the planner", () => {
        const placedPlan = {
          plannedExercises: [
            planned("goblet-squat"), // 120 s: 360
            { ...planned("dumbbell-lateral-raise", 4), fourthSetAfter: 2 }, // 60 s: 600 with its 4th
            planned("push-up"), // 90 s: 870
            planned("dumbbell-romanian-deadlift"), // 120 s: 1230
            planned("kettlebell-swing"), // 90 s: 1500, all of Short
            planned("plank"), // 75 s
          ],
        };

        it("are kept ahead of the Exercises picked after them", () => {
          expect(setsAtShort(placedPlan)).toEqual({
            "goblet-squat": 3,
            "dumbbell-lateral-raise": 4,
            "push-up": 3,
            "dumbbell-romanian-deadlift": 3,
            "kettlebell-swing": 3,
          });
        });

        it("keep their place when an Exercise before them drops out", () => {
          // Without the goblet squat's 360 s the plank's 3 Sets fit, and the 4th raise must stay ahead of them
          const stored = {
            plannedExercises: placedPlan.plannedExercises.map((exercise) => ({
              ...exercise,
              alternatives: { bodyweight_only: exercise.slug === "goblet-squat" ? [] : [exercise] },
            })),
          };
          const atShort = (extra: PlannedExercise[]) =>
            daysWorkout(
              { plannedExercises: [...stored.plannedExercises, ...extra] },
              { workoutLength: "short", equipment: "bodyweight_only" },
            );
          const late = planned("dumbbell-overhead-press", 3);
          const today = atShort([{ ...late, alternatives: { bodyweight_only: [late] } }]);
          expect(today.dropped).toEqual(["goblet-squat"]);
          expect(today.plannedExercises.find(({ slug }) => slug === "dumbbell-lateral-raise")?.sets).toBe(4);
          expect(today.plannedExercises.find(({ slug }) => slug === "plank")?.sets).toBe(3);
          expect(today.plannedExercises.find(({ slug }) => slug === "dumbbell-overhead-press")?.sets).toBe(1);
        });

        it("aren't passed on to the day's Exercises", () => {
          const { plannedExercises } = daysWorkout(placedPlan, { workoutLength: "long" });
          expect(plannedExercises.find(({ slug }) => slug === "dumbbell-lateral-raise")).toEqual({
            slug: "dumbbell-lateral-raise",
            sets: 4,
            target: { unit: "reps", reps: 10 },
          });
        });
      });

      it("are cut before a later Exercise's first three Sets on a plan stored without their place", () => {
        // 1500 s at Short: the deadlift's first Set goes ahead of the 4th goblet squat, and the 75 s left takes
        // neither a second deadlift Set nor a 4th Set
        expect(setsAtShort(inPriorityOrder(planned("dumbbell-romanian-deadlift")))).toEqual({
          "goblet-squat": 3,
          plank: 3,
          "dumbbell-lateral-raise": 3,
          "push-up": 3,
          "kettlebell-swing": 3,
          "dumbbell-romanian-deadlift": 1,
        });
      });

      it("come back in priority order once every Exercise's first three fit", () => {
        // The 195 s left after the first three take the 4th goblet squat at 120 s, and 75 s can't take the 4th push-up
        expect(setsAtShort(inPriorityOrder())).toEqual({
          "goblet-squat": 4,
          plank: 3,
          "dumbbell-lateral-raise": 3,
          "push-up": 3,
          "kettlebell-swing": 3,
        });
      });
    });

    it("keeps a plan shorter than the Length as it is", () => {
      const plan = { plannedExercises: [planned("goblet-squat"), planned("push-up", 2)] };
      expect(daysWorkout(plan, { workoutLength: "long" }).plannedExercises).toEqual(plan.plannedExercises);
    });
  });

  describe("estimated time", () => {
    it("is the warm-up and the Sets kept", () => {
      expect(daysWorkout(longPlan, { workoutLength: "long" }).estimatedSeconds).toBe(3315);
      expect(daysWorkout(longPlan, { workoutLength: "standard" }).estimatedSeconds).toBe(2640);
      expect(daysWorkout(longPlan, { workoutLength: "short" }).estimatedSeconds).toBe(1725);
    });

    it("shows how short a plan under the Length is", () => {
      const plan = { plannedExercises: [planned("goblet-squat")] };
      expect(daysWorkout(plan, { workoutLength: "long" }).estimatedSeconds).toBe(660);
    });
  });

  describe("choosing again", () => {
    it("gives the same Workout on going back, and leaves the plan as it was", () => {
      const stored = structuredClone(longPlan);
      const first = daysWorkout(stored, { workoutLength: "standard" });
      daysWorkout(stored, { workoutLength: "short" });
      expect(daysWorkout(stored, { workoutLength: "standard" })).toEqual(first);
      expect(stored).toEqual(longPlan);
    });
  });

  describe("the choice for one Workout", () => {
    const usual = { workoutLength: "standard" } as const;

    it("is the usual Workout Length until the user changes it", () => {
      expect(dayChoices("plan-1", usual, null)).toEqual(usual);
    });

    it("is the user's for the Planned Workout they made it on", () => {
      const made = { plannedWorkoutId: "plan-1", choices: { workoutLength: "short" } } as const;
      expect(dayChoices("plan-1", usual, made)).toEqual({ workoutLength: "short" });
    });

    it("returns to the usual Workout Length on the next plan", () => {
      const made = { plannedWorkoutId: "plan-1", choices: { workoutLength: "short" } } as const;
      expect(dayChoices("plan-2", usual, made)).toEqual(usual);
    });
  });

  describe("equipment for one Workout", () => {
    const kg: PlannedExercise["target"] = { unit: "kg", kg: 20, reps: 8 };
    const reps = (count: number): PlannedExercise["target"] => ({ unit: "reps", reps: count });
    const option = (slug: string, count = 10) => ({ slug, target: reps(count) });

    // A dumbbell plan: the row and press have Alternative Exercises on Bodyweight only, the push-up stays, and the
    // lateral raise has none. All stay on Full gym, the row at Full gym's load
    const stored = {
      plannedExercises: [
        {
          slug: "one-arm-dumbbell-row",
          sets: 4,
          target: kg,
          alternatives: {
            full_gym: [{ slug: "one-arm-dumbbell-row", target: { unit: "kg", kg: 22.5, reps: 8 } }],
            bodyweight_only: [option("prone-ytw")],
          },
        },
        {
          slug: "dumbbell-overhead-press",
          sets: 3,
          target: kg,
          alternatives: {
            full_gym: [{ slug: "dumbbell-overhead-press", target: kg }],
            bodyweight_only: [option("pike-push-up", 8), option("incline-push-up"), option("decline-push-up")],
          },
        },
        {
          slug: "push-up",
          sets: 3,
          target: reps(12),
          alternatives: { full_gym: [option("push-up", 12)], bodyweight_only: [option("push-up", 12)] },
        },
        {
          slug: "dumbbell-lateral-raise",
          sets: 3,
          target: kg,
          alternatives: { full_gym: [{ slug: "dumbbell-lateral-raise", target: kg }], bodyweight_only: [] },
        },
      ],
    } satisfies { plannedExercises: PlannedExercise[] };

    const on = (equipment: BuiltInEquipment, more: Partial<DayChoices> = {}) =>
      daysWorkout(stored, { workoutLength: "long", equipment, ...more });

    it("replaces what isn't possible with its best Alternative Exercise, with the same Sets", () => {
      const row = on("bodyweight_only").plannedExercises.find(({ slug }) => slug === "prone-ytw");
      expect(row).toMatchObject({ sets: 4, target: reps(10), replaces: "one-arm-dumbbell-row" });
    });

    it("keeps an Exercise still possible, in place and with nothing to choose", () => {
      const pushUp = on("bodyweight_only").plannedExercises.find(({ slug }) => slug === "push-up");
      expect(pushUp).toEqual({ slug: "push-up", sets: 3, target: reps(12) });
    });

    it("uses the target for the equipment on an Exercise that stays", () => {
      expect(on("full_gym").plannedExercises.find(({ slug }) => slug === "one-arm-dumbbell-row")?.target).toEqual({
        unit: "kg",
        kg: 22.5,
        reps: 8,
      });
    });

    it("offers the other options for a replaced Exercise", () => {
      const press = on("bodyweight_only").plannedExercises.find(
        ({ replaces }) => replaces === "dumbbell-overhead-press",
      );
      expect(press?.slug).toBe("pike-push-up");
      expect(press?.otherOptions).toEqual([option("incline-push-up"), option("decline-push-up")]);
    });

    it("says which Exercises dropped out", () => {
      expect(on("bodyweight_only").dropped).toEqual(["dumbbell-lateral-raise"]);
      expect(on("full_gym").dropped).toEqual([]);
    });

    it("times the Workout from the Exercises actually in it", () => {
      // Warm-up 300 s, then prone-ytw 4 × 60, pike push-up 3 × 90 and push-up 3 × 90
      expect(on("bodyweight_only").estimatedSeconds).toBe(1080);
    });

    it("gives a picked option its place, and offers the best one in exchange", () => {
      const alternativePicks = { "dumbbell-overhead-press": "decline-push-up" };
      const press = on("bodyweight_only", { alternativePicks }).plannedExercises.find(
        ({ replaces }) => replaces === "dumbbell-overhead-press",
      );
      expect(press).toMatchObject({ slug: "decline-push-up", sets: 3 });
      expect(press?.otherOptions).toEqual([option("pike-push-up", 8), option("incline-push-up")]);
    });

    it("ignores a pick that isn't an option on this equipment", () => {
      const alternativePicks = { "dumbbell-overhead-press": "decline-push-up" };
      expect(on("full_gym", { alternativePicks })).toEqual(on("full_gym"));
    });

    describe("two Exercises with the same best option", () => {
      const shared = (slug: string, ...options: string[]): PlannedExercise => ({
        slug,
        sets: 3,
        target: kg,
        alternatives: { bodyweight_only: options.map((other) => option(other)) },
      });
      const slugs = (plannedExercises: PlannedExercise[], more: Partial<DayChoices> = {}) => {
        const today = daysWorkout(
          { plannedExercises },
          { workoutLength: "long", equipment: "bodyweight_only", ...more },
        );
        return { slugs: today.plannedExercises.map(({ slug }) => slug), dropped: today.dropped };
      };

      it("gives the lower priority one its next option", () => {
        const plan = [
          shared("goblet-squat", "split-squat", "reverse-lunge"),
          shared("back-squat", "split-squat", "pistol-squat"),
        ];
        expect(slugs(plan).slugs).toEqual(["split-squat", "pistol-squat"]);
      });

      it("drops the lower priority one when its options run out, so no Exercise is in the Workout twice", () => {
        const plan = [shared("one-arm-dumbbell-row", "prone-ytw"), shared("seated-cable-row", "prone-ytw")];
        expect(slugs(plan)).toEqual({ slugs: ["prone-ytw"], dropped: ["seated-cable-row"] });
      });

      it("keeps the one the user picked", () => {
        const plan = [
          shared("goblet-squat", "split-squat", "reverse-lunge"),
          shared("back-squat", "split-squat", "pistol-squat"),
        ];
        expect(slugs(plan, { alternativePicks: { "back-squat": "split-squat" } }).slugs).toEqual([
          "reverse-lunge",
          "split-squat",
        ]);
      });

      it("doesn't offer an option another Exercise is using", () => {
        const plan = [
          shared("goblet-squat", "split-squat", "reverse-lunge"),
          shared("back-squat", "split-squat", "reverse-lunge", "pistol-squat"),
        ];
        const today = daysWorkout({ plannedExercises: plan }, { workoutLength: "long", equipment: "bodyweight_only" });
        expect(today.plannedExercises.map(({ otherOptions }) => otherOptions?.map(({ slug }) => slug))).toEqual([
          [],
          ["pistol-squat"],
        ]);
      });
    });

    it("combines with the Workout Length, cutting what's left after the equipment", () => {
      // At Short the press gets one Set. Without the goblet squat's 360 s, all 3 of its Sets fit in the 1305 s left
      const [squat, ...others] = longPlan.plannedExercises.slice(0, 5);
      const plan = { plannedExercises: [{ ...squat, alternatives: { bodyweight_only: [] } }, ...others] };
      const setsOfPress = (choices: DayChoices) =>
        daysWorkout(plan, choices).plannedExercises.find(({ slug }) => slug === "dumbbell-overhead-press")?.sets;

      expect(setsOfPress({ workoutLength: "short" })).toBe(1);
      expect(setsOfPress({ workoutLength: "short", equipment: "bodyweight_only" })).toBe(3);
    });

    it("cuts a replacement's 4th Set like any other", () => {
      // 1500 s at Short. prone-ytw's three 60 s Sets and the other four Exercises take 1485 s, so its 4th can't fit
      const plan = { plannedExercises: [stored.plannedExercises[0], ...longPlan.plannedExercises.slice(2, 6)] };
      const today = daysWorkout(plan, { workoutLength: "short", equipment: "bodyweight_only" });
      expect(today.plannedExercises.find(({ slug }) => slug === "prone-ytw")?.sets).toBe(3);
      expect(today.plannedExercises.find(({ slug }) => slug === "single-leg-romanian-deadlift")?.sets).toBe(3);
    });

    it("restores the plan exactly on going back", () => {
      const untouched = structuredClone(stored);
      const usual = daysWorkout(stored, { workoutLength: "standard" });

      daysWorkout(stored, { workoutLength: "standard", equipment: "bodyweight_only" });
      daysWorkout(stored, { workoutLength: "short", equipment: "full_gym" });

      expect(daysWorkout(stored, { workoutLength: "standard" })).toEqual(usual);
      expect(usual.plannedExercises.map(({ slug, sets, target }) => [slug, sets, target])).toEqual(
        stored.plannedExercises.map(({ slug, sets, target }) => [slug, sets, target]),
      );
      expect(usual.dropped).toEqual([]);
      expect(stored).toEqual(untouched);
    });

    it("ignores picks on the primary Equipment Profile", () => {
      const alternativePicks = { "dumbbell-overhead-press": "decline-push-up" };
      expect(daysWorkout(stored, { workoutLength: "long", alternativePicks })).toEqual(
        daysWorkout(stored, { workoutLength: "long" }),
      );
    });

    describe("the choices on offer", () => {
      it("leave out one that only changes a load, as every Exercise stays", () => {
        expect(equipmentChoices(stored)).toEqual(["bodyweight_only"]);
      });

      it("hide one the primary matches, which the plan didn't save", () => {
        const alternatives = { full_gym: [option("decline-push-up")] };
        const plan = { plannedExercises: [{ ...planned("push-up"), alternatives }] };
        expect(equipmentChoices(plan)).toEqual(["full_gym"]);
      });

      it("hide one that changes no Exercise", () => {
        const plan = {
          plannedExercises: [
            {
              ...planned("push-up"),
              alternatives: { full_gym: [option("push-up")], bodyweight_only: [option("decline-push-up")] },
            },
          ],
        };
        expect(equipmentChoices(plan)).toEqual(["bodyweight_only"]);
      });

      it("offer one that only drops an Exercise", () => {
        const plan = { plannedExercises: [{ ...planned("push-up"), alternatives: { bodyweight_only: [] } }] };
        expect(equipmentChoices(plan)).toEqual(["bodyweight_only"]);
      });

      it("are none on a plan stored before Alternative Exercises", () => {
        expect(equipmentChoices(longPlan)).toEqual([]);
      });
    });

    it("leaves a plan stored before Alternative Exercises as it is", () => {
      const today = daysWorkout(longPlan, { workoutLength: "long", equipment: "bodyweight_only" });
      expect(today).toEqual(daysWorkout(longPlan, { workoutLength: "long" }));
    });

    describe("choosing", () => {
      const usual = { workoutLength: "standard" } as const;

      it("adds to what's already chosen, so Length and equipment combine", () => {
        const length = withChoice(null, "plan-1", { workoutLength: "short" });
        const both = withChoice(length, "plan-1", { equipment: "bodyweight_only" });
        expect(dayChoices("plan-1", usual, both)).toEqual({ workoutLength: "short", equipment: "bodyweight_only" });
      });

      it("goes back to the primary Equipment Profile and keeps the Length", () => {
        const made = withChoice(null, "plan-1", { workoutLength: "short", equipment: "full_gym" });
        const back = withChoice(made, "plan-1", { equipment: undefined });
        expect(dayChoices("plan-1", usual, back).equipment).toBeUndefined();
        expect(dayChoices("plan-1", usual, back).workoutLength).toBe("short");
      });

      it("doesn't carry over to the next plan", () => {
        const made = withChoice(null, "plan-1", { equipment: "bodyweight_only" });
        expect(dayChoices("plan-2", usual, made)).toEqual(usual);
        expect(withChoice(made, "plan-2", { workoutLength: "short" }).choices).toEqual({ workoutLength: "short" });
      });
    });
  });

  describe("after the check-in", () => {
    const badNight = { sleep: 1, energy: 2, soreness: 5 }; // readiness 4: keeps 0.7
    const tired = { sleep: 3, energy: 3, soreness: 3 }; // 9: keeps 0.85
    const allFours = { sleep: 4, energy: 4, soreness: 4 }; // 10: keeps everything
    const setsOf = (choices: DayChoices, plan: Pick<PlannedWorkout, "plannedExercises"> = longPlan) =>
      daysWorkout(plan, choices).plannedExercises.map(({ slug, sets }) => [slug, sets]);

    it("changes nothing with no check-in, or with all 4s", () => {
      const usual = daysWorkout(longPlan, { workoutLength: "long" });
      expect(usual.lighter).toBe(false);
      expect(daysWorkout(longPlan, { workoutLength: "long", checkIn: allFours })).toEqual(usual);
    });

    it("keeps 0.7 of the Sets after a bad night, taking the lowest priority first", () => {
      // 27 Sets at Long keep 19: six whole Exercises and the split squat's first Set
      expect(setsOf({ workoutLength: "long", checkIn: badNight })).toEqual([
        ["goblet-squat", 3],
        ["one-arm-dumbbell-row", 3],
        ["dumbbell-romanian-deadlift", 3],
        ["push-up", 3],
        ["dumbbell-overhead-press", 3],
        ["single-leg-romanian-deadlift", 3],
        ["bulgarian-split-squat", 1],
      ]);
      expect(daysWorkout(longPlan, { workoutLength: "long", checkIn: badNight }).lighter).toBe(true);
    });

    it("keeps 0.85 when tired", () => {
      // 23 of 27: the archer push-up keeps 2 and the cossack squat goes
      expect(setsOf({ workoutLength: "long", checkIn: tired }).slice(-2)).toEqual([
        ["bulgarian-split-squat", 3],
        ["archer-push-up", 2],
      ]);
    });

    it("trims what the Length left, at every Length", () => {
      // Standard keeps 21 Sets, then 15 of them; Short keeps 13, then 9
      expect(setsOf({ workoutLength: "standard", checkIn: badNight })).toEqual([
        ["goblet-squat", 3],
        ["one-arm-dumbbell-row", 3],
        ["dumbbell-romanian-deadlift", 3],
        ["push-up", 3],
        ["dumbbell-overhead-press", 3],
      ]);
      expect(setsOf({ workoutLength: "short", checkIn: badNight })).toEqual([
        ["goblet-squat", 3],
        ["one-arm-dumbbell-row", 3],
        ["dumbbell-romanian-deadlift", 3],
      ]);
    });

    it("takes a 4th Set in the order the planner added it", () => {
      // 10 Sets keep 7: the lateral raise's 4th Set came after the push-up, so it goes before the push-up's Sets
      const plan = {
        plannedExercises: [
          planned("goblet-squat"),
          { ...planned("dumbbell-lateral-raise", 4), fourthSetAfter: 3 },
          planned("push-up"),
        ],
      };
      expect(Object.fromEntries(setsOf({ workoutLength: "long", checkIn: badNight }, plan))).toEqual({
        "goblet-squat": 3,
        "dumbbell-lateral-raise": 3,
        "push-up": 1,
      });
    });

    it("times the Workout from the Sets left", () => {
      // Warm-up 300 s and the 19 Sets: 1980 s for six Exercises and 120 s for the split squat
      expect(daysWorkout(longPlan, { workoutLength: "long", checkIn: badNight }).estimatedSeconds).toBe(2400);
    });

    it("combines with equipment, trimming what the equipment left", () => {
      // With no goblet squat on Bodyweight only, 18 Sets keep 13: the split squat's first Set is the 13th
      const [squat, ...others] = longPlan.plannedExercises.slice(0, 7);
      const plan = { plannedExercises: [{ ...squat, alternatives: { bodyweight_only: [] } }, ...others] };
      expect(setsOf({ workoutLength: "long", equipment: "bodyweight_only", checkIn: badNight }, plan)).toEqual([
        ["one-arm-dumbbell-row", 3],
        ["dumbbell-romanian-deadlift", 3],
        ["push-up", 3],
        ["dumbbell-overhead-press", 3],
        ["single-leg-romanian-deadlift", 1],
      ]);
    });

    it("keeps a lone Set", () => {
      const plan = { plannedExercises: [planned("goblet-squat", 1)] };
      expect(setsOf({ workoutLength: "long", checkIn: badNight }, plan)).toEqual([["goblet-squat", 1]]);
    });

    it("is undone by Full Workout, giving back the Day's Workout exactly", () => {
      const usual = daysWorkout(longPlan, { workoutLength: "standard", equipment: "bodyweight_only" });
      const full = daysWorkout(longPlan, {
        workoutLength: "standard",
        equipment: "bodyweight_only",
        checkIn: badNight,
        fullWorkout: true,
      });
      expect(full).toEqual(usual);
    });

    it("is undone by Full Workout for one plan only, as for the equipment", () => {
      const usual = { workoutLength: "standard", checkIn: badNight } as const;
      const made = withChoice(null, "plan-1", { fullWorkout: true });
      expect(dayChoices("plan-1", usual, made).fullWorkout).toBe(true);
      expect(dayChoices("plan-2", usual, made)).toEqual(usual);
    });
  });

  describe("the order of the Workout", () => {
    // Priority order: two single-Muscle Exercises, then multi-Muscle ones with a swing among them
    const plan = {
      plannedExercises: [
        planned("plank"),
        planned("dumbbell-lateral-raise"),
        planned("goblet-squat"),
        planned("kettlebell-swing"),
        planned("push-up"),
      ],
    };
    const order = (goal?: Goal) =>
      daysWorkout(plan, { workoutLength: "long" }, goal).plannedExercises.map(({ slug }) => slug);

    it("puts multi-Muscle Exercises first, otherwise in priority order", () => {
      expect(order("build_muscle")).toEqual([
        "goblet-squat",
        "kettlebell-swing",
        "push-up",
        "plank",
        "dumbbell-lateral-raise",
      ]);
    });

    it("puts Ballistic Exercises first for athletic", () => {
      expect(order("athletic")).toEqual([
        "kettlebell-swing",
        "goblet-squat",
        "push-up",
        "plank",
        "dumbbell-lateral-raise",
      ]);
    });

    it("orders by what's left, so the cut still keeps the highest priority", () => {
      // 1500 s at Short, with the running time beside each Exercise. The order comes after the cut, so moving the
      // swing to the front doesn't let it push out the work ahead of it in priority order
      const short = {
        plannedExercises: [
          planned("plank"), // 225 s
          planned("goblet-squat"), // 585 s
          planned("dumbbell-lateral-raise"), // 765 s
          planned("push-up"), // 1035 s
          planned("dumbbell-romanian-deadlift"), // 1395 s
          planned("kettlebell-swing"), // Only one 90 s Set fits
          planned("dumbbell-overhead-press"),
        ],
      };
      expect(
        daysWorkout(short, { workoutLength: "short" }, "athletic").plannedExercises.map(({ slug, sets }) => [
          slug,
          sets,
        ]),
      ).toEqual([
        ["kettlebell-swing", 1],
        ["goblet-squat", 3],
        ["push-up", 3],
        ["dumbbell-romanian-deadlift", 3],
        ["plank", 3],
        ["dumbbell-lateral-raise", 3],
      ]);
    });

    it("treats the plan as multi-Muscle first when the Goal isn't known yet", () => {
      expect(order()).toEqual(order("recomp"));
    });
  });
});

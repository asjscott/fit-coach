import type { Goal, PlannedExercise, WorkoutLength } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { dayChoices, daysWorkout } from "./days-workout";

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
          planned("plank", 4), // 300 s
          planned("goblet-squat", 4), // 780 s
          planned("dumbbell-lateral-raise", 4), // 1020 s
          planned("push-up", 4), // 1380 s
          planned("kettlebell-swing", 4), // Only one 90 s Set fits
          planned("dumbbell-romanian-deadlift"),
        ],
      };
      expect(
        daysWorkout(short, { workoutLength: "short" }, "athletic").plannedExercises.map(({ slug, sets }) => [
          slug,
          sets,
        ]),
      ).toEqual([
        ["kettlebell-swing", 1],
        ["goblet-squat", 4],
        ["push-up", 4],
        ["plank", 4],
        ["dumbbell-lateral-raise", 4],
      ]);
    });

    it("treats the plan as multi-Muscle first when the Goal isn't known yet", () => {
      expect(order()).toEqual(order("recomp"));
    });
  });
});

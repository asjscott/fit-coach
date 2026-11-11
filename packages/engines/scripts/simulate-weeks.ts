// Weeks of Workouts through the real planner, for the simulation and the plan outcome tests
import type { Goal, WorkoutLength } from "@fit/shared";
import { BUILT_IN_EQUIPMENT, daysWorkout, planWorkout, type ProfileWithLoads } from "../src";

export const GOALS: Goal[] = ["build_muscle", "recomp", "lose_fat", "athletic"];
const TIME_ZONE = "America/New_York";
const WEEKS = 4;
const strength = (referenceStrength: number) => ({ referenceStrength, estimated: true as const });
export const LIFTERS = {
  intermediate: {
    bodyWeightKg: 80,
    patterns: {
      squat: strength(100),
      hinge: strength(120),
      push: strength(80),
      pull: strength(80),
      core: strength(60),
    },
  },
  novice: {
    bodyWeightKg: 75,
    patterns: { squat: strength(50), hinge: strength(60), push: strength(40), pull: strength(40), core: strength(30) },
  },
};
const FULL_HOME_GYM: ProfileWithLoads = {
  tags: ["barbell", "plates", "power_rack", "adjustable_bench", "dumbbells", "pull_up_bar"],
  loads: {
    barbell: { barKg: 20, platesKg: [20, 10, 5, 2.5, 1.25] },
    dumbbells: { kind: "adjustable", minKg: 2.5, maxKg: 40, stepKg: 2.5 },
  },
};
export const PROFILES = { "Full gym": BUILT_IN_EQUIPMENT.full_gym, "Full home gym": FULL_HOME_GYM };

export type Run = {
  goal: Goal;
  days: number;
  length: WorkoutLength;
  lifter: keyof typeof LIFTERS;
  profile: keyof typeof PROFILES;
  // The "Include jumps" switch on, with the squat tested so jumps can be given (#105)
  jumps?: boolean;
};

// The lifter's Assessment, with the squat tested rather than estimated when jumps are on, as jumps need
function assessmentOf(lifter: keyof typeof LIFTERS, jumps: boolean) {
  const { bodyWeightKg, patterns } = LIFTERS[lifter];
  if (!jumps) return LIFTERS[lifter];
  const { referenceStrength } = patterns.squat;
  const topSet = { kind: "external" as const, kg: referenceStrength, reps: 1, loggedAt: "2026-11-01T12:00:00.000Z" };
  const squat = { slug: "back-squat", topSet, maximum: referenceStrength, loadLimited: false, referenceStrength };
  return { bodyWeightKg, patterns: { ...patterns, squat: { ...squat, estimated: false as const } } };
}

// Spreads the week's Workouts from Monday, at 18:00 in New York
function workoutDates(week: number, days: number) {
  const monday = Date.UTC(2026, 10, 2) + week * 7 * 86_400_000;
  const gap = Math.floor(7 / days);
  return Array.from({ length: days }, (_, day) => new Date(monday + day * gap * 86_400_000 + 23 * 3_600_000));
}

// Every Workout done exactly as planned, on the usual Length
export function simulate({ goal, days, length, lifter, profile, jumps = false }: Run) {
  const workouts: {
    id: string;
    startedAt: string;
    workoutExercises: { slug: string; sets: { loggedAt: string }[] }[];
  }[] = [];
  const weeks = [];
  for (let week = 0; week < WEEKS; week++) {
    const thisWeek = [];
    for (const now of workoutDates(week, days)) {
      const plan = planWorkout({
        workouts: workouts.slice(-14),
        now,
        timeZone: TIME_ZONE,
        equipmentProfile: PROFILES[profile],
        injuries: [],
        workingLevels: [],
        assessment: assessmentOf(lifter, jumps),
        goal,
        daysPerWeek: days,
        includeJumps: jumps,
      });
      const today = daysWorkout({ plannedExercises: plan.plannedExercises }, { workoutLength: length }, goal);
      const workoutExercises = today.plannedExercises.map(({ slug, sets }) => ({
        slug,
        sets: Array.from({ length: sets }, () => ({ loggedAt: now.toISOString() })),
      }));
      workouts.push({ id: `w${workouts.length}`, startedAt: now.toISOString(), workoutExercises });
      thisWeek.push({ exercises: today.plannedExercises, seconds: today.estimatedSeconds, heldBack: plan.heldBack });
    }
    weeks.push(thisWeek);
  }
  return weeks;
}

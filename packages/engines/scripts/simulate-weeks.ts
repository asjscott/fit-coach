// Weeks of Workouts through the real planner, for the simulation and the plan outcome tests
import type { Goal, Muscle, Set as LoggedSet, SetTarget, WorkingLevel, Workout, WorkoutLength } from "@fit/shared";
import {
  addCredits,
  builtInEquipment,
  creditsPerSet,
  daysWorkout,
  exerciseBySlug,
  planWorkout,
  progressWorkingLevel,
  weekOfBlock,
  workingLevelsOn,
  type MuscleCredits,
  type ProfileWithLoads,
} from "../src";

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
export const PROFILES = { "Full gym": builtInEquipment("full_gym", "kg"), "Full home gym": FULL_HOME_GYM };
// Bodyweight only too, for the table row (#101); the gym tables leave it out
export const EVERY_PROFILE = { ...PROFILES, "Bodyweight only": builtInEquipment("bodyweight_only", "kg") };

export type Run = {
  goal: Goal;
  days: number;
  length: WorkoutLength;
  lifter: keyof typeof LIFTERS;
  profile: keyof typeof EVERY_PROFILE;
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

// The Assessment's B, on the first simulated Monday, so the four weeks are the Block's first four and none deloads
const ASSESSED_AT = "2026-11-02T12:00:00.000Z";

// A lifter whose reps grow: every Set reaches the target the plan gives, so the rules move each Working Level on. A
// band Exercise's Sets are logged without the band, as on the phone: it's the one its Working Level names
function setsAt(target: SetTarget, sets: number, loggedAt: string): LoggedSet[] {
  const set: LoggedSet =
    target.unit === "kg"
      ? { kind: "external", kg: target.kg, reps: target.reps, loggedAt }
      : target.unit === "seconds"
        ? { kind: "timed", seconds: target.seconds, loggedAt }
        : { kind: "bodyweight", reps: target.reps, loggedAt };
  return Array.from({ length: sets }, () => set);
}

// Every Workout done exactly as planned, on the usual Length, by a lifter who reaches every target. After each one its
// Exercises' Working Levels move as they do at upload (progressWorkingLevel), from the stored level or else the one the
// Assessment seeds, and the next plan prescribes them
export function simulate({ goal, days, length, lifter, profile, jumps = false }: Run) {
  const assessment = assessmentOf(lifter, jumps);
  const equipmentProfile = EVERY_PROFILE[profile];
  const seeds = workingLevelsOn({ workingLevels: [], assessment, equipmentProfile });
  const stored = new Map<string, WorkingLevel>();
  const workouts: (Pick<Workout, "id" | "startedAt"> & { workoutExercises: { slug: string; sets: LoggedSet[] }[] })[] =
    [];
  const weeks = [];
  for (let week = 0; week < WEEKS; week++) {
    const thisWeek = [];
    for (const now of workoutDates(week, days)) {
      const deloadWeek = weekOfBlock({ bStartedAt: ASSESSED_AT }, now, TIME_ZONE)?.deload ?? false;
      const plan = planWorkout({
        workouts: workouts.slice(-14),
        now,
        timeZone: TIME_ZONE,
        equipmentProfile,
        injuries: [],
        workingLevels: [...stored.values()],
        assessment,
        goal,
        daysPerWeek: days,
        includeJumps: jumps,
        unit: "kg",
        deloadWeek,
      });
      const today = daysWorkout({ plannedExercises: plan.plannedExercises }, { workoutLength: length }, goal);
      const startedAt = now.toISOString();
      const workoutExercises = today.plannedExercises.map(({ slug, sets, target }) => ({
        slug,
        sets: setsAt(target, sets, startedAt),
      }));
      const workout = { id: `w${workouts.length}`, startedAt, workoutExercises };
      for (const workoutExercise of workoutExercises) {
        const level = stored.get(workoutExercise.slug) ?? seeds.get(workoutExercise.slug);
        if (!level) continue;
        const progression = progressWorkingLevel({
          level,
          workout,
          workoutExercise,
          exercise: exerciseBySlug(workoutExercise.slug)!,
          equipmentProfile,
          deloadWeek,
          plannedSets: workoutExercise.sets.length,
        });
        if (progression) stored.set(workoutExercise.slug, progression.level);
      }
      workouts.push(workout);
      thisWeek.push({ exercises: today.plannedExercises, seconds: today.estimatedSeconds, heldBack: plan.heldBack });
    }
    weeks.push(thisWeek);
  }
  return weeks;
}

// A simulated week's credited Sets per Muscle: in total, as the Week Ledger counts them, or from primary credit alone
export function weekCredits(
  week: readonly { exercises: readonly { slug: string; sets: number }[] }[],
  counted: "total" | "primary",
): MuscleCredits {
  return week
    .flatMap(({ exercises }) => exercises)
    .reduce<MuscleCredits>((total, { slug, sets }) => {
      const exercise = exerciseBySlug(slug)!;
      const credits = creditsPerSet(exercise);
      if (counted === "primary") {
        const primary = new Set<Muscle>(exercise.muscles.primary);
        for (const muscle of Object.keys(credits) as Muscle[]) if (!primary.has(muscle)) delete credits[muscle];
      }
      return addCredits(total, credits, sets);
    }, {});
}

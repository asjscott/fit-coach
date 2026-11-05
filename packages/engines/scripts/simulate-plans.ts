// Runs weeks of Workouts through the real planner: docs/research/planner-simulation.md records the results.
// pnpm --filter @fit/engines simulate
import type { Goal, WorkoutLength } from "@fit/shared";
import {
  BUILT_IN_EQUIPMENT,
  daysWorkout,
  exerciseBySlug,
  planWorkout,
  weeklyBudget,
  type ProfileWithLoads,
} from "../src";

const GOALS: Goal[] = ["build_muscle", "recomp", "lose_fat", "athletic"];
const TIME_ZONE = "America/New_York";
const WEEKS = 4;
const strength = (referenceStrength: number) => ({ referenceStrength, estimated: true as const });
const LIFTERS = {
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
const PROFILES = { "Full gym": BUILT_IN_EQUIPMENT.full_gym, "Full home gym": FULL_HOME_GYM };

type Run = {
  goal: Goal;
  days: number;
  length: WorkoutLength;
  lifter: keyof typeof LIFTERS;
  profile: keyof typeof PROFILES;
};

// Spreads the week's Workouts from Monday, at 18:00 in New York
function workoutDates(week: number, days: number) {
  const monday = Date.UTC(2026, 10, 2) + week * 7 * 86_400_000;
  const gap = Math.floor(7 / days);
  return Array.from({ length: days }, (_, day) => new Date(monday + day * gap * 86_400_000 + 23 * 3_600_000));
}

// Every Workout done exactly as planned, on the usual Length
function simulate({ goal, days, length, lifter, profile }: Run) {
  const workouts: { id: string; startedAt: string; workoutExercises: { slug: string; sets: unknown[] }[] }[] = [];
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
        assessment: LIFTERS[lifter],
        goal,
        daysPerWeek: days,
      });
      const today = daysWorkout({ plannedExercises: plan.plannedExercises }, { workoutLength: length }, goal);
      const workoutExercises = today.plannedExercises.map(({ slug, sets }) => ({
        slug,
        sets: Array.from({ length: sets }, () => ({})),
      }));
      workouts.push({ id: `w${workouts.length}`, startedAt: now.toISOString(), workoutExercises });
      thisWeek.push({ exercises: today.plannedExercises, seconds: today.estimatedSeconds });
    }
    weeks.push(thisWeek);
  }
  return weeks;
}

const round = (value: number) => Math.round(value * 10) / 10;

// A week on average, leaving out the first: after it, a week's Exercises carry on from the one before
function summary(run: Run) {
  const weeks = simulate(run).slice(1);
  const workouts = weeks.flat();
  const perWeek = (value: number) => round(value / weeks.length);
  const picks = workouts.flatMap(({ exercises }) => exercises);
  const setsOf = (test: (slug: string) => boolean) =>
    picks.filter(({ slug }) => test(slug)).reduce((sets, pick) => sets + pick.sets, 0);
  const firstIn = (slug: string) => workouts.filter(({ exercises }) => exercises[0]?.slug === slug).length;
  const allSets = setsOf(() => true);
  const isExternal = (slug: string) => exerciseBySlug(slug)?.loadType === "external";

  const credited: Record<string, number> = {};
  for (const { slug, sets } of picks) {
    const { primary, secondary } = exerciseBySlug(slug)!.muscles;
    for (const muscle of primary) credited[muscle] = (credited[muscle] ?? 0) + sets;
    for (const muscle of secondary) credited[muscle] = (credited[muscle] ?? 0) + sets / 2;
  }
  const delivered = Object.entries(weeklyBudget(run.goal, run.days)).map(([muscle, budget]) => ({
    muscle,
    budget: budget!,
    credited: perWeek(credited[muscle] ?? 0),
  }));
  const ofBudget = delivered.map(({ credited, budget }) => credited / budget);

  return {
    sets: perWeek(allSets),
    minutes: Math.round(workouts.reduce((total, { seconds }) => total + seconds, 0) / 60 / weeks.length),
    loaded: Math.round((setsOf(isExternal) / Math.max(1, allSets)) * 100),
    bands: Math.round((setsOf((slug) => isExternal(slug) && slug.includes("band")) / Math.max(1, allSets)) * 100),
    backSquat: perWeek(setsOf((slug) => slug === "back-squat")),
    bench: perWeek(setsOf((slug) => slug === "barbell-bench-press")),
    squatFirst: firstIn("back-squat"),
    benchFirst: firstIn("barbell-bench-press"),
    ofBudget: `${Math.round(Math.min(...ofBudget) * 100)}–${Math.round(Math.max(...ofBudget) * 100)}%`,
    short: delivered
      .filter(({ credited, budget }) => credited < budget)
      .map(({ muscle, credited, budget }) => `${muscle} ${credited}/${budget}`),
    lastWeek: weeks.at(-1)!.map(({ exercises }) => exercises.map(({ slug, sets }) => `${slug} ×${sets}`).join(", ")),
  };
}

const COMBINATIONS: [number, WorkoutLength][] = [
  [4, "standard"],
  [3, "standard"],
  [4, "long"],
  [2, "short"],
  [6, "standard"],
];

for (const profile of Object.keys(PROFILES) as (keyof typeof PROFILES)[]) {
  for (const lifter of Object.keys(LIFTERS) as (keyof typeof LIFTERS)[]) {
    console.log(`\n### ${profile}, ${lifter}\n`);
    console.log(
      "| Goal | Days | Length | Sets | Minutes | Loaded % | Bands % | Back squat Sets | Bench Sets | Of budget | Short of budget |",
    );
    console.log("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
    for (const goal of GOALS) {
      for (const [days, length] of COMBINATIONS) {
        const s = summary({ goal, days, length, lifter, profile });
        const cells: (string | number)[] = [goal, days, length, s.sets, s.minutes, s.loaded, s.bands];
        cells.push(`${s.backSquat} (first ${s.squatFirst})`, `${s.bench} (first ${s.benchFirst})`, s.ofBudget);
        console.log(`| ${cells.join(" | ")} | ${s.short.join(", ") || "none"} |`);
      }
    }
  }
}

console.log("\n### The last simulated week: Full gym, intermediate, 4 days, Standard");
for (const goal of GOALS) {
  console.log(`\n${goal}:\n`);
  const { lastWeek } = summary({ goal, days: 4, length: "standard", lifter: "intermediate", profile: "Full gym" });
  for (const workout of lastWeek) console.log(`- ${workout}`);
}

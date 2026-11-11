// Runs weeks of Workouts through the real planner: docs/research/planner-simulation.md records the results.
// pnpm --filter @fit/engines simulate
import type { Muscle, WorkoutLength } from "@fit/shared";
import {
  addCredits,
  builtInEquipment,
  creditsPerSet,
  exerciseBySlug,
  EXERCISES,
  isAvailable,
  isJump,
  weeklyBudget,
  type MuscleCredits,
} from "../src";
import { EVERY_PROFILE, GOALS, LIFTERS, PROFILES, simulate, weekCredits, type Run } from "./simulate-weeks";

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

  const credited = picks.reduce<MuscleCredits>(
    (credits, { slug, sets }) => addCredits(credits, creditsPerSet(exerciseBySlug(slug)!), sets),
    {},
  );
  const delivered = Object.entries(weeklyBudget(run.goal, run.days)).map(([muscle, budget]) => ({
    muscle,
    budget: budget!,
    credited: perWeek(credited[muscle as Muscle] ?? 0),
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

const DAYS = [2, 3, 4, 5, 6];
const LENGTHS: WorkoutLength[] = ["short", "standard", "long"];

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

console.log("\n### Weekly Budget: main Muscles, then side delts and abs, then calves where budgeted\n");
console.log(`| Goal | ${DAYS.map((days) => `${days} days`).join(" | ")} |`);
console.log(`| --- |${DAYS.map(() => " --- |").join("")}`);
for (const goal of GOALS) {
  const cells = DAYS.map((days) => {
    const budget = weeklyBudget(goal, days);
    return [budget.quads, budget.side_delts, budget.calves].filter((sets) => sets !== undefined).join(", ");
  });
  console.log(`| ${goal} | ${cells.join(" | ")} |`);
}

// The fewest credited Sets any budgeted Muscle gets in a week, which the 4-Set floor is judged by
function lowestMuscle(run: Run, weeks: ReturnType<typeof simulate>) {
  const lowestIn = (week: (typeof weeks)[number]) => {
    const credits = week
      .flatMap(({ exercises }) => exercises)
      .reduce<MuscleCredits>(
        (total, { slug, sets }) => addCredits(total, creditsPerSet(exerciseBySlug(slug)!), sets),
        {},
      );
    return Math.min(...Object.keys(weeklyBudget(run.goal, run.days)).map((muscle) => credits[muscle as Muscle] ?? 0));
  };
  return Math.min(...weeks.map(lowestIn));
}

// The recovery filter's effect: the floor, and how many of the 3 weeks' Workouts held a Muscle back
console.log("\n### Lowest Muscle a week, and Workouts holding a Muscle back: Full gym, intermediate\n");
console.log(`| Goal | Length | ${DAYS.map((days) => `${days} days`).join(" | ")} |`);
console.log(`| --- | --- |${DAYS.map(() => " --- |").join("")}`);
for (const goal of GOALS) {
  for (const length of LENGTHS) {
    const cells = DAYS.map((days) => {
      const run: Run = { goal, days, length, lifter: "intermediate", profile: "Full gym" };
      const weeks = simulate(run).slice(1);
      const holding = weeks.flat().filter(({ heldBack }) => heldBack.length).length;
      return `${lowestMuscle(run, weeks)} (${holding})`;
    });
    console.log(`| ${goal} | ${length} | ${cells.join(" | ")} |`);
  }
}

// The Exercises added for the library's gaps (#101), and where the planner gives them
const LIBRARY_GAPS = [
  "calf-raise",
  "nordic-hamstring-curl",
  "dumbbell-curl",
  "dumbbell-overhead-triceps-extension",
  "cable-knee-extension",
  "table-row",
];
const GAP_COMBINATIONS: [number, WorkoutLength][] = [
  [4, "standard"],
  [4, "long"],
  [6, "standard"],
];
console.log("\n### The library's gaps: Sets a week of each, and calves' credited Sets, intermediate\n");
console.log(`| Profile | Goal | Days | Length | ${LIBRARY_GAPS.join(" | ")} | Calves |`);
console.log(`| --- | --- | --- | --- |${LIBRARY_GAPS.map(() => " --- |").join("")} --- |`);
for (const profile of Object.keys(EVERY_PROFILE) as (keyof typeof EVERY_PROFILE)[]) {
  for (const goal of GOALS) {
    for (const [days, length] of GAP_COMBINATIONS) {
      const weeks = simulate({ goal, days, length, lifter: "intermediate", profile }).slice(1);
      const picks = weeks.flat().flatMap(({ exercises }) => exercises);
      const perWeek = (sets: number) => round(sets / weeks.length);
      const setsOf = (slug: string) =>
        perWeek(picks.filter((pick) => pick.slug === slug).reduce((total, pick) => total + pick.sets, 0));
      const calves = perWeek(
        picks.reduce((total, { slug, sets }) => total + (creditsPerSet(exerciseBySlug(slug)!).calves ?? 0) * sets, 0),
      );
      console.log(`| ${[profile, goal, days, length, ...LIBRARY_GAPS.map(setsOf), calves].join(" | ")} |`);
    }
  }
}

// How thin Bodyweight only's Alternative Exercises are: the Exercises with no other Exercise available on it that
// shares a Pattern and a primary Muscle
const onBodyweight = EXERCISES.filter(
  (exercise) => !exercise.recovery && isAvailable(exercise, builtInEquipment("bodyweight_only", "kg")),
);
const noMatch = EXERCISES.filter((exercise) => !exercise.recovery).filter(
  (exercise) =>
    !onBodyweight.some(
      (other) =>
        other.slug !== exercise.slug &&
        other.patterns.some(({ pattern }) => exercise.patterns.some((own) => own.pattern === pattern)) &&
        other.muscles.primary.some((muscle) => exercise.muscles.primary.includes(muscle)),
    ),
);
console.log(`\n### Exercises with no bodyweight Alternative Exercise sharing a Pattern and a primary Muscle\n`);
console.log(`${noMatch.length}: ${noMatch.map(({ slug }) => slug).join(", ")}`);

// Jumps (#105): athletic with the switch on against off. Jump minutes are the jump Sets' time; the cost is what the
// rest of the week loses
console.log("\n### Jumps: athletic, Full gym, intermediate, switch off then on\n");
console.log(
  "| Days | Length | Jumps | Sets | Minutes | Jump Sets | Jump minutes | Other Sets | Quads, glutes | Of budget | Short of budget |",
);
console.log("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
for (const [days, length] of COMBINATIONS) {
  for (const jumps of [false, true]) {
    const run: Run = { goal: "athletic", days, length, lifter: "intermediate", profile: "Full gym", jumps };
    const s = summary(run);
    const weeks = simulate(run).slice(1);
    const picks = weeks.flat().flatMap(({ exercises }) => exercises);
    const jumpPicks = picks.filter(({ slug }) => isJump(exerciseBySlug(slug)!));
    const jumpSets = jumpPicks.reduce((sets, pick) => sets + pick.sets, 0);
    const jumpSeconds = jumpPicks.reduce(
      (total, { slug, sets }) => total + sets * exerciseBySlug(slug)!.secondsPerSet,
      0,
    );
    const credited = picks.reduce<MuscleCredits>(
      (credits, { slug, sets }) => addCredits(credits, creditsPerSet(exerciseBySlug(slug)!), sets),
      {},
    );
    const perWeek = (value: number) => round(value / weeks.length);
    const cells = [days, length, jumps ? "on" : "off", s.sets, s.minutes, perWeek(jumpSets)];
    cells.push(Math.round(jumpSeconds / 60 / weeks.length), round(s.sets - perWeek(jumpSets)));
    cells.push(`${perWeek(credited.quads ?? 0)}, ${perWeek(credited.glutes ?? 0)}`, s.ofBudget);
    console.log(`| ${cells.join(" | ")} | ${s.short.join(", ") || "none"} |`);
  }
}

// The 130% cap: each budgeted Muscle's credited Sets as a share of its budget, from primary credit alone and in total,
// in the heaviest of the 3 weeks. Primary stays within 130%; a total over 160% sends the cap back for a decision
const MUSCLES = Object.keys(weeklyBudget("build_muscle", 4)) as Muscle[];
const shareOf = (credit: number | undefined, budget: number) => Math.round(((credit ?? 0) / budget) * 100);
let overTotal = 0;
for (const profile of Object.keys(PROFILES) as (keyof typeof PROFILES)[]) {
  for (const lifter of Object.keys(LIFTERS) as (keyof typeof LIFTERS)[]) {
    console.log(`\n### Credit against the Weekly Budget, primary / total %: ${profile}, ${lifter}\n`);
    console.log(`| Goal | Days | Length | ${MUSCLES.join(" | ")} |`);
    console.log(`| --- | --- | --- |${MUSCLES.map(() => " --- |").join("")}`);
    for (const goal of GOALS) {
      for (const [days, length] of COMBINATIONS) {
        const budget = weeklyBudget(goal, days);
        const weeks = simulate({ goal, days, length, lifter, profile }).slice(1);
        const cells = MUSCLES.map((muscle) => {
          if (!budget[muscle]) return "–";
          const most = (counted: "primary" | "total") =>
            Math.max(...weeks.map((week) => shareOf(weekCredits(week, counted)[muscle], budget[muscle]!)));
          if (most("total") > 160) overTotal++;
          return `${most("primary")} / ${most("total")}`;
        });
        console.log(`| ${goal} | ${days} | ${length} | ${cells.join(" | ")} |`);
      }
    }
  }
}
console.log(`\nMuscles over 160% in total: ${overTotal}`);

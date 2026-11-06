// Runs weeks of Workouts through the real planner: docs/research/planner-simulation.md records the results.
// pnpm --filter @fit/engines simulate
import type { Muscle, WorkoutLength } from "@fit/shared";
import { addCredits, creditsPerSet, exerciseBySlug, weeklyBudget, type MuscleCredits } from "../src";
import { GOALS, LIFTERS, PROFILES, simulate, type Run } from "./simulate-weeks";

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

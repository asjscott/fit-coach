// Runs weeks of Workouts through the real planner: docs/research/planner-simulation.md records the results.
// pnpm --filter @fit/engines simulate
import type { Muscle, WorkoutLength } from "@fit/shared";
import { addCredits, creditsPerSet, exerciseBySlug, isJump, weeklyBudget, type MuscleCredits } from "../src";
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

console.log("\n### Weekly Budget: main Muscles, then side delts and abs\n");
console.log(`| Goal | ${DAYS.map((days) => `${days} days`).join(" | ")} |`);
console.log(`| --- |${DAYS.map(() => " --- |").join("")}`);
for (const goal of GOALS) {
  const cells = DAYS.map((days) => {
    const budget = weeklyBudget(goal, days);
    return `${budget.quads}, ${budget.side_delts}`;
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

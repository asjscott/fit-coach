import {
  dayBefore,
  latestWeekSummaryMonday,
  localDateOf,
  mondayBefore,
  mondayOf,
  nutritionRanges,
  rangeState,
  readiness,
  weekDates,
  weekLedger,
  weeklyBudget,
  weeklyStreak,
  weekOfBlock,
  weekVerdict,
  workoutsInWeek,
} from "@fit/engines";
import {
  DEFAULT_WEIGHT_UNIT,
  UserProfile,
  type CheckIn,
  type LatestAssessment,
  type NutritionWeek,
  type Pr,
  type SetTarget,
  type WeekAverage,
  type WeekKcal,
  type WeekSummary,
  type WeightUnit,
  type WorkingLevel,
  type WorkingLevelMove,
  type Workout,
} from "@fit/shared";
import { findLatestAssessment } from "./assessments";
import { findCheckInsBetween } from "./check-ins";
import { db } from "./db";
import { ignoringDuplicateKey } from "./duplicate-key";
import { findNutritionWeek } from "./nutrition-history";
import { findUser } from "./users";
import { weighInChange } from "./weigh-ins";
import { findWorkoutsSince, toWorkout } from "./workouts";

// The only thing stored for the Week Summary (ADR 0009): that a user has seen a week's, one document per user and week
type SeenDoc = { clerkUserId: string; monday: string; seenAt: Date };

const seenWeeks = db.collection<SeenDoc>("weekSummariesSeen");

export async function ensureWeekSummaryIndexes() {
  await seenWeeks.createIndex({ clerkUserId: 1, monday: 1 }, { unique: true });
}

// Why a Week Summary can't be worked out
export type NoWeekSummary = "not-onboarded" | "no-such-week";

// Everything a week's parts are worked out from, fetched once
type WeekData = {
  monday: string;
  onboardedAt: Date;
  timeZone: string;
  daysPerWeek: number;
  goal: UserProfile["goal"];
  unit: WeightUnit;
  // From the onboarding week on, for the Weekly Streak
  workouts: Workout[];
  food: NutritionWeek;
  // The latest Assessment, for the Block's deload week and the Working Levels; null before the first
  latest: LatestAssessment;
  weighIn: { kg: number; changeKg: number } | null;
  // This week's Check-ins and the week before's
  checkIns: CheckIn[];
  checkInsBefore: CheckIn[];
};

// Weekly Streak, at a moment inside the week, so the week counts as the one under way: its own Workouts add to it. A
// week that ended short broke the streak, which the current week never does, so that's 0
function streakOf({ onboardedAt, monday, timeZone, daysPerWeek, workouts }: WeekData, done: number): number {
  if (done < daysPerWeek - 1) return 0;
  const inside = momentOn(weekDates(monday)[6], timeZone);
  return weeklyStreak({ workouts, daysPerWeek, onboardedAt: onboardedAt.toISOString(), now: inside, timeZone });
}

// A moment on a local date in the timezone: noon UTC, moved half a day when that's another date there
function momentOn(date: string, timeZone: string): Date {
  const noon = new Date(`${date}T12:00:00Z`);
  const there = localDateOf(noon, timeZone);
  if (there === date) return noon;
  return new Date(noon.getTime() + (there > date ? -12 : 12) * 60 * 60 * 1000);
}

// Workouts planned: days per week, pro-rated for the part first week from the day the user onboarded, at least one
function plannedWorkouts({ onboardedAt, monday, timeZone, daysPerWeek }: WeekData, partWeek: boolean): number {
  if (!partWeek) return daysPerWeek;
  const onboarded = localDateOf(onboardedAt, timeZone);
  const days = weekDates(monday).filter((date) => date >= onboarded).length;
  return Math.max(1, Math.round((daysPerWeek * days) / 7));
}

// The daily average over the days with food logged, against the range of their average target; null with none logged
function averageOf(food: NutritionWeek, nutrient: "kcal" | "proteinG"): WeekAverage | undefined {
  const logged = food.days.filter((day) => day.logged);
  if (!logged.length) return undefined;
  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const average = Math.round(mean(logged.map((day) => day.totals[nutrient])));
  const target = mean(logged.map((day) => day.targets[nutrient]));
  const range = nutritionRanges({ kcal: target, proteinG: target })[nutrient];
  return { average, ...range, state: rangeState(average, range).state };
}

// The kcal average, with each logged day's kcal against that day's own range
function kcalOf(food: NutritionWeek): WeekKcal | undefined {
  const average = averageOf(food, "kcal");
  if (!average) return undefined;
  const days = food.days
    .filter((day) => day.logged)
    .map(({ date, totals, targets }) => {
      const kcal = Math.round(totals.kcal);
      return { date, kcal, state: rangeState(kcal, nutritionRanges(targets).kcal).state };
    });
  return { ...average, days };
}

// Budgeted Muscles at or over their Weekly Budget, out of all of them, and those short of it with their credited Sets;
// absent with no Workouts to credit
function budgetOf({ goal, daysPerWeek, workouts, monday, timeZone }: WeekData, done: number) {
  if (!done) return undefined;
  const budget = weeklyBudget(goal, daysPerWeek);
  const ledger = weekLedger(workouts, { monday, timeZone });
  const muscles = Object.entries(budget) as [keyof typeof budget, number][];
  const credited = (muscle: keyof typeof budget) => Math.round((ledger[muscle] ?? 0) * 10) / 10;
  const short = muscles
    .filter(([muscle, sets]) => credited(muscle) < sets)
    .map(([muscle, sets]) => ({ muscle, sets: credited(muscle), budget: sets }));
  return { met: muscles.length - short.length, muscles: muscles.length, short };
}

// The PRs the week's Workouts set, one per Exercise: its best that week against its best before the week
function prsOf(weekWorkouts: Workout[]): Pr[] {
  const bySlug = new Map<string, Pr>();
  const inOrder = [...weekWorkouts].sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
  for (const pr of inOrder.flatMap((workout) => workout.prs ?? [])) {
    const first = bySlug.get(pr.slug);
    bySlug.set(pr.slug, first ? { ...pr, previous: first.previous } : pr);
  }
  return [...bySlug.values()];
}

const DIRECTIONS: Partial<Record<string, WorkingLevelMove["direction"]>> = {
  "target-up": "up",
  "seconds-up": "up",
  "load-up": "up",
  "load-down": "down",
  "target-down": "down",
};

// What a Working Level prescribes, without its progress
function targetOf(level: WorkingLevel): SetTarget {
  switch (level.unit) {
    case "kg":
      return { unit: "kg", kg: level.kg, reps: level.reps };
    case "reps":
      return { unit: "reps", reps: level.reps };
    case "seconds":
      return { unit: "seconds", seconds: Math.round(level.seconds) };
    case "band":
      return { unit: "band", level: level.level, reps: level.reps };
  }
}

// The Working Levels a Workout that week moved up or down, in the order they moved. Only each level's last move is
// stored, so a level moved again since is shown as it is now, or not at all when moved in a later week
function movesOf({ latest, monday, timeZone }: WeekData): WorkingLevelMove[] {
  return (latest?.workingLevels ?? [])
    .flatMap((level) => {
      const direction = level.change && DIRECTIONS[level.change.code];
      const { movedBy } = level;
      if (!direction || !movedBy || mondayOf(new Date(movedBy.startedAt), timeZone) !== monday) return [];
      const change = level.change!.code as WorkingLevelMove["change"];
      return [{ at: movedBy.startedAt, move: { slug: level.slug, direction, change, level: targetOf(level) } }];
    })
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
    .map(({ move }) => move);
}

// The average Readiness of these Check-ins, to a tenth; undefined with none
function averageReadiness(checkIns: CheckIn[]) {
  if (!checkIns.length) return undefined;
  const total = checkIns.reduce((sum, checkIn) => sum + readiness(checkIn), 0);
  return Math.round((total / checkIns.length) * 10) / 10;
}

function readinessOf({ checkIns, checkInsBefore }: WeekData) {
  const average = averageReadiness(checkIns);
  if (average === undefined) return undefined;
  const previous = averageReadiness(checkInsBefore);
  return { average, ...(previous !== undefined && { previous }) };
}

// The model, part by part. A new part is worked out here from WeekData, and left out when it has no data
function weekSummaryOf(data: WeekData, seen: boolean): WeekSummary {
  const { onboardedAt, monday, timeZone, workouts, food, latest, weighIn, unit } = data;
  const partWeek = mondayOf(onboardedAt, timeZone) === monday;
  const weekWorkouts = workoutsInWeek(workouts, { monday, timeZone });
  const done = weekWorkouts.length;
  const planned = plannedWorkouts(data, partWeek);
  const kcal = kcalOf(food);
  const protein = averageOf(food, "proteinG");
  const weeklyBudget = budgetOf(data, done);
  const deload = weekOfBlock(latest?.assessment ?? null, momentOn(monday, timeZone), timeZone)?.deload ?? false;
  const prs = prsOf(weekWorkouts);
  const moves = movesOf(data);
  const readiness = readinessOf(data);
  const coach = weekVerdict({
    workouts: { done, planned },
    partWeek,
    prs: prs.length,
    kcal: kcal?.state,
    protein: protein?.state,
    weighInChangeKg: weighIn?.changeKg,
    deload,
    unit,
  });
  return {
    monday,
    sunday: weekDates(monday)[6],
    seen,
    partWeek,
    workouts: { done, planned },
    streak: streakOf(data, done),
    ...(kcal && { kcal }),
    ...(protein && { protein }),
    ...(weeklyBudget && { weeklyBudget }),
    ...(deload && { deload }),
    ...(prs.length && { prs }),
    ...(moves.length && { moves }),
    ...(weighIn && { weighIn }),
    ...(readiness && { readiness }),
    coach,
  };
}

const isMonday = (date: string) => weekDates(date)[0] === date;

// The Week Summary for the Monday-to-Sunday week starting on `monday`, or "latest" for the week just ended, worked out
// live from History, food, Weigh-ins, Check-ins and the Working Levels. A week before the user onboarded, or not yet
// started, has none
export async function findWeekSummary(clerkUserId: string, requested: string): Promise<WeekSummary | NoWeekSummary> {
  const user = await findUser(clerkUserId);
  const onboardedAt = user?.onboardedAt;
  if (!user || !onboardedAt) return "not-onboarded";
  const timeZone = user.timeZone ?? "UTC";
  const now = new Date();
  const monday = requested === "latest" ? latestWeekSummaryMonday(now, timeZone) : requested;
  const firstWeek = mondayOf(onboardedAt, timeZone);
  if (!isMonday(monday) || monday < firstWeek || monday > mondayOf(now, timeZone)) return "no-such-week";

  const { goal, daysPerWeek } = UserProfile.pick({ goal: true, daysPerWeek: true }).required().parse(user.profile);
  const sunday = weekDates(monday)[6];
  const weekBefore = mondayBefore(monday);
  // A day's margin before the onboarding week's Monday covers any timezone
  const since = new Date(`${dayBefore(firstWeek)}T00:00:00Z`);
  const [docs, food, seen, latest, weighIn, checkIns, checkInsBefore] = await Promise.all([
    findWorkoutsSince(clerkUserId, since),
    findNutritionWeek(clerkUserId, monday),
    seenWeeks.findOne({ clerkUserId, monday }),
    findLatestAssessment(clerkUserId),
    weighInChange(clerkUserId, monday),
    findCheckInsBetween(clerkUserId, monday, sunday),
    findCheckInsBetween(clerkUserId, weekBefore, dayBefore(monday)),
  ]);
  if (!food) return "not-onboarded";
  const data: WeekData = {
    onboardedAt,
    monday,
    timeZone,
    daysPerWeek,
    goal,
    unit: user.unit ?? DEFAULT_WEIGHT_UNIT,
    workouts: docs.map(toWorkout),
    food,
    latest,
    weighIn,
    checkIns,
    checkInsBefore,
  };
  return weekSummaryOf(data, !!seen);
}

// Records that the user has seen the week's summary. Idempotent: the first time is the one kept
export async function markWeekSeen(clerkUserId: string, monday: string): Promise<void> {
  await ignoringDuplicateKey(() =>
    seenWeeks.updateOne({ clerkUserId, monday }, { $setOnInsert: { seenAt: new Date() } }, { upsert: true }),
  );
}

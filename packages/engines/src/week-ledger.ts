import type { Exercise, Muscle, Workout } from "@fit/shared";
import { exerciseBySlug } from "./data/exercises";
import type { LoggedWorkoutExercise } from "./recovery-workout";

// Credited Sets per Muscle; a Muscle with none is absent
export type MuscleCredits = Partial<Record<Muscle, number>>;

// A week of the Week Ledger: its Monday as a calendar date, in the timezone that decides which Workouts are in it
export type LedgerWeek = { monday: string; timeZone: string };

// What the Week Ledger needs from a finished Workout, however it came to be logged
export type LedgerWorkout = Pick<Workout, "id" | "startedAt"> & { workoutExercises: readonly LoggedWorkoutExercise[] };

const SECONDARY_CREDIT = 0.5;

// What one Set of an Exercise credits. A one-sided Exercise is no different: a Set is a Set, per side. A Recovery
// Exercise credits nothing
export function creditsPerSet({ muscles, recovery }: Pick<Exercise, "muscles" | "recovery">): MuscleCredits {
  const credits: MuscleCredits = {};
  if (recovery) return credits;
  for (const muscle of muscles.secondary) credits[muscle] = SECONDARY_CREDIT;
  for (const muscle of muscles.primary) credits[muscle] = 1;
  return credits;
}

export function addCredits(ledger: MuscleCredits, credits: MuscleCredits, sets: number): MuscleCredits {
  const total = { ...ledger };
  for (const [muscle, credit] of Object.entries(credits) as [Muscle, number][]) {
    total[muscle] = (total[muscle] ?? 0) + credit * sets;
  }
  return total;
}

// The calendar date of this moment in the timezone, as YYYY-MM-DD, which is how en-CA writes a date
export const localDateOf = (date: Date, timeZone: string): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone, dateStyle: "short" }).format(date);

// The Monday of the week holding this moment, as YYYY-MM-DD in the timezone. `weekStart` is the phone's version, in
// the host's time; the server's host time is nobody's. Worked out on the calendar, so daylight saving can't shift it
export function mondayOf(date: Date, timeZone: string): string {
  const monday = new Date(`${localDateOf(date, timeZone)}T00:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

// The Monday of the week before, on the calendar for the same reason
export function mondayBefore(monday: string): string {
  const date = new Date(`${monday}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 7);
  return date.toISOString().slice(0, 10);
}

// The week's Workouts, each once by id however often it's passed. A Workout belongs to the week it started in, as on
// Today
export function workoutsInWeek(workouts: readonly LedgerWorkout[], { monday, timeZone }: LedgerWeek): LedgerWorkout[] {
  const inWeek = workouts.filter((workout) => mondayOf(new Date(workout.startedAt), timeZone) === monday);
  return [...new Map(inWeek.map((workout) => [workout.id, workout])).values()];
}

// The Week Ledger, always recalculated from the Sets logged. An Exercise this library doesn't know credits nothing
export function weekLedger(workouts: readonly LedgerWorkout[], week: LedgerWeek): MuscleCredits {
  let ledger: MuscleCredits = {};
  for (const { workoutExercises } of workoutsInWeek(workouts, week)) {
    for (const { slug, sets } of workoutExercises) {
      const exercise = exerciseBySlug(slug);
      if (exercise) ledger = addCredits(ledger, creditsPerSet(exercise), sets.length);
    }
  }
  return ledger;
}

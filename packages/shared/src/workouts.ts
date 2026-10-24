import { z } from "zod";
import { LoadType } from "./exercises";

// Each Set records when it was logged; values are per side for a one-sided Exercise
const loggedAt = z.iso.datetime();
const count = (name: string) => z.number().int(`${name} must be a whole number`).positive(`${name} must be more than 0`);

export const Set = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("external"), kg: z.number().positive("Weight must be more than 0").multipleOf(0.25, "Use 0.25 kg steps"), reps: count("Reps"), loggedAt }),
  z.object({ kind: z.literal("bodyweight"), reps: count("Reps"), loggedAt }),
  z.object({ kind: z.literal("timed"), seconds: count("Seconds"), loggedAt }),
]);
export type Set = z.infer<typeof Set>;

// What the user enters for a Set; the Logbook adds loggedAt
export type SetValues = Set extends infer S ? (S extends Set ? Omit<S, "loggedAt"> : never) : never;

// The Load Type is a snapshot, so the server can check Sets without knowing the library.
// The slug is checked for shape only: the phone's library and the server's can drift apart
const workoutExerciseFields = {
  slug: z.string().regex(/^[a-z0-9-]+$/),
  loadType: LoadType,
};

const setsMatchLoadType = (workoutExercise: { loadType: LoadType; sets: Set[] }) =>
  workoutExercise.sets.every((set) => set.kind === workoutExercise.loadType);
const setsMatchLoadTypeError = { error: "Every Set must match its Workout Exercise's Load Type" };

export const WorkoutExercise = z
  .object({ ...workoutExerciseFields, sets: z.array(Set).min(1) })
  .refine(setsMatchLoadType, setsMatchLoadTypeError);
export type WorkoutExercise = z.infer<typeof WorkoutExercise>;

// A finished Workout, as uploaded to and stored on the server; the phone generates the id
export const Workout = z
  .object({
    id: z.uuid(),
    startedAt: z.iso.datetime(),
    endedAt: z.iso.datetime(),
    workoutExercises: z.array(WorkoutExercise).min(1),
  })
  .refine((workout) => Date.parse(workout.endedAt) > Date.parse(workout.startedAt), {
    error: "The end must be after the start",
    path: ["endedAt"],
  });
export type Workout = z.infer<typeof Workout>;

// The Workout being logged, saved on the phone after every change and never uploaded as is.
// Workout Exercises carry a phone id so the same Exercise can be added twice
export const InProgressWorkout = z.object({
  id: z.uuid(),
  startedAt: z.iso.datetime(),
  workoutExercises: z.array(
    z.object({ id: z.string(), ...workoutExerciseFields, sets: z.array(Set) }).refine(setsMatchLoadType, setsMatchLoadTypeError),
  ),
});
export type InProgressWorkout = z.infer<typeof InProgressWorkout>;
export type InProgressWorkoutExercise = InProgressWorkout["workoutExercises"][number];

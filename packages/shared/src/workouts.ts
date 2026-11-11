import { z } from "zod";
import { LoadType } from "./exercises";
import { PlannedExercise } from "./planned-workouts";
import { BodyProfile } from "./user";

// Each Set records when it was logged; values are per side for a one-sided Exercise
const loggedAt = z.iso.datetime();
// How hard the Set felt (GLOSSARY.md): only Assessment Workouts ask for it so far
export const RPE_SCALE = [6, 7, 8, 9, 10] as const;
const rpe = z
  .number()
  .int("RPE must be a whole number")
  .min(RPE_SCALE[0], "RPE goes from 6 to 10")
  .max(RPE_SCALE[RPE_SCALE.length - 1], "RPE goes from 6 to 10");
const count = (name: string) =>
  z.number().int(`${name} must be a whole number`).positive(`${name} must be more than 0`);

export const Set = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("external"),
    kg: z.number().positive("Weight must be more than 0").multipleOf(0.25, "Use 0.25 kg steps"),
    reps: count("Reps"),
    rpe: rpe.optional(),
    loggedAt,
  }),
  z.object({ kind: z.literal("bodyweight"), reps: count("Reps"), rpe: rpe.optional(), loggedAt }),
  z.object({ kind: z.literal("timed"), seconds: count("Seconds"), rpe: rpe.optional(), loggedAt }),
]);
export type Set = z.infer<typeof Set>;

// What the user enters for a Set; the Logbook adds loggedAt
export type SetValues = Set extends infer S ? (S extends Set ? Omit<S, "loggedAt"> : never) : never;

// Which of the two Assessment Workouts (GLOSSARY.md) a Workout is; absent on any other Workout
export const AssessmentPart = z.enum(["A", "B"]);
export type AssessmentPart = z.infer<typeof AssessmentPart>;

// The Load Type is a snapshot, so the server can check Sets without knowing the library.
// The slug is checked for shape only: the phone's library and the server's can drift apart
const workoutExerciseFields = {
  slug: z.string().regex(/^[a-z0-9-]+$/),
  loadType: LoadType,
};

const setsMatchLoadType = (workoutExercise: { loadType: LoadType; sets: Set[] }) =>
  workoutExercise.sets.every((set) => set.kind === workoutExercise.loadType);
const setsMatchLoadTypeError = { error: "Every Set must match its Workout Exercise's Load Type" };

// Other unknown fields are dropped, but a finished Workout can't carry the In-progress Workout's Previous Sets (ADR 0002)
export const WorkoutExercise = z
  .object({
    ...workoutExerciseFields,
    sets: z.array(Set).min(1),
    previousSets: z.never({ error: "A finished Workout can't carry Previous Sets" }).optional(),
  })
  .refine(setsMatchLoadType, setsMatchLoadTypeError);
export type WorkoutExercise = z.infer<typeof WorkoutExercise>;

// A PR (GLOSSARY.md) the server found on a Workout's upload, one per Exercise: the new best and the one it beat. e1rm
// and load are kg (load being the heaviest for 8 reps, on a weighted Ballistic Exercise); reps and seconds are a Set's
export const PrMeasure = z.enum(["e1rm", "load", "reps", "seconds"]);
export type PrMeasure = z.infer<typeof PrMeasure>;
export const Pr = z.object({
  slug: workoutExerciseFields.slug,
  measure: PrMeasure,
  best: z.number().positive(),
  previous: z.number().positive(),
});
export type Pr = z.infer<typeof Pr>;

// The Planned Workout a Workout was started from, kept however its Exercises change. Absent on a Manual Workout
const plannedWorkoutId = z.uuid().optional();

// A finished Workout, as uploaded to and stored on the server; the phone generates the id
export const Workout = z
  .object({
    id: z.uuid(),
    startedAt: z.iso.datetime(),
    endedAt: z.iso.datetime(),
    assessment: AssessmentPart.optional(),
    plannedWorkoutId,
    workoutExercises: z.array(WorkoutExercise).min(1),
    // Set by the server once the upload has looked for them, and ignored when a phone sends them
    prs: z.array(Pr).optional(),
  })
  .refine((workout) => Date.parse(workout.endedAt) > Date.parse(workout.startedAt), {
    error: "The end must be after the start",
    path: ["endedAt"],
  });
export type Workout = z.infer<typeof Workout>;

// Previous Sets (GLOSSARY.md, ADR 0002): the Sets of one Exercise from the user's most recent Workout that
// included it, with that Workout's times so a newer Pending Workout can beat it
export const PreviousSets = z.object({
  startedAt: z.iso.datetime(),
  endedAt: z.iso.datetime(),
  sets: z.array(Set).min(1),
});
export type PreviousSets = z.infer<typeof PreviousSets>;

// GET /workouts/previous-sets?slug=goblet-squat answers with PreviousSets, or null when no Workout has the Exercise
export const PreviousSetsQuery = z.object({ slug: workoutExerciseFields.slug });
export type PreviousSetsQuery = z.infer<typeof PreviousSetsQuery>;

// The Workout being logged, saved on the phone after every change and never uploaded as is.
// Workout Exercises carry a phone id so the same Exercise can be added twice, and may carry read-only
// snapshots of their Previous Sets and of what the plan set for them, superset included, both dropped at Finish
export const InProgressWorkout = z.object({
  id: z.uuid(),
  startedAt: z.iso.datetime(),
  assessment: AssessmentPart.optional(),
  // An Assessment Workout's first suggested loads come from the profile it started with, not a later edit
  bodyProfile: BodyProfile.optional(),
  plannedWorkoutId,
  workoutExercises: z.array(
    z
      .object({
        id: z.string(),
        ...workoutExerciseFields,
        sets: z.array(Set),
        previousSets: PreviousSets.optional(),
        planned: PlannedExercise.pick({ sets: true, target: true })
          .extend({
            // The id of the Workout Exercise it's paired with in a superset (#96), both ways
            supersetWith: z.string().optional(),
          })
          .optional(),
      })
      .refine(setsMatchLoadType, setsMatchLoadTypeError),
  ),
});
export type InProgressWorkout = z.infer<typeof InProgressWorkout>;
export type InProgressWorkoutExercise = InProgressWorkout["workoutExercises"][number];

// A page of History from GET /workouts, newest first (ties on start broken by id, highest
// first). To load older Workouts, pass the startedAt and id of the last Workout received
// as before and beforeId, so Workouts that started at the same moment are never skipped
export const WorkoutsQuery = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    before: z.iso.datetime().optional(),
    beforeId: z.uuid().optional(),
  })
  .refine((query) => query.beforeId === undefined || query.before !== undefined, {
    error: "beforeId needs before",
    path: ["beforeId"],
  });
export type WorkoutsQuery = z.infer<typeof WorkoutsQuery>;

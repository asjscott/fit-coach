import type { WithId } from "mongodb";
import { Workout, type WorkoutsQuery } from "@fit/shared";
import { db } from "./db";

// The shape of a workout document in MongoDB: the Workout with its Workout Exercises
// and Sets nested. The start and end are Dates so they sort and compare by time
type WorkoutDoc = Omit<Workout, "startedAt" | "endedAt"> & {
  clerkUserId: string;
  startedAt: Date;
  endedAt: Date;
  uploadedAt: Date;
};

export const workouts = db.collection<WorkoutDoc>("workouts");

export async function ensureWorkoutIndexes() {
  // The phone generates the id, so a retried upload finds the Workout it already sent
  await workouts.createIndex({ clerkUserId: 1, id: 1 }, { unique: true });
  // History, newest first
  await workouts.createIndex({ clerkUserId: 1, startedAt: -1 });
}

// Idempotent on the Workout id: returns the stored Workout if this user already uploaded it
export async function createWorkout(clerkUserId: string, workout: Workout) {
  const result = await workouts.findOneAndUpdate(
    { clerkUserId, id: workout.id },
    {
      $setOnInsert: {
        ...workout,
        clerkUserId,
        startedAt: new Date(workout.startedAt),
        endedAt: new Date(workout.endedAt),
        uploadedAt: new Date(),
      },
    },
    { upsert: true, returnDocument: "after", includeResultMetadata: true },
  );
  if (!result.value) throw new Error("Failed to create workout");
  return { workout: result.value, created: !result.lastErrorObject?.updatedExisting };
}

// The user's Workouts newest first, started before the cursor when given
export function findWorkouts(clerkUserId: string, { limit, before }: WorkoutsQuery) {
  return workouts
    .find({ clerkUserId, ...(before && { startedAt: { $lt: new Date(before) } }) })
    .sort({ startedAt: -1, id: -1 })
    .limit(limit)
    .toArray();
}

// Deletes the user's Workout; false when it isn't theirs or doesn't exist. No marker is
// kept for a deleted Workout (ADR 0001)
export async function deleteWorkout(clerkUserId: string, id: string) {
  const { deletedCount } = await workouts.deleteOne({ clerkUserId, id });
  return deletedCount === 1;
}

// Convert a database document into the shape the app expects
export function toWorkout({ id, startedAt, endedAt, workoutExercises }: WithId<WorkoutDoc>): Workout {
  return Workout.parse({
    id,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    workoutExercises,
  });
}

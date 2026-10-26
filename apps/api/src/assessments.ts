import { randomUUID } from "node:crypto";
import { assess, pairToAssess } from "@fit/engines";
import { Assessment, LatestAssessment, WorkingLevel, type Workout } from "@fit/shared";
import { client, db } from "./db";
import type { OnboardedUser } from "./users";
import { toWorkout, workouts } from "./workouts";

// One document per Assessment, a snapshot: deleting either Assessment Workout leaves it be
type AssessmentDoc = Omit<Assessment, "createdAt" | "bStartedAt"> & {
  clerkUserId: string;
  createdAt: Date;
  bStartedAt: Date;
};

// One document per user and slug; the newest Assessment (by when its B started) overwrites all of them
type WorkingLevelDoc = WorkingLevel & { clerkUserId: string; assessmentId: string };

export const assessments = db.collection<AssessmentDoc>("assessments");
export const workingLevels = db.collection<WorkingLevelDoc>("workingLevels");

export async function ensureAssessmentIndexes() {
  await assessments.createIndex({ clerkUserId: 1, bStartedAt: -1 });
  // A Workout is in at most one Assessment, however many uploads pair it at once
  await assessments.createIndex({ clerkUserId: 1, aWorkoutId: 1 }, { unique: true });
  await assessments.createIndex({ clerkUserId: 1, bWorkoutId: 1 }, { unique: true });
  await workingLevels.createIndex({ clerkUserId: 1, slug: 1 }, { unique: true });
}

// For every uploaded Workout, retries included: stores the Assessment and Working Levels of a pair it completes. One
// transaction, so a racing upload retries and finds the pair taken, and a failure stores nothing
export async function assessIfPaired(clerkUserId: string, workout: Workout, user: OnboardedUser) {
  const { assessment: part } = workout;
  if (!part) return;
  await client.withSession((session) =>
    session.withTransaction(async () => {
      // One at a time: a transaction's session can't run operations in parallel
      const assessmentWorkouts = await workouts
        .find(
          { clerkUserId, assessment: { $in: ["A", "B"] } },
          { projection: { id: 1, startedAt: 1, assessment: 1 }, session },
        )
        .toArray();
      const assessed = await assessments
        .find({ clerkUserId }, { projection: { aWorkoutId: 1, bWorkoutId: 1 }, session })
        .toArray();
      const pair = pairToAssess(
        { id: workout.id, startedAt: workout.startedAt, assessment: part },
        {
          workouts: assessmentWorkouts.flatMap(({ id, startedAt, assessment }) =>
            assessment ? [{ id, startedAt: startedAt.toISOString(), assessment }] : [],
          ),
          assessments: assessed,
        },
      );
      if (!pair) return;
      const pairedDoc = await workouts.findOne(
        { clerkUserId, id: part === "B" ? pair.aWorkoutId : pair.bWorkoutId },
        { session },
      );
      if (!pairedDoc) return;
      const paired = toWorkout(pairedDoc);
      const [a, b] = part === "B" ? [paired, workout] : [workout, paired];

      const result = assess(a, b, user.bodyProfile, user.equipmentProfiles);
      const id = randomUUID();
      const bStartedAt = new Date(result.assessment.bStartedAt);
      await assessments.insertOne(
        { ...result.assessment, id, clerkUserId, createdAt: new Date(), bStartedAt },
        { session },
      );
      // A pair completed late by an old A is kept, but mustn't overwrite the Working Levels of a newer Assessment
      const newest = await assessments.findOne(
        { clerkUserId },
        { sort: { bStartedAt: -1 }, projection: { id: 1 }, session },
      );
      if (newest?.id !== id) return;
      // A retake replaces every Working Level, even one for an Exercise the new Assessment leaves out
      await workingLevels.deleteMany({ clerkUserId }, { session });
      if (result.workingLevels.length) {
        await workingLevels.insertMany(
          result.workingLevels.map((level) => ({ ...level, clerkUserId, assessmentId: id })),
          { session },
        );
      }
    }),
  );
}

// The newest Assessment (its B started last) with its Working Levels, or null before the first
export async function findLatestAssessment(clerkUserId: string): Promise<LatestAssessment> {
  const doc = await assessments.findOne({ clerkUserId }, { sort: { bStartedAt: -1 } });
  if (!doc) return null;
  const levels = await workingLevels.find({ clerkUserId }).toArray();
  return LatestAssessment.parse({
    assessment: Assessment.parse({
      ...doc,
      createdAt: doc.createdAt.toISOString(),
      bStartedAt: doc.bStartedAt.toISOString(),
    }),
    workingLevels: levels.map((level) => WorkingLevel.parse(level)),
  });
}

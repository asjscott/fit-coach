import { randomUUID } from "node:crypto";
import { assess, pairToAssess } from "@fit/engines";
import { Assessment, LatestAssessment, WorkingLevel, type Workout } from "@fit/shared";
import { db } from "./db";
import { findUser } from "./users";
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
  await workingLevels.createIndex({ clerkUserId: 1, slug: 1 }, { unique: true });
}

// Called for every uploaded Workout, retries included: when it completes a new pair of Assessment Workouts
// (`pairToAssess`), works out the Assessment with `assess` and stores it and its Working Levels. Anything else does
// nothing
export async function assessIfPaired(clerkUserId: string, workout: Workout) {
  const { assessment: part } = workout;
  if (!part) return;
  const [assessmentWorkouts, assessed] = await Promise.all([
    workouts
      .find({ clerkUserId, assessment: { $in: ["A", "B"] } }, { projection: { id: 1, startedAt: 1, assessment: 1 } })
      .toArray(),
    assessments.find({ clerkUserId }, { projection: { aWorkoutId: 1, bWorkoutId: 1 } }).toArray(),
  ]);
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
  const pairedDoc = await workouts.findOne({ clerkUserId, id: part === "B" ? pair.aWorkoutId : pair.bWorkoutId });
  if (!pairedDoc) return;
  const paired = toWorkout(pairedDoc);
  const [a, b] = part === "B" ? [paired, workout] : [workout, paired];
  const user = await findUser(clerkUserId);
  const weightKg = user?.profile.weightKg;
  const gender = user?.profile.gender;
  if (!user || weightKg === undefined || gender === undefined) {
    throw new Error("Can't assess without the user's weight and gender");
  }

  // Working Levels for every Exercise available in any of the user's Equipment Profiles. Gender sets the typical
  // balance between Patterns that an untested one is estimated from
  const result = assess(a, b, { weightKg, gender }, user.equipmentProfiles);
  const id = randomUUID();
  const bStartedAt = new Date(result.assessment.bStartedAt);
  await assessments.insertOne({ ...result.assessment, id, clerkUserId, createdAt: new Date(), bStartedAt });
  // A pair completed late by an old A is kept, but mustn't overwrite the Working Levels of a newer Assessment
  const newest = await assessments.findOne({ clerkUserId }, { sort: { bStartedAt: -1 }, projection: { id: 1 } });
  if (newest?.id !== id) return;
  // A retake replaces every Working Level, even one for an Exercise the new Assessment leaves out
  await workingLevels.deleteMany({ clerkUserId });
  if (result.workingLevels.length) {
    await workingLevels.insertMany(result.workingLevels.map((level) => ({ ...level, clerkUserId, assessmentId: id })));
  }
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

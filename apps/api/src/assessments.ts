import { randomUUID } from "node:crypto";
import { assess } from "@fit/engines";
import { Assessment, LatestAssessment, WorkingLevel, type Workout } from "@fit/shared";
import { db } from "./db";
import { findUser } from "./users";
import { toWorkout, workouts } from "./workouts";

// One document per Assessment, a snapshot: deleting either Assessment Workout leaves it be
type AssessmentDoc = Omit<Assessment, "createdAt"> & { clerkUserId: string; createdAt: Date };

// One document per user and slug; the newest Assessment overwrites all of them
type WorkingLevelDoc = WorkingLevel & { clerkUserId: string; assessmentId: string };

export const assessments = db.collection<AssessmentDoc>("assessments");
export const workingLevels = db.collection<WorkingLevelDoc>("workingLevels");

export async function ensureAssessmentIndexes() {
  await assessments.createIndex({ clerkUserId: 1, createdAt: -1 });
  await workingLevels.createIndex({ clerkUserId: 1, slug: 1 }, { unique: true });
}

// The A paired with a B: the user's latest A that started before it
const latestABefore = (clerkUserId: string, startedAt: Date) =>
  workouts.findOne({ clerkUserId, assessment: "A", startedAt: { $lt: startedAt } }, { sort: { startedAt: -1 } });

// The B an A pairs with when they synced out of order: the first B after it, if this A is still the latest before
// that B
async function bAfter(clerkUserId: string, a: Pick<Workout, "id" | "startedAt">) {
  const b = await workouts.findOne(
    { clerkUserId, assessment: "B", startedAt: { $gt: new Date(a.startedAt) } },
    { sort: { startedAt: 1 } },
  );
  return b && (await latestABefore(clerkUserId, b.startedAt))?.id === a.id ? b : null;
}

// Called for a newly stored Workout: when it completes a pair of Assessment Workouts, works out the Assessment with
// `assess` and stores it and its Working Levels. A Workout that isn't part of a pair does nothing
export async function assessIfPaired(clerkUserId: string, workout: Workout) {
  if (!workout.assessment) return;
  const pairedDoc =
    workout.assessment === "B"
      ? await latestABefore(clerkUserId, new Date(workout.startedAt))
      : await bAfter(clerkUserId, workout);
  if (!pairedDoc) return;
  const paired = toWorkout(pairedDoc);
  const [a, b] = workout.assessment === "B" ? [paired, workout] : [workout, paired];
  const user = await findUser(clerkUserId);
  const weightKg = user?.profile.weightKg;
  if (!user || weightKg === undefined) throw new Error("Can't assess without the user's weight");

  // Working Levels for every Exercise available in any of the user's Equipment Profiles
  const result = assess(a, b, { weightKg }, user.equipmentProfiles);
  const id = randomUUID();
  await assessments.insertOne({ ...result.assessment, id, clerkUserId, createdAt: new Date() });
  await workingLevels.deleteMany({ clerkUserId });
  if (result.workingLevels.length) {
    await workingLevels.insertMany(result.workingLevels.map((level) => ({ ...level, clerkUserId, assessmentId: id })));
  }
}

// The newest Assessment with its Working Levels, or null before the first
export async function findLatestAssessment(clerkUserId: string): Promise<LatestAssessment> {
  const doc = await assessments.findOne({ clerkUserId }, { sort: { createdAt: -1 } });
  if (!doc) return null;
  const levels = await workingLevels.find({ clerkUserId }).toArray();
  return LatestAssessment.parse({
    assessment: Assessment.parse({ ...doc, createdAt: doc.createdAt.toISOString() }),
    workingLevels: levels.map((level) => WorkingLevel.parse(level)),
  });
}

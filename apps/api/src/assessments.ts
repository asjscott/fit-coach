import { randomUUID } from "node:crypto";
import {
  assess,
  BLOCK_WEEKS,
  keptByRetake,
  migrateWorkingLevel,
  pairToAssess,
  type LegacyWorkingLevel,
} from "@fit/engines";
import type { ClientSession } from "mongodb";
import { Assessment, LatestAssessment, WorkingLevel, type WorkingLevelMover, type Workout } from "@fit/shared";
import { client, db } from "./db";
import { equipmentProfilesOf, findUser, type OnboardedUser } from "./users";
import { toWorkout, workouts } from "./workouts";

// One document per Assessment, a snapshot: deleting either Assessment Workout leaves it be
type AssessmentDoc = Omit<Assessment, "createdAt" | "bStartedAt"> & {
  clerkUserId: string;
  createdAt: Date;
  bStartedAt: Date;
};

// One document per user and slug; the newest Assessment (by when its B started) sets them, keeping on a retake the
// last Block's progress (#137)
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

// The last Block's Workouts, and a day either side of its Mondays in any timezone: keptByRetake narrows them down
const RETAKE_LOOKBACK_MS = (BLOCK_WEEKS * 7 + 1) * 24 * 60 * 60 * 1000;

// Whether the user had an Assessment before this one, so that this one is a retake
async function isRetake(clerkUserId: string, id: string, session: ClientSession) {
  return (await assessments.countDocuments({ clerkUserId, id: { $ne: id } }, { session, limit: 1 })) > 0;
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
      // The uploaded Workout is one of the pair, so only the other is read
      const load = async (id: string) => {
        if (id === workout.id) return workout;
        const doc = await workouts.findOne({ clerkUserId, id }, { session });
        return doc && toWorkout(doc);
      };
      const a = await load(pair.aWorkoutId);
      const b = await load(pair.bWorkoutId);
      if (!a || !b) return;

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
      // A retake keeps the last Block's progress (#137): the levels of Exercises it didn't test that have Sets logged
      // in that Block stay. Every other level is replaced, or goes when the new Assessment leaves its Exercise out
      const kept = (await isRetake(clerkUserId, id, session))
        ? keptByRetake({
            workouts: await workouts
              .find(
                {
                  clerkUserId,
                  startedAt: {
                    $gte: new Date(Date.parse(a.startedAt) - RETAKE_LOOKBACK_MS),
                    $lt: new Date(a.startedAt),
                  },
                },
                { projection: { startedAt: 1, assessment: 1, workoutExercises: 1 }, session },
              )
              .toArray()
              .then((docs) => docs.map((doc) => ({ ...doc, startedAt: doc.startedAt.toISOString() }))),
            assessment: result.assessment,
            aStartedAt: a.startedAt,
            timeZone: user.timeZone,
          })
        : new Set<string>();
      const stored = await workingLevels
        .find({ clerkUserId, slug: { $in: [...kept] } }, { projection: { slug: 1 }, session })
        .toArray();
      const keptSlugs = stored.map(({ slug }) => slug);
      await workingLevels.deleteMany({ clerkUserId, slug: { $nin: keptSlugs } }, { session });
      const replaced = result.workingLevels.filter(({ slug }) => !keptSlugs.includes(slug));
      if (replaced.length) {
        await workingLevels.insertMany(
          replaced.map((level) => ({ ...level, clerkUserId, assessmentId: id })),
          { session },
        );
      }
    }),
  );
}

// #131's one-off migration, safe to run repeatedly: each Working Level stored before it (no misses) in the new shape
// (migrateWorkingLevel), moved by the B of the Assessment that set it. The user's current plan was built from the old
// levels, so it's made due (a plan without builtAt is due once) and the next visit to Today rebuilds it
export async function migrateWorkingLevels() {
  const legacy = await workingLevels.find({ misses: { $exists: false } }).toArray();
  for (const clerkUserId of new Set(legacy.map((doc) => doc.clerkUserId))) {
    const docs = legacy.filter((doc) => doc.clerkUserId === clerkUserId);
    const user = await findUser(clerkUserId);
    const equipmentProfiles = user ? equipmentProfilesOf(user) : [];
    const setBy = new Map<string, WorkingLevelMover | null>();
    for (const { assessmentId } of docs) {
      if (setBy.has(assessmentId)) continue;
      const assessment = await assessments.findOne({ clerkUserId, id: assessmentId });
      setBy.set(
        assessmentId,
        assessment && { workoutId: assessment.bWorkoutId, startedAt: assessment.bStartedAt.toISOString() },
      );
    }
    for (const doc of docs) {
      const { _id, assessmentId } = doc;
      const level = migrateWorkingLevel(doc as LegacyWorkingLevel, equipmentProfiles, setBy.get(assessmentId)!);
      // Parsing drops the document's own fields, which the replacement sets again
      await workingLevels.replaceOne(
        { _id, misses: { $exists: false } },
        { ...WorkingLevel.parse(level), clerkUserId, assessmentId },
      );
    }
    // By name, as planned-workouts.ts imports this module
    await db.collection("plannedWorkouts").updateMany({ clerkUserId, status: "current" }, { $unset: { builtAt: "" } });
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

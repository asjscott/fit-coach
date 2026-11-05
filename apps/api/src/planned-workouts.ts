import { randomUUID } from "node:crypto";
import type { WithId } from "mongodb";
import { planWorkout } from "@fit/engines";
import { PlannedWorkout } from "@fit/shared";
import { findLatestAssessment } from "./assessments";
import { client, db } from "./db";
import { findOnboardedUser, type OnboardedUser } from "./users";
import { findWorkoutsSince, toWorkout } from "./workouts";

type PlannedWorkoutDoc = Omit<PlannedWorkout, "createdAt"> & { clerkUserId: string; createdAt: Date };

export const plannedWorkouts = db.collection<PlannedWorkoutDoc>("plannedWorkouts");

const DAY_MS = 24 * 60 * 60 * 1000;
// Reaches the Monday of last week in any timezone; the planner keeps what's actually in each week
const PLAN_LOOKBACK_MS = 15 * DAY_MS;

export async function ensurePlannedWorkoutIndexes() {
  await plannedWorkouts.createIndex({ clerkUserId: 1, id: 1 }, { unique: true });
  // One at a time: a rebuild racing another fails, and the upload's retry finds the winner
  await plannedWorkouts.createIndex(
    { clerkUserId: 1 },
    { unique: true, partialFilterExpression: { status: "current" } },
  );
}

const findCurrent = (clerkUserId: string) => plannedWorkouts.findOne({ clerkUserId, status: "current" });

// The Planned Workout to train next, or null before the first Assessment
export async function findCurrentPlannedWorkout(clerkUserId: string) {
  const doc = await findCurrent(clerkUserId);
  return doc && toPlannedWorkout(doc);
}

// Replaces the current plan with one built from the user's data as it stands now, keeping the old one. Does nothing
// before the first Assessment, since the Coach has no Working Levels to prescribe from
async function rebuildPlannedWorkout(clerkUserId: string, user: OnboardedUser) {
  const latest = await findLatestAssessment(clerkUserId);
  const equipmentProfile = user.equipmentProfiles.find(({ isPrimary }) => isPrimary);
  if (!latest || !equipmentProfile) return;

  const now = new Date();
  const recent = await findWorkoutsSince(clerkUserId, new Date(now.getTime() - PLAN_LOOKBACK_MS));
  const plan = planWorkout({
    workouts: recent.map(toWorkout),
    now,
    timeZone: user.timeZone,
    equipmentProfile,
    injuries: user.injuries,
    workingLevels: latest.workingLevels,
    assessment: latest.assessment,
    goal: user.goal,
    daysPerWeek: user.daysPerWeek,
  });

  await client.withSession((session) =>
    session.withTransaction(async () => {
      await plannedWorkouts.updateMany(
        { clerkUserId, status: "current" },
        { $set: { status: "replaced" } },
        { session },
      );
      if (!plan.plannedExercises.length) return;
      await plannedWorkouts.insertOne(
        { ...plan, id: randomUUID(), status: "current", clerkUserId, createdAt: new Date() },
        { session },
      );
    }),
  );
}

// For a Profile change that shapes the plan. Before onboarding there's nothing to plan from
export async function rebuildAfterProfileChange(clerkUserId: string) {
  const user = await findOnboardedUser(clerkUserId);
  if (user) await rebuildPlannedWorkout(clerkUserId, user);
}

// Only a current plan can finish: one already replaced stays replaced, and a retried upload changes nothing
export async function finishPlannedWorkout(clerkUserId: string, id: string) {
  await plannedWorkouts.updateOne({ clerkUserId, id, status: "current" }, { $set: { status: "finished" } });
}

// For every uploaded Workout. A retry (not created) rebuilds only if its first attempt failed before the plan did:
// a plan newer than the Workout has counted it already, so retries don't pile up replaced plans
export async function rebuildAfterUpload(
  clerkUserId: string,
  user: OnboardedUser,
  { created, uploadedAt }: { created: boolean; uploadedAt: Date },
) {
  if (!created) {
    const current = await findCurrent(clerkUserId);
    if (current && current.createdAt >= uploadedAt) return;
  }
  await rebuildPlannedWorkout(clerkUserId, user);
}

function toPlannedWorkout({ id, status, weekStart, createdAt, plannedExercises, cue }: WithId<PlannedWorkoutDoc>) {
  return PlannedWorkout.parse({ id, status, weekStart, createdAt: createdAt.toISOString(), plannedExercises, cue });
}

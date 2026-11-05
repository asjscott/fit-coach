import { randomUUID } from "node:crypto";
import type { WithId } from "mongodb";
import { planInputsKey, planIsDue, planWorkout } from "@fit/engines";
import { PlannedWorkout } from "@fit/shared";
import { findLatestAssessment } from "./assessments";
import { client, db } from "./db";
import { findOnboardedUser, type OnboardedUser } from "./users";
import { findWorkoutsSince, toWorkout } from "./workouts";

// builtFrom is absent on a plan from before it existed, which counts as due for a rebuild
type PlannedWorkoutDoc = Omit<PlannedWorkout, "createdAt"> & {
  clerkUserId: string;
  createdAt: Date;
  builtFrom?: string;
};

export const plannedWorkouts = db.collection<PlannedWorkoutDoc>("plannedWorkouts");

const DAY_MS = 24 * 60 * 60 * 1000;
// Reaches the Monday of this week in any timezone; the Week Ledger keeps what's actually in the week
const WEEK_LEDGER_LOOKBACK_MS = 8 * DAY_MS;

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

const primaryProfile = ({ equipmentProfiles }: OnboardedUser) => equipmentProfiles.find(({ isPrimary }) => isPrimary);

// Replaces the current plan with one built from the user's data as it stands now, keeping the old one. Does nothing
// before the first Assessment, since the Coach has no Working Levels to prescribe from
async function rebuildPlannedWorkout(clerkUserId: string, user: OnboardedUser) {
  const latest = await findLatestAssessment(clerkUserId);
  const equipmentProfile = primaryProfile(user);
  if (!latest || !equipmentProfile) return;

  const now = new Date();
  const recent = await findWorkoutsSince(clerkUserId, new Date(now.getTime() - WEEK_LEDGER_LOOKBACK_MS));
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
        {
          ...plan,
          id: randomUUID(),
          status: "current",
          clerkUserId,
          createdAt: new Date(),
          builtFrom: planInputsKey({ ...user, equipmentProfile }),
        },
        { session },
      );
    }),
  );
}

// Rebuilds the plan if one is due (planIsDue), and gives the plan to train next, or null when there can't be one.
// Before onboarding there's nothing to plan from
export async function currentOrRebuiltPlannedWorkout(clerkUserId: string) {
  const user = await findOnboardedUser(clerkUserId);
  const equipmentProfile = user && primaryProfile(user);
  if (!user || !equipmentProfile) return null;
  const inputs = { ...user, equipmentProfile };
  if (planIsDue(await findCurrent(clerkUserId), inputs, new Date(), user.timeZone)) {
    await rebuildPlannedWorkout(clerkUserId, user);
  }
  return findCurrentPlannedWorkout(clerkUserId);
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

function toPlannedWorkout({ id, status, weekStart, createdAt, plannedExercises }: WithId<PlannedWorkoutDoc>) {
  return PlannedWorkout.parse({ id, status, weekStart, createdAt: createdAt.toISOString(), plannedExercises });
}

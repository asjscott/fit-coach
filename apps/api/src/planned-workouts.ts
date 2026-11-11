import { randomUUID } from "node:crypto";
import type { WithId } from "mongodb";
import { isSamePlan, planInputsKey, planIsDue, planWorkout, weekOfBlock } from "@fit/engines";
import { PlannedWorkout } from "@fit/shared";
import { findLatestAssessment } from "./assessments";
import { client, db } from "./db";
import { findOnboardedUser, type OnboardedUser } from "./users";
import { findWorkoutsSince, toWorkout } from "./workouts";

// builtFrom and builtAt are absent on a plan from before they existed, which counts as due for a rebuild. builtAt is
// when it was last built: a rebuild that gives the same plan moves it on and keeps the plan
type PlannedWorkoutDoc = Omit<PlannedWorkout, "createdAt"> & {
  clerkUserId: string;
  createdAt: Date;
  builtFrom?: string;
  builtAt?: Date;
};

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

// What a plan is built from, or null without a primary Equipment Profile
function planInputs(user: OnboardedUser) {
  const equipmentProfile = user.equipmentProfiles.find(({ isPrimary }) => isPrimary);
  return equipmentProfile ? { ...user, equipmentProfile } : null;
}

// Replaces the current plan with one built from the user's data as it stands now, keeping the old one, unless it's the
// same plan, which stays with its id. Does nothing before the first Assessment, since the Coach has no Working Levels
// to prescribe from
async function rebuildPlannedWorkout(clerkUserId: string, user: OnboardedUser) {
  const latest = await findLatestAssessment(clerkUserId);
  const inputs = planInputs(user);
  if (!latest || !inputs) return;

  const now = new Date();
  const recent = await findWorkoutsSince(clerkUserId, new Date(now.getTime() - PLAN_LOOKBACK_MS));
  const built = planWorkout({
    workouts: recent.map(toWorkout),
    now,
    timeZone: user.timeZone,
    equipmentProfile: inputs.equipmentProfile,
    injuries: user.injuries,
    workingLevels: latest.workingLevels,
    assessment: latest.assessment,
    goal: user.goal,
    daysPerWeek: user.daysPerWeek,
    includeJumps: user.includeJumps,
    deloadWeek: weekOfBlock(latest.assessment, now, user.timeZone)?.deload ?? false,
  });

  // The Muscles held back are stored as the recovering reason
  const { weekStart, plannedExercises, cue, reasons } = built;
  const plan = { weekStart, plannedExercises, ...(cue && { cue }) };
  const builtFrom = planInputsKey(inputs);
  await client.withSession((session) =>
    session.withTransaction(async () => {
      const current = await plannedWorkouts.findOne({ clerkUserId, status: "current" }, { session });
      if (current && current.builtFrom === builtFrom && isSamePlan(current, plan)) {
        // The same Exercises can have new reasons, such as the day's recovery, which update in place
        await plannedWorkouts.updateOne({ _id: current._id }, { $set: { builtAt: now, reasons } }, { session });
        return;
      }
      await plannedWorkouts.updateMany(
        { clerkUserId, status: "current" },
        { $set: { status: "replaced" } },
        { session },
      );
      if (!plan.plannedExercises.length) return;
      await plannedWorkouts.insertOne(
        {
          ...plan,
          reasons,
          id: randomUUID(),
          status: "current",
          clerkUserId,
          createdAt: now,
          builtFrom,
          builtAt: now,
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
  const inputs = user && planInputs(user);
  if (!user || !inputs) return null;
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
    if (current && (current.builtAt ?? current.createdAt) >= uploadedAt) return;
  }
  await rebuildPlannedWorkout(clerkUserId, user);
}

function toPlannedWorkout({
  id,
  status,
  weekStart,
  createdAt,
  plannedExercises,
  cue,
  reasons,
}: WithId<PlannedWorkoutDoc>) {
  const createdAtIso = createdAt.toISOString();
  return PlannedWorkout.parse({ id, status, weekStart, createdAt: createdAtIso, plannedExercises, cue, reasons });
}

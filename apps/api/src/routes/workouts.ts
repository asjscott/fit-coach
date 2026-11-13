import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { isRecoveryWorkout } from "@fit/engines";
import { ErrorResponse, PreviousSets, PreviousSetsQuery, Workout, WorkoutsQuery, WorkoutUpload } from "@fit/shared";
import { z } from "zod";
import { assessIfPaired } from "../assessments";
import { requireAuth, userIdOf } from "../auth";
import { finishPlannedWorkout, rebuildAfterUpload } from "../planned-workouts";
import { progressWorkingLevels } from "../progression";
import { findOnboardedUser } from "../users";
import { createWorkout, deleteWorkout, findPreviousSets, findWorkouts, recordPrs, toWorkout } from "../workouts";

// The signed-in user's finished Workouts. Checks shape only: an Exercise slug the
// server's library doesn't know is accepted, so an upload can never get stuck
export const workoutRoutes: FastifyPluginAsyncZod = async (app) => {
  // Every route in this file needs a signed-in user
  app.addHook("preHandler", requireAuth);

  // History, newest first by start time. Pass the last Workout's startedAt and id as
  // before and beforeId for the next page
  app.get("/workouts", { schema: { querystring: WorkoutsQuery, response: { 200: z.array(Workout) } } }, async (req) =>
    (await findWorkouts(userIdOf(req)!, req.query)).map(toWorkout),
  );

  // The user's Previous Sets for one Exercise with that Workout's times, or null when no Workout has it
  app.get(
    "/workouts/previous-sets",
    { schema: { querystring: PreviousSetsQuery, response: { 200: PreviousSets.nullable() } } },
    async (req) => findPreviousSets(userIdOf(req)!, req.query.slug),
  );

  // Idempotent on the phone-generated id: 201 when stored, 200 with the stored Workout when it was already uploaded.
  // Also works out any Assessment it completes, marks the Planned Workout it came from finished and rebuilds the
  // Planned Workout, unless it's a Recovery Workout, which changes no plan. Answers with the Workout's PRs. 403 before
  // onboarding, which the app never offers logging before. 400 for a start more than 7 days before its last Set
  // (WorkoutUpload, #129)
  app.post(
    "/workouts",
    { schema: { body: WorkoutUpload, response: { 200: Workout, 201: Workout, 403: ErrorResponse } } },
    async (req, reply) => {
      const clerkUserId = userIdOf(req)!;
      const user = await findOnboardedUser(clerkUserId);
      if (!user) return reply.code(403).send({ error: "finish onboarding first" });
      const { workout, created } = await createWorkout(clerkUserId, req.body);
      const stored = toWorkout(workout);
      // A failure fails the upload, though the Workout is stored: the phone keeps it Pending, and its retry (the 200
      // case) pairs it again, so the Assessment isn't lost
      await assessIfPaired(clerkUserId, stored, user);
      // Progression (#132): after pairing, so a retake's levels are the ones moved, and before the rebuild, so the
      // next plan uses them. A failure fails the upload in the same way, and the retry moves what it didn't
      await progressWorkingLevels(clerkUserId, stored, user);
      // PRs (#130): found once and stored against the Workout, so the 200 retry answers with the same ones
      stored.prs = await recordPrs(clerkUserId, workout);
      // Before the rebuild, which would otherwise mark its plan replaced
      if (stored.plannedWorkoutId) await finishPlannedWorkout(clerkUserId, stored.plannedWorkoutId);
      // After pairing, so a retake's plan uses the new Working Levels. A failure fails the upload in the same way.
      // A Recovery Workout isn't training, so the plan, and its id, stay as they are
      if (!isRecoveryWorkout(stored)) {
        await rebuildAfterUpload(clerkUserId, user, { created, uploadedAt: workout.uploadedAt });
      }
      return reply.code(created ? 201 : 200).send(stored);
    },
  );

  // 204 when deleted; 404 when the Workout isn't this user's or doesn't exist
  app.delete(
    "/workouts/:id",
    { schema: { params: z.object({ id: z.string() }), response: { 204: z.null(), 404: ErrorResponse } } },
    async (req, reply) => {
      const deleted = await deleteWorkout(userIdOf(req)!, req.params.id);
      if (!deleted) return reply.code(404).send({ error: "workout not found" });
      return reply.code(204).send(null);
    },
  );
};

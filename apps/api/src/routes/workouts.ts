import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { ErrorResponse, PreviousSets, PreviousSetsQuery, Workout, WorkoutsQuery } from "@fit/shared";
import { z } from "zod";
import { requireAuth, userIdOf } from "../auth";
import { createWorkout, deleteWorkout, findPreviousSets, findWorkouts, toWorkout } from "../workouts";

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

  // Idempotent on the phone-generated id: 201 when stored, 200 with the stored Workout
  // when it was already uploaded, so a retried upload never makes a duplicate
  app.post("/workouts", { schema: { body: Workout, response: { 200: Workout, 201: Workout } } }, async (req, reply) => {
    const { workout, created } = await createWorkout(userIdOf(req)!, req.body);
    return reply.code(created ? 201 : 200).send(toWorkout(workout));
  });

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

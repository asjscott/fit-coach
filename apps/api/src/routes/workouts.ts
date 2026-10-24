import { getAuth } from "@clerk/fastify";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { Workout } from "@fit/shared";
import { requireAuth } from "../auth";
import { createWorkout, toWorkout } from "../workouts";

// The signed-in user's finished Workouts. Checks shape only: an Exercise slug the
// server's library doesn't know is accepted, so an upload can never get stuck
export const workoutRoutes: FastifyPluginAsyncZod = async (app) => {
  // Every route in this file needs a signed-in user
  app.addHook("preHandler", requireAuth);

  // Idempotent on the phone-generated id: 201 when stored, 200 with the stored Workout
  // when it was already uploaded, so a retried upload never makes a duplicate
  app.post(
    "/workouts",
    { schema: { body: Workout, response: { 200: Workout, 201: Workout } } },
    async (req, reply) => {
      const { workout, created } = await createWorkout(getAuth(req).userId!, req.body);
      return reply.code(created ? 201 : 200).send(toWorkout(workout));
    },
  );
};

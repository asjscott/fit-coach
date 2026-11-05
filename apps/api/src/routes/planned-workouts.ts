import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { PlannedWorkout } from "@fit/shared";
import { requireAuth, userIdOf } from "../auth";
import { findCurrentPlannedWorkout } from "../planned-workouts";

// The signed-in user's Planned Workouts, built by POST /workouts (ADR 0003)
export const plannedWorkoutRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("preHandler", requireAuth);

  // The Planned Workout to train next, or null before the first Assessment
  app.get("/planned-workouts/current", { schema: { response: { 200: PlannedWorkout.nullable() } } }, async (req) =>
    findCurrentPlannedWorkout(userIdOf(req)!),
  );
};

import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { PlannedWorkout } from "@fit/shared";
import { requireAuth, userIdOf } from "../auth";
import { currentOrRebuiltPlannedWorkout } from "../planned-workouts";

// The signed-in user's Planned Workouts, built by POST /workouts and the Profile routes (ADR 0003)
export const plannedWorkoutRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("preHandler", requireAuth);

  // The Planned Workout to train next, or null before the first Assessment, after building one if one is due (none yet,
  // a new week, or a rebuild that failed). Idempotent, so the phone asks on every visit and only the server decides
  app.post("/planned-workouts/current", { schema: { response: { 200: PlannedWorkout.nullable() } } }, async (req) =>
    currentOrRebuiltPlannedWorkout(userIdOf(req)!),
  );
};

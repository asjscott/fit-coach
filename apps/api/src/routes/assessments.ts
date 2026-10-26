import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { LatestAssessment } from "@fit/shared";
import { requireAuth, userIdOf } from "../auth";
import { findLatestAssessment } from "../assessments";

// The signed-in user's Assessments, worked out by POST /workouts when a pair of Assessment Workouts is complete
export const assessmentRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("preHandler", requireAuth);

  // The newest Assessment with its Working Levels, or null before the first
  app.get("/assessments/latest", { schema: { response: { 200: LatestAssessment } } }, async (req) =>
    findLatestAssessment(userIdOf(req)!),
  );
};

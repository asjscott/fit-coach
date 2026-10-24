import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { ErrorResponse, Exercise } from "@fit/shared";
import { z } from "zod";
import { requireAuth } from "../auth";
import { findExercise, findExercises } from "../exercises";

// The exercise library, seeded by scripts/seed-exercises.ts
export const exerciseRoutes: FastifyPluginAsyncZod = async (app) => {
  // Every route in this file needs a signed-in user
  app.addHook("preHandler", requireAuth);

  // Sorted by name
  app.get("/exercises", { schema: { response: { 200: z.array(Exercise) } } }, () => findExercises());

  app.get(
    "/exercises/:slug",
    { schema: { params: z.object({ slug: z.string() }), response: { 200: Exercise, 404: ErrorResponse } } },
    async (req, reply) => {
      const exercise = await findExercise(req.params.slug);
      if (!exercise) return reply.code(404).send({ error: "exercise not found" });
      return exercise;
    },
  );
};

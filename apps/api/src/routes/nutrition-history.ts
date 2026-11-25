import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { ErrorResponse, LocalDate, NutritionWeek } from "@fit/shared";
import { z } from "zod";
import { requireAuth, userIdOf } from "../auth";
import { findNutritionWeek } from "../nutrition-history";

// Any date of the week, or "today" for this week in the user's timezone
const WeekParams = z.object({ date: z.union([z.literal("today"), LocalDate]) });

// The signed-in user's Nutrition History, a week at a time
export const nutritionHistoryRoutes: FastifyPluginAsyncZod = async (app) => {
  // Every route in this file needs a signed-in user
  app.addHook("preHandler", requireAuth);

  // The week the date is in, Monday to Sunday. 403 before onboarding
  app.get(
    "/nutrition-history/:date",
    { schema: { params: WeekParams, response: { 200: NutritionWeek, 403: ErrorResponse } } },
    async (req, reply) => {
      const week = await findNutritionWeek(userIdOf(req)!, req.params.date);
      if (!week) return reply.code(403).send({ error: "finish onboarding first" });
      return week;
    },
  );
};

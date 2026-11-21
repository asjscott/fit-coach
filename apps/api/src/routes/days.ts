import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { Day, ErrorResponse, LocalDate } from "@fit/shared";
import { z } from "zod";
import { requireAuth, userIdOf } from "../auth";
import { findDay } from "../days";

// A local date, or "today" for today in the user's timezone, which the server knows and the phone needn't work out
const DayParams = z.object({ date: z.union([z.literal("today"), LocalDate]) });

// The signed-in user's days: what Today's rings and the Food tab read
export const dayRoutes: FastifyPluginAsyncZod = async (app) => {
  // Every route in this file needs a signed-in user
  app.addHook("preHandler", requireAuth);

  // The day's Daily Targets and what's been eaten against them. 403 before onboarding
  app.get(
    "/days/:date",
    { schema: { params: DayParams, response: { 200: Day, 403: ErrorResponse } } },
    async (req, reply) => {
      const day = await findDay(userIdOf(req)!, req.params.date);
      if (!day) return reply.code(403).send({ error: "finish onboarding first" });
      return day;
    },
  );
};

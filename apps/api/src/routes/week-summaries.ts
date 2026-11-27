import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { ErrorResponse, LocalDate, WeekSummary, WeekSummaryMonday } from "@fit/shared";
import { z } from "zod";
import { requireAuth, userIdOf } from "../auth";
import { findWeekSummary, markWeekSeen } from "../week-summaries";

// The signed-in user's Week Summaries (ADR 0009): worked out live each time they're asked for, with only "seen" stored
export const weekSummaryRoutes: FastifyPluginAsyncZod = async (app) => {
  // Every route in this file needs a signed-in user
  app.addHook("preHandler", requireAuth);

  // The week starting on :monday, or "latest" for the week just ended. 403 before onboarding; 404 for a week before
  // the user onboarded, one not yet started, or a date that isn't a Monday
  app.get(
    "/week-summaries/:monday",
    {
      schema: {
        params: z.object({ monday: WeekSummaryMonday }),
        response: { 200: WeekSummary, 403: ErrorResponse, 404: ErrorResponse },
      },
    },
    async (req, reply) => {
      const summary = await findWeekSummary(userIdOf(req)!, req.params.monday);
      if (summary === "not-onboarded") return reply.code(403).send({ error: "finish onboarding first" });
      if (summary === "no-such-week") return reply.code(404).send({ error: "no Week Summary for that week" });
      return summary;
    },
  );

  // Records that the user has seen the week's summary, on whichever phone. Idempotent: 204 however often it's sent
  app.put(
    "/week-summaries/:monday/seen",
    { schema: { params: z.object({ monday: LocalDate }) } },
    async (req, reply) => {
      await markWeekSeen(userIdOf(req)!, req.params.monday);
      return reply.code(204).send();
    },
  );
};

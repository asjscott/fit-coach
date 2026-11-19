import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { isLoggableDate } from "@fit/engines";
import { ErrorResponse, FoodProposals, TellTheCoach, TellTheCoachStatus } from "@fit/shared";
import { requireAuth, userIdOf } from "../auth";
import { badRequest } from "../bad-request";
import type { FoodSources } from "../food-sources";
import { findUser } from "../users";

// Tell the coach (spec #158): words in, proposed Food Entries out. Nothing is saved here: the phone confirms each
// proposal and logs it through POST /days/:date/food-entries. The parser's key stays on the server
export const tellTheCoachRoutes: FastifyPluginAsyncZod<{ foodSources: FoodSources }> = async (app, { foodSources }) => {
  // Every route in this file needs a signed-in user
  app.addHook("preHandler", requireAuth);

  // Whether the box shows: only when the API has a parser
  app.get("/tell-the-coach", { schema: { response: { 200: TellTheCoachStatus } } }, async () => ({
    available: !!foodSources.parse,
  }));

  // 200 with the foods the words describe, maybe none. 503 without a parser, 502 when it can't be reached
  app.post(
    "/tell-the-coach",
    { schema: { body: TellTheCoach, response: { 200: FoodProposals, 502: ErrorResponse, 503: ErrorResponse } } },
    async (req, reply) => {
      const { text, today } = req.body;
      const timeZone = (await findUser(userIdOf(req)!))?.timeZone ?? "UTC";
      // The phone's today, which may be a day off the server's near midnight, but never outside the days that log
      if (!isLoggableDate(today, new Date(), timeZone)) throw badRequest("today must be a day Food Entries can go in");
      if (!foodSources.parse) return reply.code(503).send({ error: "Tell the coach isn't set up" });
      try {
        return { proposals: await foodSources.parse(text, today) };
      } catch (err) {
        req.log.error(err, "Tell the coach couldn't parse");
        return reply.code(502).send({ error: "Tell the coach is unavailable" });
      }
    },
  );
};

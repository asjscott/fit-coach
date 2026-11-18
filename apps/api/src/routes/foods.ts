import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { ErrorResponse, FoodSearchQuery, FoodSearchResults } from "@fit/shared";
import { requireAuth } from "../auth";
import type { FoodSources } from "../food-sources";

// Finding food. The phone never calls a food source itself: this proxies them, so their keys stay on the server
export const foodRoutes: FastifyPluginAsyncZod<{ foodSources: FoodSources }> = async (app, { foodSources }) => {
  // Every route in this file needs a signed-in user
  app.addHook("preHandler", requireAuth);

  // Foods matching the words, generic before branded (spec #158 story 64). 502 when the source is down
  app.get(
    "/foods/search",
    { schema: { querystring: FoodSearchQuery, response: { 200: FoodSearchResults, 502: ErrorResponse } } },
    async (req, reply) => {
      try {
        const { generic, branded } = await foodSources.search(req.query.q);
        return { foods: [...generic, ...branded] };
      } catch (err) {
        req.log.error(err, "Food search failed");
        return reply.code(502).send({ error: "food search is unavailable" });
      }
    },
  );
};

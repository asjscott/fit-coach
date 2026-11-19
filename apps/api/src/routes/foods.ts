import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { BarcodeParams, ErrorResponse, Food, FoodSearchQuery, FoodSearchResults } from "@fit/shared";
import { requireAuth, userIdOf } from "../auth";
import type { FoodSources } from "../food-sources";
import { findSavedFoodByBarcode, searchSavedFoods } from "../saved-foods";

// Finding food. The phone never calls a food source itself: this proxies them, so their keys stay on the server
export const foodRoutes: FastifyPluginAsyncZod<{ foodSources: FoodSources }> = async (app, { foodSources }) => {
  // Every route in this file needs a signed-in user
  app.addHook("preHandler", requireAuth);

  // Foods matching the words: the user's Saved Foods by name, then generic before branded (spec #158 stories 64 and
  // 69). 502 when the source is down
  app.get(
    "/foods/search",
    { schema: { querystring: FoodSearchQuery, response: { 200: FoodSearchResults, 502: ErrorResponse } } },
    async (req, reply) => {
      try {
        const [saved, { generic, branded }] = await Promise.all([
          searchSavedFoods(userIdOf(req)!, req.query.q),
          foodSources.search(req.query.q),
        ]);
        return { foods: [...saved, ...generic, ...branded] };
      } catch (err) {
        req.log.error(err, "Food search failed");
        return reply.code(502).send({ error: "food search is unavailable" });
      }
    },
  );

  // The packaged food with this barcode: the user's own Saved Foods, then the outside sources (spec #158 stories 65
  // to 68). 404 when none has it, which is when the phone offers Create food; 502 when the sources are down
  app.get(
    "/foods/barcode/:code",
    {
      schema: {
        params: BarcodeParams,
        response: { 200: Food, 404: ErrorResponse, 502: ErrorResponse },
      },
    },
    async (req, reply) => {
      const { code } = req.params;
      const saved = await findSavedFoodByBarcode(userIdOf(req)!, code);
      if (saved) return saved;
      try {
        const food = await foodSources.byBarcode(code);
        if (food) return food;
      } catch (err) {
        req.log.error(err, "Barcode lookup failed");
        return reply.code(502).send({ error: "barcode lookup is unavailable" });
      }
      return reply.code(404).send({ error: "no food has that barcode" });
    },
  );
};

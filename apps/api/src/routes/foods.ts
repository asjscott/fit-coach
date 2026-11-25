import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { BarcodeParams, ErrorResponse, Food, FoodSearchQuery, FoodSearchResults } from "@fit/shared";
import { requireAuth, userIdOf } from "../auth";
import type { FoodSources } from "../food-sources";
import { findSavedFoodByBarcode } from "../saved-foods";
import { searchSavedFoodsAndMeals } from "../saved-foods-and-meals";

// Finding food. The phone never calls a food source itself: this proxies them, so their keys stay on the server
export const foodRoutes: FastifyPluginAsyncZod<{ foodSources: FoodSources }> = async (app, { foodSources }) => {
  // Every route in this file needs a signed-in user
  app.addHook("preHandler", requireAuth);

  // Foods matching the words: the user's Saved Foods and Saved Meals by name, then generic before branded (spec #158
  // stories 64 and 69, #188 story 38). With the outside source down, only theirs, flagged so the phone can say so
  app.get(
    "/foods/search",
    { schema: { querystring: FoodSearchQuery, response: { 200: FoodSearchResults } } },
    async (req) => {
      const [saved, outside] = await Promise.all([
        searchSavedFoodsAndMeals(userIdOf(req)!, req.query.q),
        foodSources.search(req.query.q).catch((err: unknown) => {
          req.log.error(err, "Food search failed");
          return null;
        }),
      ]);
      if (!outside) return { foods: saved, outsideUnavailable: true };
      return { foods: [...saved, ...outside.generic, ...outside.branded] };
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

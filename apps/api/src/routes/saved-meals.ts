import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { ErrorResponse, Food, SavedMealCreate, SavedMealInput } from "@fit/shared";
import { z } from "zod";
import { requireAuth, userIdOf } from "../auth";
import { badRequest } from "../bad-request";
import { createSavedMeal, deleteSavedMeal, updateSavedMeal } from "../saved-meals";

const IdParams = z.object({ id: z.string() });
const NO_SUCH_SERVING = "An ingredient has no serving by that name";
const NO_SUCH_SAVED_MEAL = { error: "no such saved meal" };

// The signed-in user's Saved Meals (spec #188), each answered as the Food it's logged as. GET /saved-foods lists them.
// Logging one copies it into the Food Entry, so editing or deleting one never changes a day already logged
export const savedMealRoutes: FastifyPluginAsyncZod = async (app) => {
  // Every route in this file needs a signed-in user
  app.addHook("preHandler", requireAuth);

  // 201 with the Saved Meal, or 200 with the one a request with the same id already made
  app.post(
    "/saved-meals",
    { schema: { body: SavedMealCreate, response: { 200: Food, 201: Food } } },
    async (req, reply) => {
      const made = await createSavedMeal(userIdOf(req)!, req.body);
      if (made === "noServing") throw badRequest(NO_SUCH_SERVING);
      return reply.code(made.created ? 201 : 200).send(made.food);
    },
  );

  // 200 with the edited Saved Meal. Food Entries already logged from it don't change
  app.put(
    "/saved-meals/:id",
    { schema: { params: IdParams, body: SavedMealInput, response: { 200: Food, 404: ErrorResponse } } },
    async (req, reply) => {
      const food = await updateSavedMeal(userIdOf(req)!, req.params.id, req.body);
      if (!food) return reply.code(404).send(NO_SUCH_SAVED_MEAL);
      if (food === "noServing") throw badRequest(NO_SUCH_SERVING);
      return food;
    },
  );

  // 204 once deleted. Food Entries already logged from it stay
  app.delete(
    "/saved-meals/:id",
    { schema: { params: IdParams, response: { 204: z.null(), 404: ErrorResponse } } },
    async (req, reply) => {
      if (!(await deleteSavedMeal(userIdOf(req)!, req.params.id))) return reply.code(404).send(NO_SUCH_SAVED_MEAL);
      return reply.code(204).send(null);
    },
  );
};

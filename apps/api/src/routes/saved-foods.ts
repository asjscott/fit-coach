import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { ErrorResponse, Food, SavedFoodInput, SavedFoods } from "@fit/shared";
import { z } from "zod";
import { requireAuth, userIdOf } from "../auth";
import { createSavedFood, deleteSavedFood, updateSavedFood } from "../saved-foods";
import { savedFoodsAndMeals } from "../saved-foods-and-meals";

const IdParams = z.object({ id: z.string() });
const BARCODE_TAKEN = { error: "one of your Saved Foods already has that barcode" };
const NO_SUCH_FOOD = { error: "no such saved food" };

// The signed-in user's Saved Foods: foods made from a label (spec #158 stories 67 to 70). Logging one copies it into
// the Food Entry, so editing or deleting one never changes a day already logged
export const savedFoodRoutes: FastifyPluginAsyncZod = async (app) => {
  // Every route in this file needs a signed-in user
  app.addHook("preHandler", requireAuth);

  // Create food: 201 with the Saved Food, linked to its barcode when there is one. 409 when another already has it
  app.post(
    "/saved-foods",
    { schema: { body: SavedFoodInput, response: { 201: Food, 409: ErrorResponse } } },
    async (req, reply) => {
      const food = await createSavedFood(userIdOf(req)!, req.body);
      if (food === "taken") return reply.code(409).send(BARCODE_TAKEN);
      return reply.code(201).send(food);
    },
  );

  // The user's Saved Foods and Saved Meals, by name
  app.get("/saved-foods", { schema: { response: { 200: SavedFoods } } }, async (req) => ({
    foods: await savedFoodsAndMeals(userIdOf(req)!),
  }));

  // 200 with the edited Saved Food. Food Entries already logged from it don't change
  app.put(
    "/saved-foods/:id",
    {
      schema: {
        params: IdParams,
        body: SavedFoodInput,
        response: { 200: Food, 404: ErrorResponse, 409: ErrorResponse },
      },
    },
    async (req, reply) => {
      const food = await updateSavedFood(userIdOf(req)!, req.params.id, req.body);
      if (!food) return reply.code(404).send(NO_SUCH_FOOD);
      if (food === "taken") return reply.code(409).send(BARCODE_TAKEN);
      return food;
    },
  );

  // 204 once deleted. Food Entries already logged from it stay
  app.delete(
    "/saved-foods/:id",
    { schema: { params: IdParams, response: { 204: z.null(), 404: ErrorResponse } } },
    async (req, reply) => {
      if (!(await deleteSavedFood(userIdOf(req)!, req.params.id))) return reply.code(404).send(NO_SUCH_FOOD);
      return reply.code(204).send(null);
    },
  );
};

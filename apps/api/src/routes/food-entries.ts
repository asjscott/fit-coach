import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { ErrorResponse, FoodEntry, FoodEntryAdd, FoodEntryChange, LocalDate } from "@fit/shared";
import { z } from "zod";
import { requireAuth, userIdOf } from "../auth";
import { addFoodEntry, changeFoodEntry, deleteFoodEntry, findFoodEntry } from "../food-entries";
import { loggableDate, NOT_LOGGABLE } from "../loggable-date";

// A local date, or "today" in the user's timezone, as GET /days/:date takes
const DayParams = z.object({ date: z.union([z.literal("today"), LocalDate]) });
const EntryParams = z.object({ id: z.string() });

// The signed-in user's Food Entries. Logging needs a connection: the phone keeps no queue of these
export const foodEntryRoutes: FastifyPluginAsyncZod = async (app) => {
  // Every route in this file needs a signed-in user
  app.addHook("preHandler", requireAuth);

  // 201 with the new Food Entry
  app.post(
    "/days/:date/food-entries",
    { schema: { params: DayParams, body: FoodEntryAdd, response: { 201: FoodEntry, 400: ErrorResponse } } },
    async (req, reply) => {
      const clerkUserId = userIdOf(req)!;
      const date = await loggableDate(clerkUserId, req.params.date);
      if (!date) return reply.code(400).send({ error: NOT_LOGGABLE });
      const entry = await addFoodEntry(clerkUserId, date, req.body);
      if (!entry) return reply.code(400).send({ error: "the food has no such serving" });
      return reply.code(201).send(entry);
    },
  );

  // 200 with the changed Food Entry. A day more than 6 days ago can no longer change
  app.patch(
    "/food-entries/:id",
    {
      schema: {
        params: EntryParams,
        body: FoodEntryChange,
        response: { 200: FoodEntry, 400: ErrorResponse, 404: ErrorResponse },
      },
    },
    async (req, reply) => {
      const clerkUserId = userIdOf(req)!;
      const entry = await findFoodEntry(clerkUserId, req.params.id);
      if (!entry) return reply.code(404).send({ error: "no such food entry" });
      if (!(await loggableDate(clerkUserId, entry.date))) return reply.code(400).send({ error: NOT_LOGGABLE });
      const changed = await changeFoodEntry(clerkUserId, entry, req.body);
      if (!changed) return reply.code(400).send({ error: "the food has no such serving" });
      return changed;
    },
  );

  // 204 once deleted. A day more than 6 days ago can no longer change
  app.delete(
    "/food-entries/:id",
    { schema: { params: EntryParams, response: { 204: z.null(), 400: ErrorResponse, 404: ErrorResponse } } },
    async (req, reply) => {
      const clerkUserId = userIdOf(req)!;
      const entry = await findFoodEntry(clerkUserId, req.params.id);
      if (!entry) return reply.code(404).send({ error: "no such food entry" });
      if (!(await loggableDate(clerkUserId, entry.date))) return reply.code(400).send({ error: NOT_LOGGABLE });
      await deleteFoodEntry(clerkUserId, entry.id);
      return reply.code(204).send(null);
    },
  );
};

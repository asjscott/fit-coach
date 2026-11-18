import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { LOGGABLE_DAYS, loggableDates } from "@fit/engines";
import { ErrorResponse, FoodEntry, FoodEntryAdd, FoodEntryChange, LocalDate } from "@fit/shared";
import { z } from "zod";
import { requireAuth, userIdOf } from "../auth";
import { badRequest } from "../bad-request";
import { addFoodEntry, changeFoodEntry, deleteFoodEntry, findFoodEntry } from "../food-entries";
import { findUser } from "../users";

// A local date, or "today" in the user's timezone, as GET /days/:date takes
const DayParams = z.object({ date: z.union([z.literal("today"), LocalDate]) });
const EntryParams = z.object({ id: z.string() });

const NO_SUCH_SERVING = "The food has no serving by that name";

// The local date a write is for, "today" being today in the user's timezone. Throws a 400 unless it's today or one of
// the 6 days before it there (spec #158, "Every write")
async function loggableDate(clerkUserId: string, date: string): Promise<string> {
  const dates = loggableDates(new Date(), (await findUser(clerkUserId))?.timeZone ?? "UTC");
  if (date === "today") return dates[0];
  if (!dates.includes(date)) throw badRequest(`A Food Entry must be from the last ${LOGGABLE_DAYS} days`);
  return date;
}

// The signed-in user's Food Entries. Logging needs a connection: the phone keeps no queue of these
export const foodEntryRoutes: FastifyPluginAsyncZod = async (app) => {
  // Every route in this file needs a signed-in user
  app.addHook("preHandler", requireAuth);

  // 201 with the new Food Entry. Every source logs through this: search, Saved Foods, Food Ideas and Tell the coach
  app.post(
    "/days/:date/food-entries",
    { schema: { params: DayParams, body: FoodEntryAdd, response: { 201: FoodEntry } } },
    async (req, reply) => {
      const clerkUserId = userIdOf(req)!;
      const date = await loggableDate(clerkUserId, req.params.date);
      const entry = await addFoodEntry(clerkUserId, date, req.body);
      if (!entry) throw badRequest(NO_SUCH_SERVING);
      return reply.code(201).send(entry);
    },
  );

  // 200 with the changed Food Entry. One more than 6 days old can no longer change (400)
  app.patch(
    "/food-entries/:id",
    { schema: { params: EntryParams, body: FoodEntryChange, response: { 200: FoodEntry, 404: ErrorResponse } } },
    async (req, reply) => {
      const clerkUserId = userIdOf(req)!;
      const entry = await findFoodEntry(clerkUserId, req.params.id);
      if (!entry) return reply.code(404).send({ error: "no such food entry" });
      await loggableDate(clerkUserId, entry.date);
      const changed = await changeFoodEntry(clerkUserId, entry, req.body);
      if (!changed) throw badRequest(NO_SUCH_SERVING);
      return changed;
    },
  );

  // 204 once deleted. One more than 6 days old can no longer be deleted (400)
  app.delete(
    "/food-entries/:id",
    { schema: { params: EntryParams, response: { 204: z.null(), 404: ErrorResponse } } },
    async (req, reply) => {
      const clerkUserId = userIdOf(req)!;
      const entry = await findFoodEntry(clerkUserId, req.params.id);
      if (!entry) return reply.code(404).send({ error: "no such food entry" });
      await loggableDate(clerkUserId, entry.date);
      await deleteFoodEntry(clerkUserId, entry.id);
      return reply.code(204).send(null);
    },
  );
};

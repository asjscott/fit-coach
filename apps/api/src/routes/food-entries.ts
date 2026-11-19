import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { LOGGABLE_DAYS, loggableDates } from "@fit/engines";
import {
  CopiedFoodEntries,
  CopyMeal,
  CopyMealParams,
  ErrorResponse,
  FoodEntry,
  FoodEntryAdd,
  FoodEntryChange,
  LocalDate,
  RecentFoods,
} from "@fit/shared";
import { z } from "zod";
import { requireAuth, userIdOf } from "../auth";
import { badRequest } from "../bad-request";
import {
  addFoodEntry,
  changeFoodEntry,
  copyMealFromDayBefore,
  deleteFoodEntry,
  findFoodEntry,
  recentFoods,
} from "../food-entries";
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

  // Recent: the foods the user has logged, each once, most recently logged first (spec #158 story 62)
  app.get("/foods/recent", { schema: { response: { 200: RecentFoods } } }, async (req) => ({
    foods: await recentFoods(userIdOf(req)!),
  }));

  // 201 with the new Food Entry, or 200 with the one a request with the same id already logged. Every source logs
  // through this: search, Saved Foods, Food Ideas and Tell the coach
  app.post(
    "/days/:date/food-entries",
    { schema: { params: DayParams, body: FoodEntryAdd, response: { 200: FoodEntry, 201: FoodEntry } } },
    async (req, reply) => {
      const clerkUserId = userIdOf(req)!;
      const date = await loggableDate(clerkUserId, req.params.date);
      const added = await addFoodEntry(clerkUserId, date, req.body);
      if (!added) throw badRequest(NO_SUCH_SERVING);
      return reply.code(added.created ? 201 : 200).send(added.entry);
    },
  );

  // Copy from yesterday: 201 with the new Food Entries, after any already in the meal, or 200 with the ones a request
  // with the same id already copied. None when the day before had nothing in it
  app.post(
    "/days/:date/meals/:meal/copy-from-yesterday",
    {
      schema: {
        params: CopyMealParams,
        // No body at all copies with no request id
        body: CopyMeal.nullish(),
        response: { 200: CopiedFoodEntries, 201: CopiedFoodEntries },
      },
    },
    async (req, reply) => {
      const clerkUserId = userIdOf(req)!;
      const date = await loggableDate(clerkUserId, req.params.date);
      const { entries, created } = await copyMealFromDayBefore(clerkUserId, date, req.params.meal, req.body?.requestId);
      return reply.code(created ? 201 : 200).send({ entries });
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

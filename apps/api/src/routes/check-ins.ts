import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { CheckInUpload, DatedCheckIn, LocalDate } from "@fit/shared";
import { z } from "zod";
import { requireAuth, userIdOf } from "../auth";
import { findCheckIn, keepCheckIn } from "../check-ins";

const DateParams = z.object({ date: LocalDate });

// The signed-in user's Check-ins, one per local date. The phone queues them and retries like Pending Workouts. Readiness
// comes from the phone's own copy, so training never waits on these
export const checkInRoutes: FastifyPluginAsyncZod = async (app) => {
  // Every route in this file needs a signed-in user
  app.addHook("preHandler", requireAuth);

  // Idempotent: 200 with the Check-in the date now has. One made later than the stored one replaces it; one made
  // earlier, such as a late retry, leaves the stored one
  app.put(
    "/check-ins/:date",
    { schema: { params: DateParams, body: CheckInUpload, response: { 200: DatedCheckIn } } },
    async (req) => keepCheckIn(userIdOf(req)!, req.params.date, req.body),
  );

  // The user's Check-in for the date, or null when they didn't check in
  app.get(
    "/check-ins/:date",
    { schema: { params: DateParams, response: { 200: DatedCheckIn.nullable() } } },
    async (req) => findCheckIn(userIdOf(req)!, req.params.date),
  );
};

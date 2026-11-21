import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { LocalDate, WaterDay, WaterUpdate } from "@fit/shared";
import { z } from "zod";
import { requireAuth, userIdOf } from "../auth";
import { requireLoggableDate } from "../loggable-date";
import { findUser } from "../users";
import { setWater } from "../water";

const DateParams = z.object({ date: LocalDate });

// The signed-in user's water, one total per local date. GET /days/:date reads it back
export const waterRoutes: FastifyPluginAsyncZod = async (app) => {
  // Every route in this file needs a signed-in user
  app.addHook("preHandler", requireAuth);

  // Sets the date's water to the total sent; the phone sends the current total ± 250 ml when a glass is tapped. The date
  // must be today or one of the 6 days before it in the user's timezone (400)
  app.put(
    "/days/:date/water",
    { schema: { params: DateParams, body: WaterUpdate, response: { 200: WaterDay } } },
    async (req) => {
      const clerkUserId = userIdOf(req)!;
      const { date } = req.params;
      requireLoggableDate(date, (await findUser(clerkUserId))?.timeZone, "Water");
      await setWater(clerkUserId, date, req.body.waterMl);
      return { date, waterMl: req.body.waterMl };
    },
  );
};

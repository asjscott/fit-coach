import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { isLoggableDate, LOGGABLE_DAYS } from "@fit/engines";
import { bodyWeightKg, ErrorResponse, LocalDate, User, WeighInUpload } from "@fit/shared";
import { z } from "zod";
import { requireAuth, userIdOf } from "../auth";
import { badRequest } from "../bad-request";
import { findUser } from "../users";
import { keepWeighIn } from "../weigh-ins";
import { userResponse } from "./users";

const DateParams = z.object({ date: LocalDate });

// The signed-in user's Weigh-ins, one per week. The latest comes back on the user, which is how the phone reads it
export const weighInRoutes: FastifyPluginAsyncZod = async (app) => {
  // Every route in this file needs a signed-in user
  app.addHook("preHandler", requireAuth);

  // Replaces the week's Weigh-in with this one and responds with the whole user. The date must be today or one of the
  // 6 days before it in the user's timezone (400), and the user onboarded (403)
  app.put(
    "/weigh-ins/:date",
    {
      schema: {
        params: DateParams,
        body: WeighInUpload,
        response: { 200: User, 403: ErrorResponse },
      },
    },
    async (req, reply) => {
      const clerkUserId = userIdOf(req)!;
      const { date } = req.params;
      const user = await findUser(clerkUserId);
      if (!user?.onboardedAt) return reply.code(403).send({ error: "finish onboarding first" });
      if (!isLoggableDate(date, new Date(), user.timeZone ?? "UTC")) {
        throw badRequest(`A Weigh-in must be from the last ${LOGGABLE_DAYS} days`);
      }
      // The exact kg of what was entered, as onboarding stores it, so 180 lb reads back as 180 lb
      await keepWeighIn(clerkUserId, date, bodyWeightKg(req.body.weight, req.body.unit));
      return userResponse((await findUser(clerkUserId))!);
    },
  );
};

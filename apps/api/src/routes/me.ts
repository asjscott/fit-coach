import { getAuth } from "@clerk/fastify";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { UserProfile } from "@fit/shared";
import { requireAuth } from "../auth";
import { findOrCreateUser, toMe, users } from "../users";

export const meRoutes: FastifyPluginAsyncZod = async (app) => {
  // Every route in this file needs a signed-in user
  app.addHook("preHandler", requireAuth);

  app.get("/me", async (req) => {
    const user = await findOrCreateUser(getAuth(req).userId!);
    return toMe(user);
  });

  app.patch("/me/profile", { schema: { body: UserProfile.partial() } }, async (req) => {
    const existing = await findOrCreateUser(getAuth(req).userId!);
    // $literal stops string values beginning with "$" being read as field paths
    const user = await users.findOneAndUpdate(
      { _id: existing._id },
      [{ $set: { profile: { $mergeObjects: ["$profile", { $literal: req.body }] } } }],
      { returnDocument: "after" }
    );
    if (!user) throw new Error("User not found");
    return toMe(user);
  });

  app.post("/me/onboarding/complete", async (req, reply) => {
    const user = await findOrCreateUser(getAuth(req).userId!);
    const check = UserProfile.safeParse(user.profile);
    if (!check.success) {
      return reply.code(400).send({
        error: "profile incomplete",
        missing: check.error.issues.map((issue) => issue.path.join(".")),
      });
    }
    const updated = await users.findOneAndUpdate(
      { _id: user._id },
      { $set: { onboardedAt: user.onboardedAt ?? new Date() } },
      { returnDocument: "after" }
    );
    return toMe(updated!);
  });
};
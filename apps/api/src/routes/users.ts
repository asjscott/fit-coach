import type { FastifyBaseLogger } from "fastify";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { EquipmentProfileInput, ErrorResponse, User, UserUpdate } from "@fit/shared";
import { z } from "zod";
import { requireAuth, userIdOf } from "../auth";
import { currentOrRebuiltPlannedWorkout } from "../planned-workouts";
import { createEquipmentProfile, createUser, findUser, toUser, updateEquipmentProfile, updateUser } from "../users";

// A Profile change that shapes the plan takes effect straight away. A failure doesn't fail the change, which is saved:
// the rebuild stays due, and the phone's next ask for a plan runs it
async function rebuildPlanIfDue(clerkUserId: string, log: FastifyBaseLogger) {
  await currentOrRebuiltPlannedWorkout(clerkUserId).catch((err) => log.error(err, "planned workout rebuild failed"));
}

// /user is the signed-in user's own record; /users is the collection it is created in
export const userRoutes: FastifyPluginAsyncZod = async (app) => {
  // Every route in this file needs a signed-in user
  app.addHook("preHandler", requireAuth);

  // 404 until POST /users has created the record
  app.get("/user", { schema: { response: { 200: User, 404: ErrorResponse } } }, async (req, reply) => {
    const user = await findUser(userIdOf(req)!);
    if (!user) return reply.code(404).send({ error: "user not found" });
    return toUser(user);
  });

  // Idempotent: 201 when created, 200 with the existing record otherwise
  app.post("/users", { schema: { response: { 200: User, 201: User } } }, async (req, reply) => {
    const { user, created } = await createUser(userIdOf(req)!);
    return reply
      .code(created ? 201 : 200)
      .header("Location", "/user")
      .send(toUser(user));
  });

  // Sets onboardedAt as a side effect once the required profile fields are complete
  // and the user has an equipment profile. A change that shapes the plan rebuilds it
  app.patch(
    "/user",
    { schema: { body: UserUpdate, response: { 200: User, 404: ErrorResponse } } },
    async (req, reply) => {
      const clerkUserId = userIdOf(req)!;
      const user = await updateUser(clerkUserId, req.body);
      if (!user) return reply.code(404).send({ error: "user not found" });
      await rebuildPlanIfDue(clerkUserId, req.log);
      return toUser(user);
    },
  );

  // The server assigns the new profile's id; responds with the whole user
  app.post(
    "/user/equipment-profiles",
    { schema: { body: EquipmentProfileInput, response: { 201: User, 404: ErrorResponse } } },
    async (req, reply) => {
      const user = await createEquipmentProfile(userIdOf(req)!, req.body);
      if (!user) return reply.code(404).send({ error: "user not found" });
      await rebuildPlanIfDue(userIdOf(req)!, req.log);
      return reply.code(201).send(toUser(user));
    },
  );

  // Replaces every field but the id; responds with the whole user
  app.put(
    "/user/equipment-profiles/:id",
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: EquipmentProfileInput,
        response: { 200: User, 404: ErrorResponse },
      },
    },
    async (req, reply) => {
      const user = await updateEquipmentProfile(userIdOf(req)!, req.params.id, req.body);
      if (!user) return reply.code(404).send({ error: "equipment profile not found" });
      await rebuildPlanIfDue(userIdOf(req)!, req.log);
      return toUser(user);
    },
  );
};

import { getAuth } from "@clerk/fastify";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { ErrorResponse, User, UserUpdate } from "@fit/shared";
import { requireAuth } from "../auth";
import { createUser, findUser, toUser, updateUserProfile } from "../users";

// /user is the signed-in user's own record; /users is the collection it is created in
export const userRoutes: FastifyPluginAsyncZod = async (app) => {
  // Every route in this file needs a signed-in user
  app.addHook("preHandler", requireAuth);

  // 404 until POST /users has created the record
  app.get("/user", { schema: { response: { 200: User, 404: ErrorResponse } } }, async (req, reply) => {
    const user = await findUser(getAuth(req).userId!);
    if (!user) return reply.code(404).send({ error: "user not found" });
    return toUser(user);
  });

  // Idempotent: 201 when created, 200 with the existing record otherwise
  app.post("/users", { schema: { response: { 200: User, 201: User } } }, async (req, reply) => {
    const { user, created } = await createUser(getAuth(req).userId!);
    return reply
      .code(created ? 201 : 200)
      .header("Location", "/user")
      .send(toUser(user));
  });

  // Sets onboardedAt as a side effect once the required profile fields are complete
  app.patch(
    "/user",
    { schema: { body: UserUpdate, response: { 200: User, 404: ErrorResponse } } },
    async (req, reply) => {
      const user = await updateUserProfile(getAuth(req).userId!, req.body.profile);
      if (!user) return reply.code(404).send({ error: "user not found" });
      return toUser(user);
    },
  );
};

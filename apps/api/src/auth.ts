import { getAuth } from "@clerk/fastify";
import type { FastifyReply, FastifyRequest } from "fastify";

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const { userId } = getAuth(req);
  if (!userId) {
    return reply.code(401).send({ error: "unauthorized" });
  }
}
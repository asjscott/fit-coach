import { clerkPlugin, getAuth } from "@clerk/fastify";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

// Local development only (`pnpm dev:local`): Clerk is skipped and every request is this user, or the one named
// in an X-Dev-User header. Refused unless the database is local, so it can never open up a real deployment
const devUserId = process.env.DEV_AUTH_USER_ID;
if (devUserId && !/^mongodb:\/\/(127\.0\.0\.1|localhost)[:/]/.test(process.env.MONGODB_URI ?? "")) {
  throw new Error("DEV_AUTH_USER_ID is only allowed with a local MONGODB_URI");
}

export async function registerAuth(app: FastifyInstance) {
  if (devUserId) app.log.warn(`Clerk disabled: requests are user "${devUserId}" unless X-Dev-User says otherwise`);
  else await app.register(clerkPlugin);
}

// The signed-in user's Clerk id; null when signed out
export function userIdOf(req: FastifyRequest): string | null {
  if (devUserId) {
    const header = req.headers["x-dev-user"];
    return typeof header === "string" && header ? header : devUserId;
  }
  return getAuth(req).userId;
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  if (!userIdOf(req)) {
    return reply.code(401).send({ error: "unauthorized" });
  }
}

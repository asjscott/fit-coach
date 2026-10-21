import Fastify from "fastify";
import { clerkPlugin, getAuth } from "@clerk/fastify";
import { HealthResponse } from "@fit/shared";
import { pingDb } from "./db";
import { requireAuth } from "./auth";
import { ensureUserIndexes, findOrCreateUser, toMe } from "./users";

const app = Fastify({ logger: true });

await app.register(clerkPlugin);

await ensureUserIndexes().catch((err) =>
  app.log.error(err, "Failed to create user indexes"),
);

app.get("/health", async () => {
  return HealthResponse.parse({
    status: "ok",
    db: await pingDb(),
  } satisfies HealthResponse);
});

app.get("/me", { preHandler: requireAuth }, async (req) => {
  const { userId } = getAuth(req);
  const user = await findOrCreateUser(userId!);
  return toMe(user);
});

const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: "0.0.0.0" });
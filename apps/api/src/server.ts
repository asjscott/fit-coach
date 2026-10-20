import Fastify from "fastify";
import { clerkPlugin, getAuth } from "@clerk/fastify";
import { HealthResponse } from "@fit/shared";
import { pingDb } from "./db";
import { requireAuth } from "./auth";

const app = Fastify({ logger: true });

await app.register(clerkPlugin);

app.get("/health", async () => {
  return HealthResponse.parse({
    status: "ok",
    db: await pingDb(),
  } satisfies HealthResponse);
});

app.get("/me", { preHandler: requireAuth }, async (req) => ({
  clerkUserId: getAuth(req).userId,
}));

const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: "0.0.0.0" });
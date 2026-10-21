import Fastify from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { meRoutes } from "./routes/me";
import { clerkPlugin } from "@clerk/fastify";
import { HealthResponse } from "@fit/shared";
import { pingDb } from "./db";
import { ensureUserIndexes } from "./users";

const app = Fastify({ logger: true });

app.setValidatorCompiler(validatorCompiler);   // checks incoming requests
app.setSerializerCompiler(serializerCompiler); // checks outgoing responses on routes that declare schema.response

await app.register(clerkPlugin);

await ensureUserIndexes().catch((err) =>
  app.log.error(err, "Failed to create user indexes"),
);

await app.register(meRoutes);

app.get("/health", async () => {
  return HealthResponse.parse({
    status: "ok",
    db: await pingDb(),
  } satisfies HealthResponse);
});

const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: "0.0.0.0" });
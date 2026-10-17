import Fastify from "fastify";
import { HealthResponse } from "@fit/shared";
import { pingDb } from "./db";

const app = Fastify({ logger: true });

app.get("/health", async () => {
  return HealthResponse.parse({ status: "ok", db: await pingDb() });
});

const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: "0.0.0.0" });
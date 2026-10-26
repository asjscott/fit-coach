import cors from "@fastify/cors";
import Fastify from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { ensureAssessmentIndexes } from "./assessments";
import { assessmentRoutes } from "./routes/assessments";
import { exerciseRoutes } from "./routes/exercises";
import { userRoutes } from "./routes/users";
import { workoutRoutes } from "./routes/workouts";
import { HealthResponse } from "@fit/shared";
import { registerAuth } from "./auth";
import { pingDb } from "./db";
import { ensureUserIndexes, migrateUsers } from "./users";
import { ensureWorkoutIndexes } from "./workouts";

const app = Fastify({ logger: true });

app.setValidatorCompiler(validatorCompiler); // checks incoming requests
app.setSerializerCompiler(serializerCompiler); // checks outgoing responses on routes that declare schema.response

// Browsers (the Expo web build) need CORS; native apps send no Origin and are unaffected.
// Registered before auth so preflight requests are answered without a token
await app.register(cors, {
  origin: process.env.CORS_ORIGINS?.split(",") ?? ["http://localhost:8081"],
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
  allowedHeaders: ["Authorization", "Content-Type"],
  exposedHeaders: ["Location"],
});

await registerAuth(app);

await ensureUserIndexes().catch((err) => app.log.error(err, "Failed to create user indexes"));

await ensureWorkoutIndexes().catch((err) => app.log.error(err, "Failed to create workout indexes"));

await ensureAssessmentIndexes().catch((err) => app.log.error(err, "Failed to create assessment indexes"));

await migrateUsers().catch((err) => app.log.error(err, "Failed to migrate users"));

await app.register(userRoutes);
await app.register(exerciseRoutes);
await app.register(workoutRoutes);
await app.register(assessmentRoutes);

app.get("/health", async () => {
  return HealthResponse.parse({
    status: "ok",
    db: await pingDb(),
  } satisfies HealthResponse);
});

const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: "0.0.0.0" });

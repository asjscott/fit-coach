import cors from "@fastify/cors";
import Fastify from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { ensureAssessmentIndexes, migrateWorkingLevels } from "./assessments";
import { assessmentRoutes } from "./routes/assessments";
import { checkInRoutes } from "./routes/check-ins";
import { exerciseRoutes } from "./routes/exercises";
import { plannedWorkoutRoutes } from "./routes/planned-workouts";
import { userRoutes } from "./routes/users";
import { workoutRoutes } from "./routes/workouts";
import { HealthResponse } from "@fit/shared";
import { registerAuth } from "./auth";
import { ensureCheckInIndexes } from "./check-ins";
import { pingDb } from "./db";
import { registerTestErrorRoute, reportRouteErrorsWithUser } from "./error-reporting";
import { ensurePlannedWorkoutIndexes } from "./planned-workouts";
import { ensureUserIndexes, migrateUsers } from "./users";
import { ensureWorkoutIndexes } from "./workouts";

// The API with every route registered and its indexes made, not yet listening. Reads MONGODB_URI (db.ts) and
// DEV_AUTH_USER_ID (auth.ts) when first imported. server.ts listens on it; the route tests inject into it
export async function buildApp({ logger }: { logger: boolean }) {
  const app = Fastify({ logger });

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

  reportRouteErrorsWithUser(app);

  await ensureUserIndexes().catch((err) => app.log.error(err, "Failed to create user indexes"));

  await ensureWorkoutIndexes().catch((err) => app.log.error(err, "Failed to create workout indexes"));

  await ensureAssessmentIndexes().catch((err) => app.log.error(err, "Failed to create assessment indexes"));

  await ensurePlannedWorkoutIndexes().catch((err) => app.log.error(err, "Failed to create planned workout indexes"));

  await ensureCheckInIndexes().catch((err) => app.log.error(err, "Failed to create check-in indexes"));

  await migrateUsers().catch((err) => app.log.error(err, "Failed to migrate users"));

  await migrateWorkingLevels().catch((err) => app.log.error(err, "Failed to migrate working levels"));

  await app.register(userRoutes);
  await app.register(exerciseRoutes);
  await app.register(workoutRoutes);
  await app.register(assessmentRoutes);
  await app.register(plannedWorkoutRoutes);
  await app.register(checkInRoutes);
  registerTestErrorRoute(app);

  app.get("/health", async () => {
    return HealthResponse.parse({
      status: "ok",
      db: await pingDb(),
    } satisfies HealthResponse);
  });

  return app;
}

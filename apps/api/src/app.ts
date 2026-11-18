import cors from "@fastify/cors";
import Fastify from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { ensureAssessmentIndexes, migrateWorkingLevels } from "./assessments";
import { assessmentRoutes } from "./routes/assessments";
import { checkInRoutes } from "./routes/check-ins";
import { dayRoutes } from "./routes/days";
import { exerciseRoutes } from "./routes/exercises";
import { foodRoutes } from "./routes/foods";
import { plannedWorkoutRoutes } from "./routes/planned-workouts";
import { userRoutes } from "./routes/users";
import { weighInRoutes } from "./routes/weigh-ins";
import { workoutRoutes } from "./routes/workouts";
import { HealthResponse } from "@fit/shared";
import { registerAuth } from "./auth";
import { ensureCheckInIndexes } from "./check-ins";
import { realFoodSources, type FoodSources } from "./food-sources";
import { pingDb } from "./db";
import { registerTestErrorRoute, reportRouteErrorsWithUser } from "./error-reporting";
import { ensurePlannedWorkoutIndexes } from "./planned-workouts";
import { ensureUserIndexes, migrateUsers } from "./users";
import { ensureWeighInIndexes, migrateWeighIns } from "./weigh-ins";
import { ensureWorkoutIndexes } from "./workouts";

// The API with every route registered and its indexes made, not yet listening. Reads MONGODB_URI (db.ts) and
// DEV_AUTH_USER_ID (auth.ts) when first imported. server.ts listens on it; the route tests inject into it, passing fake
// food sources. The real ones read USDA_API_KEY, which only the API's environment holds
export async function buildApp({ logger, foodSources }: { logger: boolean; foodSources?: FoodSources }) {
  const app = Fastify({ logger });
  if (!foodSources && !process.env.USDA_API_KEY) app.log.warn("USDA_API_KEY isn't set: food search finds nothing");
  const sources = foodSources ?? realFoodSources({ usdaApiKey: process.env.USDA_API_KEY });

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

  await ensureWeighInIndexes().catch((err) => app.log.error(err, "Failed to create weigh-in indexes"));

  await migrateUsers().catch((err) => app.log.error(err, "Failed to migrate users"));

  await migrateWorkingLevels().catch((err) => app.log.error(err, "Failed to migrate working levels"));

  await migrateWeighIns().catch((err) => app.log.error(err, "Failed to migrate weigh-ins"));

  await app.register(userRoutes);
  await app.register(exerciseRoutes);
  await app.register(workoutRoutes);
  await app.register(assessmentRoutes);
  await app.register(plannedWorkoutRoutes);
  await app.register(checkInRoutes);
  await app.register(dayRoutes);
  await app.register(weighInRoutes);
  await app.register(foodRoutes, { foodSources: sources });
  registerTestErrorRoute(app);

  app.get("/health", async () => {
    return HealthResponse.parse({
      status: "ok",
      db: await pingDb(),
    } satisfies HealthResponse);
  });

  return app;
}

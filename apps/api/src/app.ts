import cors from "@fastify/cors";
import Fastify from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { ensureAssessmentIndexes, migrateAssessments, migrateWorkingLevels } from "./assessments";
import { assessmentRoutes } from "./routes/assessments";
import { checkInRoutes } from "./routes/check-ins";
import { dayRoutes } from "./routes/days";
import { exerciseRoutes } from "./routes/exercises";
import { foodEntryRoutes } from "./routes/food-entries";
import { foodRoutes } from "./routes/foods";
import { nutritionHistoryRoutes } from "./routes/nutrition-history";
import { plannedWorkoutRoutes } from "./routes/planned-workouts";
import { savedFoodRoutes } from "./routes/saved-foods";
import { ensureSavedFoodIndexes } from "./saved-foods";
import { tellTheCoachRoutes } from "./routes/tell-the-coach";
import { userRoutes } from "./routes/users";
import { weighInRoutes } from "./routes/weigh-ins";
import { workoutRoutes } from "./routes/workouts";
import { waterRoutes } from "./routes/water";
import { HealthResponse } from "@fit/shared";
import { registerAuth } from "./auth";
import { ensureCheckInIndexes } from "./check-ins";
import { ensureDailyTargetsIndexes } from "./daily-targets";
import { ensureFoodEntryIndexes } from "./food-entries";
import { realFoodSources, type FoodSources } from "./food-sources";
import { pingDb } from "./db";
import { registerTestErrorRoute, reportRouteErrorsWithUser } from "./error-reporting";
import { ensurePlannedWorkoutIndexes } from "./planned-workouts";
import { ensureUserIndexes, migrateUsers } from "./users";
import { ensureWeighInIndexes, migrateWeighIns } from "./weigh-ins";
import { ensureWorkoutIndexes } from "./workouts";
import { ensureWaterIndexes } from "./water";

// The API with every route registered and its indexes made, not yet listening. Reads MONGODB_URI (db.ts) and
// DEV_AUTH_USER_ID (auth.ts) when first imported. server.ts listens on it; the route tests inject into it, passing fake
// food sources. The real ones read USDA_API_KEY and GEMINI_API_KEY, which only the API's environment holds. A failed
// index or migration is logged so the server still starts; `failOnSetupError` throws it instead, as tests want
export async function buildApp({
  logger,
  foodSources,
  failOnSetupError = false,
}: {
  logger: boolean;
  foodSources?: FoodSources;
  failOnSetupError?: boolean;
}) {
  const app = Fastify({ logger });
  const setUp = async (what: string, step: () => Promise<unknown>) => {
    try {
      await step();
    } catch (err) {
      if (failOnSetupError) throw err;
      app.log.error(err, `Failed to ${what}`);
    }
  };
  if (!foodSources && !process.env.USDA_API_KEY) app.log.warn("USDA_API_KEY isn't set: food search finds nothing");
  if (!foodSources && !process.env.GEMINI_API_KEY) app.log.warn("GEMINI_API_KEY isn't set: Tell the coach is hidden");
  const sources =
    foodSources ??
    realFoodSources({
      usdaApiKey: process.env.USDA_API_KEY,
      geminiApiKey: process.env.GEMINI_API_KEY,
      geminiModel: process.env.GEMINI_MODEL,
    });

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

  await setUp("create user indexes", ensureUserIndexes);
  await setUp("create workout indexes", ensureWorkoutIndexes);
  // Before the indexes, which need every Assessment migrated
  await setUp("migrate assessments", migrateAssessments);
  await setUp("create assessment indexes", ensureAssessmentIndexes);
  await setUp("create planned workout indexes", ensurePlannedWorkoutIndexes);
  await setUp("create check-in indexes", ensureCheckInIndexes);
  await setUp("create weigh-in indexes", ensureWeighInIndexes);
  await setUp("create food entry indexes", ensureFoodEntryIndexes);
  await setUp("create saved food indexes", ensureSavedFoodIndexes);
  await setUp("create daily targets indexes", ensureDailyTargetsIndexes);
  await setUp("create water indexes", ensureWaterIndexes);
  await setUp("migrate users", migrateUsers);
  await setUp("migrate working levels", migrateWorkingLevels);
  await setUp("migrate weigh-ins", migrateWeighIns);
  await app.register(userRoutes);
  await app.register(exerciseRoutes);
  await app.register(workoutRoutes);
  await app.register(assessmentRoutes);
  await app.register(plannedWorkoutRoutes);
  await app.register(checkInRoutes);
  await app.register(dayRoutes);
  await app.register(nutritionHistoryRoutes);
  await app.register(weighInRoutes);
  await app.register(foodRoutes, { foodSources: sources });
  await app.register(foodEntryRoutes);
  await app.register(savedFoodRoutes);
  await app.register(waterRoutes);
  await app.register(tellTheCoachRoutes, { foodSources: sources });
  registerTestErrorRoute(app);

  app.get("/health", async () => {
    return HealthResponse.parse({
      status: "ok",
      db: await pingDb(),
    } satisfies HealthResponse);
  });

  return app;
}

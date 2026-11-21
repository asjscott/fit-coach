// Vitest's globalSetup (vitest.config.ts): one in-memory MongoDB for the whole run, a one-member replica set since
// pairing Assessment Workouts runs in a transaction. Each route test file gets its own database on it
// (route-test-api.ts), so files never see each other's data. Starting one per file, all at once, was slow and flaky
import { MongoMemoryReplSet } from "mongodb-memory-server";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    // The replica set's connection string, with no database named
    mongoUri: string;
  }
}

export default async function startMongo(project: TestProject) {
  const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  project.provide("mongoUri", mongo.getUri());
  return async () => {
    await mongo.stop();
  };
}

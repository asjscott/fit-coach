// The harness for route tests (docs/agents/workouts.md, "Route tests"): the whole API against an in-memory MongoDB, with
// Clerk switched off as in `dev:local`, so tests sign in without Clerk's network. One database per test file; each
// signIn is a new account, so tests in a file don't share data. Tests read results through routes, never the database
import { randomUUID } from "node:crypto";
import type { EquipmentProfileInput, UserProfile } from "@fit/shared";
import type { FastifyInstance } from "fastify";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { afterAll, beforeAll } from "vitest";

// A user who has finished onboarding, which POST /workouts needs: 80 kg, male, building muscle 3 days a week
export const ONBOARDED_PROFILE: UserProfile = {
  gender: "male",
  birthYear: 1990,
  heightCm: 180,
  weightKg: 80,
  goal: "build_muscle",
  daysPerWeek: 3,
  workoutLength: "standard",
  injuries: [],
};

// A home Equipment Profile of fixed dumbbells, primary, so the Coach plans from it
export const DUMBBELLS_AT_HOME: EquipmentProfileInput = {
  name: "Home",
  location: "home",
  isPrimary: true,
  tags: ["dumbbells"],
  loads: { dumbbells: { kind: "fixed", weightsKg: [8, 10, 12, 14, 16, 18, 20, 22, 24] } },
};

export type RouteResponse = { statusCode: number; body: unknown };

// A signed-in test user. Each call is one request to the API as this user; the body is the parsed JSON, or null
export type TestUser = {
  id: string;
  get(url: string): Promise<RouteResponse>;
  post(url: string, payload?: object): Promise<RouteResponse>;
  patch(url: string, payload: object): Promise<RouteResponse>;
  put(url: string, payload: object): Promise<RouteResponse>;
  delete(url: string): Promise<RouteResponse>;
};

export type RouteTestApi = {
  // A new account, onboarded with this profile and Equipment Profile unless onboarded is false
  signIn(options?: {
    onboarded?: boolean;
    profile?: UserProfile;
    equipmentProfile?: EquipmentProfileInput;
  }): Promise<TestUser>;
};

// Call once at the top of a test file: starts the API before its tests and stops it after
export function useRouteTestApi(): RouteTestApi {
  let mongo: MongoMemoryReplSet;
  let app: FastifyInstance;
  let closeDb: () => Promise<void>;

  beforeAll(async () => {
    // A one-member replica set, since pairing Assessment Workouts runs in a transaction
    mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    process.env.MONGODB_URI = mongo.getUri("fit-coach");
    // Clerk off: every request is the user its X-Dev-User header names (src/auth.ts)
    process.env.DEV_AUTH_USER_ID = "user_route_test";
    // Imported only now, since the database client and auth read the environment when they load
    const { buildApp } = await import("../app");
    const { client } = await import("../db");
    app = await buildApp({ logger: false });
    closeDb = () => client.close();
  });

  afterAll(async () => {
    await app?.close();
    await closeDb?.();
    await mongo?.stop();
  });

  const userFor = (id: string): TestUser => {
    const request = async (method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE", url: string, payload?: object) => {
      const response = await app.inject({ method, url, payload, headers: { "x-dev-user": id } });
      return { statusCode: response.statusCode, body: response.body ? response.json() : null };
    };
    return {
      id,
      get: (url) => request("GET", url),
      post: (url, payload) => request("POST", url, payload),
      patch: (url, payload) => request("PATCH", url, payload),
      put: (url, payload) => request("PUT", url, payload),
      delete: (url) => request("DELETE", url),
    };
  };

  return {
    async signIn({ onboarded = true, profile = ONBOARDED_PROFILE, equipmentProfile = DUMBBELLS_AT_HOME } = {}) {
      const user = userFor(`user_${randomUUID()}`);
      await expectStatus(user.post("/users"), 201);
      if (onboarded) {
        await expectStatus(user.patch("/user", { profile }), 200);
        await expectStatus(user.post("/user/equipment-profiles", equipmentProfile), 201);
      }
      return user;
    },
  };
}

// Fails setup loudly rather than letting a test run as a user who isn't who it thinks
async function expectStatus(response: Promise<RouteResponse>, statusCode: number) {
  const { statusCode: actual, body } = await response;
  if (actual !== statusCode) throw new Error(`Expected ${statusCode}, got ${actual}: ${JSON.stringify(body)}`);
}

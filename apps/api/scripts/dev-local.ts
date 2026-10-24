// Runs the API against a throwaway in-memory MongoDB with Clerk switched off, so it can be exercised with curl
// without touching the real database. Data is gone when the process stops. See src/auth.ts for X-Dev-User
import { MongoMemoryServer } from "mongodb-memory-server";

const mongo = await MongoMemoryServer.create();
process.env.MONGODB_URI = mongo.getUri("fit-coach");
process.env.DEV_AUTH_USER_ID ??= "user_dev";

process.on("SIGINT", () => mongo.stop().finally(() => process.exit(0)));

// Imported only now, since the database client reads MONGODB_URI when it loads
await import("../src/server");

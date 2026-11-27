// Runs the API against a throwaway in-memory MongoDB with Clerk switched off, so it can be exercised with curl
// without touching the real database. Data is gone when the process stops. See src/auth.ts for X-Dev-User
import { MongoMemoryReplSet } from "mongodb-memory-server";

// A one-member replica set, since pairing Assessment Workouts runs in a transaction
const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
process.env.MONGODB_URI = mongo.getUri("fit-coach");
process.env.DEV_AUTH_USER_ID ??= "user_dev";

process.on("SIGINT", () => mongo.stop().finally(() => process.exit(0)));

// DEV_NOW (an ISO time) starts the server's clock there, and it runs on from it, to try what depends on the day or
// the hour, such as the Week Summary from 6 pm on Sunday. Only the API's Date moves, after the database has started
const devNow = process.env.DEV_NOW;
if (devNow) {
  const RealDate = Date;
  const offset = RealDate.parse(devNow) - RealDate.now();
  if (Number.isNaN(offset)) throw new Error(`DEV_NOW isn't a time: ${devNow}`);
  class ShiftedDate extends RealDate {
    constructor(...args: ConstructorParameters<DateConstructor> | []) {
      if (args.length) super(...(args as ConstructorParameters<DateConstructor>));
      else super(RealDate.now() + offset);
    }
    static now = () => RealDate.now() + offset;
  }
  globalThis.Date = ShiftedDate as DateConstructor;
  console.log(`dev:local: the clock starts at ${new Date().toISOString()}`);
}

// Imported only now, since the database client reads MONGODB_URI when it loads
await import("../src/server");

// Vitest's globalSetup (vitest.config.ts): fetches the MongoDB binary once, before any test file starts. Without it,
// every file's in-memory MongoDB (route-test-api.ts) downloads the binary at the same time on a fresh machine, and
// they race on its lockfile: "Cannot unlock file .../mongodb-binaries/<version>.lock", then a hook timeout
import { MongoBinary } from "mongodb-memory-server";

export default async function downloadMongoBinary() {
  await MongoBinary.getPath();
}

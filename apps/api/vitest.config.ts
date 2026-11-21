import { defineConfig } from "vitest/config";

// Route tests share one in-memory MongoDB, started once before any file (src/test/mongodb.ts), each file in its own
// database. The hook timeout covers a slow runner downloading the MongoDB binary on its first run
export default defineConfig({
  test: { globalSetup: ["./src/test/mongodb.ts"], hookTimeout: 120_000, testTimeout: 30_000 },
});

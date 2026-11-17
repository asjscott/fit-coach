import { defineConfig } from "vitest/config";

// Route tests start an in-memory MongoDB per file, all at once. Its binary is downloaded first, once, before any file
// starts (src/test/download-mongodb.ts); the generous hook timeout covers a slow runner starting them together
export default defineConfig({
  test: { globalSetup: ["./src/test/download-mongodb.ts"], hookTimeout: 120_000, testTimeout: 30_000 },
});

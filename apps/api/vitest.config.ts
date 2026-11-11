import { defineConfig } from "vitest/config";

// Route tests start an in-memory MongoDB per file, which downloads its binary on the first run
export default defineConfig({ test: { hookTimeout: 120_000, testTimeout: 30_000 } });

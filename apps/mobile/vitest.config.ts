import { defineConfig } from "vitest/config";

// Unit tests only: e2e/ holds the Playwright specs that test:web runs
export default defineConfig({ test: { include: ["src/**/*.test.ts"], setupFiles: ["./vitest.setup.ts"] } });

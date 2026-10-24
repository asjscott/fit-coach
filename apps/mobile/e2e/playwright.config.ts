import { defineConfig, devices } from "@playwright/test";

const PORT = 8090;

// Runs against a static web export with the storage check page built in (src/app/storage-check.tsx)
export default defineConfig({
  testDir: ".",
  outputDir: "./.results",
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [
    // Safari's engine: expo-sqlite's web build failed here, which is why web uses localStorage
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `expo export --platform web && expo serve --port ${PORT}`,
    cwd: "..",
    env: { EXPO_PUBLIC_STORAGE_CHECK: "1" },
    url: `http://localhost:${PORT}/storage-check`,
    timeout: 300_000,
    reuseExistingServer: false,
  },
});

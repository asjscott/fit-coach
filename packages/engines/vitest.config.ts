import { defineConfig } from "vitest/config";

// Weeks run in the phone's local time. A zone behind UTC makes late Sunday night already Monday in UTC,
// so a week computed in UTC fails the tests
export default defineConfig({ test: { env: { TZ: "America/Los_Angeles" } } });

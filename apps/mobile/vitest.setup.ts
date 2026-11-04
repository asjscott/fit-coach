import { vi } from "vitest";

// The real one loads React Native, which Node can't, and anything using format.ts reaches it
vi.mock("expo-localization", () => ({ getCalendars: () => [{ uses24hourClock: false }] }));

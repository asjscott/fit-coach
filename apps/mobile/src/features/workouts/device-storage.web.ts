import type { DeviceStorage } from "@fit/engines";

// In the browser, the Logbook keeps its data in localStorage: it works in every browser and
// every tab, where expo-sqlite's web build allows one tab and fails in Safari (ADR 0001).
// Read lazily, since pages are also rendered in Node, where there is no localStorage
export const deviceStorage: DeviceStorage = {
  getItem: async (key) => localStorage.getItem(key),
  setItem: async (key, value) => localStorage.setItem(key, value),
  removeItem: async (key) => localStorage.removeItem(key),
};

import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { Text } from "react-native";
import { deviceStorage } from "@/features/workouts/device-storage";

// Target of the browser check in e2e/ (`pnpm test:web`): writes and reads back through the Logbook's storage.
// Only built in when EXPO_PUBLIC_STORAGE_CHECK=1, so it needs no sign-in and never ships
const ENABLED = process.env.EXPO_PUBLIC_STORAGE_CHECK === "1";
const KEY = "storage-check";

export default function StorageCheck() {
  const [result, setResult] = useState("pending");

  useEffect(() => {
    if (!ENABLED) return;
    const value = `written-${Date.now()}-${Math.random()}`;
    (async () => {
      const previous = await deviceStorage.getItem(KEY);
      await deviceStorage.setItem(KEY, value);
      const read = await deviceStorage.getItem(KEY);
      setResult(read === value ? `STORAGE_OK previous=${previous} written=${value}` : `STORAGE_MISMATCH read=${read}`);
    })().catch((err) => setResult(`STORAGE_ERROR ${err instanceof Error ? err.message : String(err)}`));
  }, []);

  if (!ENABLED) return <Redirect href="/" />;
  return <Text testID="storage-check">{result}</Text>;
}

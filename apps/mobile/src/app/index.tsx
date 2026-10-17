import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { HealthResponse } from "@fit/shared";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function Home() {
  const [status, setStatus] = useState("Checking API…");

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((res) => res.json())
      .then((json) => {
        const health = HealthResponse.parse(json);
        setStatus(`API ${health.status} · DB ${health.db}`);
      })
      .catch((err: Error) => setStatus(`Error: ${err.message}`));
  }, []);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 8 }}>
      <Text>Hello, Alec</Text>
      <Text>{status}</Text>
    </View>
  );
}
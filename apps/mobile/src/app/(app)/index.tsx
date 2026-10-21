import { useEffect, useState } from "react";
import { Button, Text, View } from "react-native";
import { HealthResponse, Me } from "@fit/shared";
import { useAuth } from "@clerk/expo";
import { useApi } from "../../../api/api";

export default function Home() {
  const { signOut } = useAuth();
  const api = useApi();
  const [status, setStatus] = useState("Checking API…");
  const [me, setMe] = useState("Loading user…");

  useEffect(() => {
    api("/health")
      .then((json) => {
        const health = HealthResponse.parse(json);
        setStatus(`API ${health.status} · DB ${health.db}`);
      })
      .catch((err: Error) => setStatus(`Error: ${err.message}`));

    api("/me")
      .then((json) => {
        const user = Me.parse(json);
        const display = !user.onboardedAt ? "Onboarding not complete" : user.id;
        setMe(display);
      })
      .catch((err: Error) => setMe(`Error: ${err.message}`));
  }, [api]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 8 }}>
      <Text>{me}</Text>
      <Text>{status}</Text>
      <Button title="Sign Out" onPress={() => signOut()} />
    </View>
  );
}

import { useHostedAuth } from "@clerk/expo/hosted-auth";
import { useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";

export default function SignInScreen() {
  const { startHostedAuth } = useHostedAuth();
  const [error, setError] = useState<string | null>(null);

  const start = async (mode: "sign-in" | "sign-up") => {
    try {
      setError(null);
      await startHostedAuth({ mode });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fit Coach</Text>
      <Button title="Sign in" onPress={() => start("sign-in")} />
      <Button title="Create account" onPress={() => start("sign-up")} />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 12, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "600", marginBottom: 24 },
  error: { color: "crimson" },
});